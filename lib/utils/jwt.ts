import jwt, { type SignOptions } from "jsonwebtoken"
import { config } from "../config/config"
import type { InferSelectModel } from "drizzle-orm"
import type { users } from "../external/drizzle/migrations/schema"

export interface JwtPayload {
  vpfId: string
  email: string | null
  role: InferSelectModel<typeof users>["role"]
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions)
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  } catch {
    return null
  }
}