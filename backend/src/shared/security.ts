import { createHash, randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { config } from "./config.js"
import type { PublicUser } from "./types.js"

export interface AccessTokenPayload {
  sub: string
  email: string
  role: string
  sessionId: string
  tokenVersion: number
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("base64url")
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function signAccessToken(user: { id: string; email: string; role: string; tokenVersion: number }, sessionId: string): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    sessionId,
    tokenVersion: user.tokenVersion,
  }

  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: `${config.ACCESS_TOKEN_TTL_MINUTES}m` })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function publicUserFromRecord(user: {
  id: string
  email: string
  name: string
  role: "admin" | "staff"
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  }
}
