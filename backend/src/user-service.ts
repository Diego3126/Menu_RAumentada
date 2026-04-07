import express from "express"
import helmet from "helmet"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { config } from "./shared/config.js"
import { readJsonFile, writeJsonFile } from "./shared/file-store.js"
import { hashPassword, normalizeEmail, publicUserFromRecord } from "./shared/security.js"
import type { PublicUser, UserRecord, UsersDatabase } from "./shared/types.js"

const usersFilePath = resolve(process.cwd(), config.DATA_DIR, "users.json")

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
app.use(rateLimit({ windowMs: 60_000, limit: 120 }))

function requireInternalToken(request: express.Request, response: express.Response, next: express.NextFunction) {
  const serviceToken = request.header("x-internal-service-token")
  if (serviceToken !== config.INTERNAL_SERVICE_TOKEN) {
    response.status(403).json({ message: "Forbidden" })
    return
  }

  next()
}

async function readUsersDatabase(): Promise<UsersDatabase> {
  return readJsonFile<UsersDatabase>(usersFilePath, { users: [] })
}

async function saveUsersDatabase(database: UsersDatabase): Promise<void> {
  await writeJsonFile(usersFilePath, database)
}

async function seedAdminUser(): Promise<void> {
  const database = await readUsersDatabase()
  const normalizedEmail = normalizeEmail(config.ADMIN_EMAIL)
  const existingUser = database.users.find((user) => user.email === normalizedEmail)

  if (existingUser) {
    return
  }

  const now = new Date().toISOString()
  const passwordHash = await hashPassword(config.ADMIN_PASSWORD)
  const adminUser: UserRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    name: "Administrador",
    passwordHash,
    role: "admin",
    active: true,
    tokenVersion: 1,
    createdAt: now,
    updatedAt: now,
  }

  database.users.push(adminUser)
  await saveUsersDatabase(database)
}

function findUserByEmail(database: UsersDatabase, email: string): UserRecord | null {
  const normalizedEmail = normalizeEmail(email)
  return database.users.find((user) => user.email === normalizedEmail) ?? null
}

function findUserById(database: UsersDatabase, id: string): UserRecord | null {
  return database.users.find((user) => user.id === id) ?? null
}

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "user-service", timestamp: new Date().toISOString() })
})

app.get("/internal/users/by-email", requireInternalToken, async (request, response) => {
  const email = typeof request.query.email === "string" ? request.query.email : ""
  if (!email) {
    response.status(400).json({ message: "Email is required" })
    return
  }

  const database = await readUsersDatabase()
  const user = findUserByEmail(database, email)

  if (!user) {
    response.status(404).json({ message: "User not found" })
    return
  }

  response.json(user)
})

app.get("/internal/users/:id", requireInternalToken, async (request, response) => {
  const database = await readUsersDatabase()
  const userId = typeof request.params.id === "string" ? request.params.id : ""
  const user = findUserById(database, userId)

  if (!user) {
    response.status(404).json({ message: "User not found" })
    return
  }

  response.json(user)
})

app.get("/internal/users", requireInternalToken, async (_request, response) => {
  const database = await readUsersDatabase()
  const publicUsers: PublicUser[] = database.users.map((user) => publicUserFromRecord(user))
  response.json({ users: publicUsers })
})

async function main() {
  await seedAdminUser()

  app.listen(config.USER_SERVICE_PORT, () => {
    console.log(`user-service running on http://localhost:${config.USER_SERVICE_PORT}`)
  })
}

void main()
