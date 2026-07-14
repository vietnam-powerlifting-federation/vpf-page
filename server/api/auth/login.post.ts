import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPublicSelect } from "~/lib/utils/queries/users"
import { logger } from "~/lib/logger/logger"
import { signToken } from "~/lib/utils/jwt"
import type { ApiResponse, LoginResponse } from "~/types/api"
import { z } from "zod"
import { ok, fail } from "~/server/utils/api-response"
import { MSG } from "~/server/utils/messages"
import { setAuthCookie } from "~/server/utils/auth-cookie"

export default defineEventHandler(async (event): Promise<ApiResponse<LoginResponse>> => {
  try {
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
    const whereCondition = vpfId
      ? eq(users.vpfId, vpfId)
      : email
        ? eq(users.email, email)
        : undefined

    if (!whereCondition) {
      return fail(event, 400, {
        en: "Invalid login credentials",
        vi: "Thông tin đăng nhập không hợp lệ",
      })
    }

    // Query user with password for verification
    const user = await db
      .select({
        vpfId: users.vpfId,
        email: users.email,
        password: users.password,
        role: users.role,
      })
      .from(users)
      .where(whereCondition)
      .limit(1)
      .then((rows) => rows[0])

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
    const [userPublic] = await db
      .select(userPublicSelect)
      .from(users)
      .where(eq(users.vpfId, user.vpfId))
      .limit(1)

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
      { user: userPublic, token },
      { en: "Login successful", vi: "Đăng nhập thành công" },
    )
  } catch (error) {
    logger.error("Login error", { error: (error as Error).message })
    return fail(event, 500, {
      en: "An error occurred during login",
      vi: "Đã xảy ra lỗi khi đăng nhập",
    })
  }
})
