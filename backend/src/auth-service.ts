import express from "express"
import helmet from "helmet"
import cors from "cors"
import cookieParser from "cookie-parser"
import rateLimit from "express-rate-limit"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { z } from "zod"
import { config } from "./shared/config.js"
import { readJsonFile, writeJsonFile } from "./shared/file-store.js"
import {
  createRefreshToken,
  hashRefreshToken,
  normalizeEmail,
  publicUserFromRecord,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "./shared/security.js"
import type { PublicUser, SessionRecord, SessionsDatabase, UserRecord } from "./shared/types.js"

const authSessionsFilePath = resolve(process.cwd(), config.DATA_DIR, "sessions.json")

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
})

const app = express()
app.set("trust proxy", 1)
app.disable("x-powered-by")

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (origin === config.FRONTEND_ORIGIN) {
      callback(null, true)
      return
    }

    callback(null, false)
  },
  credentials: true,
}

app.use(helmet())
app.use(cors(corsOptions))
app.use(express.json({ limit: "16kb" }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 60_000, limit: 240 }))

const loginRateLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: config.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
})

function normalizeSessionDatabase(database: SessionsDatabase): SessionsDatabase {
  const now = Date.now()
  return {
    sessions: database.sessions.filter((session) => session.revokedAt === null && new Date(session.expiresAt).getTime() > now),
  }
}

async function readSessionsDatabase(): Promise<SessionsDatabase> {
  const database = await readJsonFile<SessionsDatabase>(authSessionsFilePath, { sessions: [] })
  return normalizeSessionDatabase(database)
}

async function saveSessionsDatabase(database: SessionsDatabase): Promise<void> {
  await writeJsonFile(authSessionsFilePath, database)
}

function authCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  }
}

async function fetchUserByEmail(email: string): Promise<UserRecord | null> {
  const response = await fetch(`${config.USER_SERVICE_URL}/internal/users/by-email?email=${encodeURIComponent(email)}`, {
    headers: {
      "x-internal-service-token": config.INTERNAL_SERVICE_TOKEN,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`User service returned ${response.status}`)
  }

  return (await response.json()) as UserRecord
}

async function fetchUserById(id: string): Promise<UserRecord | null> {
  const response = await fetch(`${config.USER_SERVICE_URL}/internal/users/${id}`, {
    headers: {
      "x-internal-service-token": config.INTERNAL_SERVICE_TOKEN,
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`User service returned ${response.status}`)
  }

  return (await response.json()) as UserRecord
}

async function createSession(user: UserRecord, request: express.Request) {
  const refreshToken = createRefreshToken()
  const sessionId = randomUUID()
  const sessionExpiry = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const now = new Date().toISOString()

  const database = await readSessionsDatabase()
  const session: SessionRecord = {
    id: sessionId,
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: sessionExpiry.toISOString(),
    createdAt: now,
    lastUsedAt: now,
    revokedAt: null,
    ipAddress: request.ip ?? null,
    userAgent: request.get("user-agent") ?? null,
  }

  database.sessions.push(session)
  await saveSessionsDatabase(database)

  return { session, refreshToken }
}

async function rotateSession(sessionId: string) {
  const database = await readSessionsDatabase()
  const sessionIndex = database.sessions.findIndex((session) => session.id === sessionId)

  if (sessionIndex < 0) {
    return null
  }

  const session = database.sessions[sessionIndex]
  if (session.revokedAt !== null || new Date(session.expiresAt).getTime() <= Date.now()) {
    return null
  }

  const newRefreshToken = createRefreshToken()
  database.sessions[sessionIndex] = {
    ...session,
    tokenHash: hashRefreshToken(newRefreshToken),
    lastUsedAt: new Date().toISOString(),
  }
  await saveSessionsDatabase(database)

  return { session: database.sessions[sessionIndex], refreshToken: newRefreshToken }
}

async function revokeSessionByRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken)
  const database = await readSessionsDatabase()
  const sessionIndex = database.sessions.findIndex((session) => session.tokenHash === tokenHash && session.revokedAt === null)

  if (sessionIndex < 0) {
    return false
  }

  database.sessions[sessionIndex] = {
    ...database.sessions[sessionIndex],
    revokedAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  }

  await saveSessionsDatabase(database)
  return true
}

