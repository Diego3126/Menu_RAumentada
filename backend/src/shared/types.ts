export type UserRole = "admin" | "staff"

export interface UserRecord {
  id: string
  email: string
  name: string
  passwordHash: string
  role: UserRole
  active: boolean
  tokenVersion: number
  createdAt: string
  updatedAt: string
}

export interface PublicUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface UsersDatabase {
  users: UserRecord[]
}

export interface SessionRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  createdAt: string
  lastUsedAt: string
  revokedAt: string | null
  ipAddress: string | null
  userAgent: string | null
}

export interface SessionsDatabase {
  sessions: SessionRecord[]
}
