import bcrypt from "bcryptjs"
import { findAthletePublic } from "~/server/repository/athletes"
import { findLoginCandidate } from "~/server/repository/auth"
import { logger } from "~/lib/logger/logger"
import { signToken } from "~/lib/external/jwt"
import type { ApiResponse, LoginResponse } from "~/types/api"
import { z } from "zod"
import { defineApiHandler } from "~/server/utils/api-handler"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { setAuthCookie } from "~/server/utils/auth-cookie"

export default defineApiHandler(async (event): Promise<ApiResponse<LoginResponse>> => {
  const body = await readBody(event)
  const password = typeof body?.password === "string" ? body.password : ""
  const rawVpfId = typeof body?.vpfId === "string" ? body.vpfId : undefined
  const rawEmail = typeof body?.email === "string" ? body.email : undefined

  if (!password) {
    logger.debug("Login attempt without password", { vpfId: rawVpfId, email: rawEmail })
    return fail(event, 400, MSG.passwordRequired)
  }

  const LoginBodySchema = z.object({
    password: z.string().min(1),
    vpfId: z.string().trim().min(1).optional(),
    email: z.email().trim().toLowerCase().optional(),
  }).refine((v) => Boolean(v.vpfId || v.email), {
    message: "Either vpfId or email is required",
    path: ["vpfId"],
  })

  const validated = LoginBodySchema.safeParse({ password, vpfId: rawVpfId, email: rawEmail })
  if (!validated.success) {
    logger.debug("Login attempt without vpfId or email")
    return fail(event, 400, {
      en: "Invalid login credentials",
      vi: "Thông tin đăng nhập không hợp lệ",
    })
  }

  const { vpfId, email } = validated.data

  // Find user by vpfId or email
  const identifier = vpfId ? { vpfId } : email ? { email } : undefined

  if (!identifier) {
    return fail(event, 400, {
      en: "Invalid login credentials",
      vi: "Thông tin đăng nhập không hợp lệ",
    })
  }

  // Query user with password for verification
  const user = await findLoginCandidate(identifier)

  if (!user) {
    logger.debug("Login attempt with non-existent user", { vpfId, email })
    return fail(event, 401, {
      en: "Invalid login credentials",
      vi: "Thông tin đăng nhập không hợp lệ",
    })
  }

  // Check if user has a password set
  if (!user.password) {
    logger.debug("Login attempt for user without password", { vpfId: user.vpfId, email: user.email })
    return fail(event, 401, {
      en: "Invalid login credentials",
      vi: "Thông tin đăng nhập không hợp lệ",
    })
  }

  // Compare password
  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    logger.debug("Login attempt with invalid password", { vpfId: user.vpfId, email: user.email })
    return fail(event, 401, {
      en: "Invalid login credentials",
      vi: "Thông tin đăng nhập không hợp lệ",
    })
  }

  // Query user again with public select for response
  const userPublic = await findAthletePublic(user.vpfId)

  if (!userPublic) {
    logger.error("Failed to fetch user public data after login", { vpfId: user.vpfId })
    return fail(event, 500, {
      en: "An error occurred during login",
      vi: "Đã xảy ra lỗi khi đăng nhập",
    })
  }

  // Generate JWT token
  const token = signToken({
    vpfId: user.vpfId,
    email: user.email,
    role: user.role,
  })

  logger.debug("User logged in successfully", { vpfId: user.vpfId, email: user.email })

  setAuthCookie(event, token)

  return ok(
    { user: userPublic, token, emailVerified: user.emailVerified },
    { en: "Login successful", vi: "Đăng nhập thành công" },
  )
})