function setAuthCookies(response: express.Response, accessToken: string, refreshToken: string) {
  response.cookie("access_token", accessToken, authCookieOptions(config.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000))
  response.cookie("refresh_token", refreshToken, authCookieOptions(config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000))
}

function clearAuthCookies(response: express.Response) {
  response.clearCookie("access_token", { path: "/" })
  response.clearCookie("refresh_token", { path: "/" })
}

function readAccessToken(request: express.Request): string | null {
  const bearerToken = request.header("authorization")
  if (bearerToken?.startsWith("Bearer ")) {
    return bearerToken.slice(7)
  }

  const cookieToken = request.cookies?.access_token
  return typeof cookieToken === "string" ? cookieToken : null
}

function readRefreshToken(request: express.Request): string | null {
  const cookieToken = request.cookies?.refresh_token
  return typeof cookieToken === "string" ? cookieToken : null
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "auth-service", timestamp: new Date().toISOString() })
})

app.post("/auth/login", loginRateLimiter, async (request, response) => {
  const parsedInput = loginSchema.safeParse(request.body)
  if (!parsedInput.success) {
    response.status(400).json({ message: "Invalid credentials" })
    return
  }

  try {
    const { email, password } = parsedInput.data
    const normalizedEmail = normalizeEmail(email)
    const user = await fetchUserByEmail(normalizedEmail)

    if (!user || !user.active || user.role !== "admin") {
      response.status(401).json({ message: "Invalid credentials" })
      return
    }

    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      response.status(401).json({ message: "Invalid credentials" })
      return
    }

    const { session, refreshToken } = await createSession(user, request)
    const accessToken = signAccessToken(user, session.id)
    setAuthCookies(response, accessToken, refreshToken)

    response.setHeader("Cache-Control", "no-store")
    response.json({
      message: "Login successful",
      user: publicUserFromRecord(user),
      expiresInMinutes: config.ACCESS_TOKEN_TTL_MINUTES,
    })
  } catch (error) {
    console.error("login failed", error)
    response.status(503).json({ message: "Authentication service unavailable" })
  }
})

app.post("/auth/refresh", async (request, response) => {
  const refreshToken = readRefreshToken(request)
  if (!refreshToken) {
    response.status(401).json({ message: "Refresh token missing" })
    return
  }

  try {
    const sessionDatabase = await readSessionsDatabase()
    const session = sessionDatabase.sessions.find(
      (entry) => entry.tokenHash === hashRefreshToken(refreshToken) && entry.revokedAt === null,
    )

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      response.status(401).json({ message: "Refresh token expired" })
      return
    }

    const user = await fetchUserById(session.userId)
    if (!user || !user.active) {
      response.status(401).json({ message: "Refresh token expired" })
      return
    }

    const rotation = await rotateSession(session.id)
    if (!rotation) {
      response.status(401).json({ message: "Refresh token expired" })
      return
    }

    const accessToken = signAccessToken(user, session.id)
    setAuthCookies(response, accessToken, rotation.refreshToken)
    response.setHeader("Cache-Control", "no-store")
    response.json({
      message: "Token refreshed",
      user: publicUserFromRecord(user),
      expiresInMinutes: config.ACCESS_TOKEN_TTL_MINUTES,
    })
  } catch (error) {
    console.error("refresh failed", error)
    response.status(503).json({ message: "Authentication service unavailable" })
  }
})

app.post("/auth/logout", async (request, response) => {
  const refreshToken = readRefreshToken(request)
  if (refreshToken) {
    await revokeSessionByRefreshToken(refreshToken)
  }

  clearAuthCookies(response)
  response.setHeader("Cache-Control", "no-store")
  response.json({ message: "Logged out" })
})

app.get("/auth/me", async (request, response) => {
  const accessToken = readAccessToken(request)
  if (!accessToken) {
    response.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const payload = verifyAccessToken(accessToken)
    const user = await fetchUserById(payload.sub)

    if (!user || !user.active || user.tokenVersion !== payload.tokenVersion) {
      response.status(401).json({ message: "Unauthorized" })
      return
    }

    response.json({ user: publicUserFromRecord(user) })
  } catch {
    response.status(401).json({ message: "Unauthorized" })
  }
})

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" })
})

async function main() {
  app.listen(config.AUTH_SERVICE_PORT, () => {
    console.log(`auth-service running on http://localhost:${config.AUTH_SERVICE_PORT}`)
  })
}

void main()
