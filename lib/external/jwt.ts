import jwt, { type SignOptions } from "jsonwebtoken"
import { config } from "../config/config"
import type { InferSelectModel } from "drizzle-orm"
import type { users } from "../external/drizzle/migrations/schema"

export interface JwtPayload {
  /** The account's primary key. */
  userId: string
  /** The public athlete number, carried for logs and display. */
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
    const payload = jwt.verify(token, config.jwtSecret) as Partial<JwtPayload>
    // Tokens issued before accounts were keyed by `userId` carry only a vpfId;
    // treat them as signed out rather than as an identity nothing can resolve.
    return payload.userId ? payload as JwtPayload : null
  } catch {
    return null
  }
}