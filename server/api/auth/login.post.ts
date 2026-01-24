import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "~/lib/external/drizzle/drizzle"
import { users } from "~/lib/external/drizzle/migrations/schema"
import { userPublicSelect } from "~/lib/external/drizzle/migrations/queries"
import { logger } from "~/lib/logger/logger"
import { signToken } from "~/lib/utils/jwt"
import type { ApiResponse, LoginResponse } from "~/types/api"

export default defineEventHandler(async (event): Promise<ApiResponse<LoginResponse>> => {
  try {
    const body = await readBody(event)
    const { vpfId, email, password } = body

    // Validate input
    if (!password) {
      logger.debug("Login attempt without password", { vpfId, email })
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Password is required",
          vi: "Mật khẩu là bắt buộc",
        },
      }
    }

    if (!vpfId && !email) {
      logger.debug("Login attempt without vpfId or email")
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid login credentials",
          vi: "Thông tin đăng nhập không hợp lệ",
        },
      }
    }

    // Find user by vpfId or email
    const whereCondition = vpfId
      ? eq(users.vpfId, vpfId)
      : email
        ? eq(users.email, email)
        : undefined

    if (!whereCondition) {
      setResponseStatus(event, 400)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid login credentials",
          vi: "Thông tin đăng nhập không hợp lệ",
        },
      }
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
      setResponseStatus(event, 401)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid login credentials",
          vi: "Thông tin đăng nhập không hợp lệ",
        },
      }
    }

    // Check if user has a password set
    if (!user.password) {
      logger.debug("Login attempt for user without password", { vpfId: user.vpfId, email: user.email })
      setResponseStatus(event, 401)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid login credentials",
          vi: "Thông tin đăng nhập không hợp lệ",
        },
      }
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      logger.debug("Login attempt with invalid password", { vpfId: user.vpfId, email: user.email })
      setResponseStatus(event, 401)
      return {
        success: false,
        data: null,
        message: {
          en: "Invalid login credentials",
          vi: "Thông tin đăng nhập không hợp lệ",
        },
      }
    }

    // Query user again with public select for response
    const [userPublic] = await db
      .select(userPublicSelect)
      .from(users)
      .where(eq(users.vpfId, user.vpfId))
      .limit(1)

    if (!userPublic) {
      logger.error("Failed to fetch user public data after login", { vpfId: user.vpfId })
      setResponseStatus(event, 500)
      return {
        success: false,
        data: null,
        message: {
          en: "An error occurred during login",
          vi: "Đã xảy ra lỗi khi đăng nhập",
        },
      }
    }

    // Generate JWT token
    const token = signToken({
      vpfId: user.vpfId,
      email: user.email,
      role: user.role,
    })

    logger.debug("User logged in successfully", { vpfId: user.vpfId, email: user.email })

    setResponseStatus(event, 200)
    return {
      success: true,
      data: {
        user: userPublic,
        token,
      },
      message: {
        en: "Login successful",
        vi: "Đăng nhập thành công",
      },
    }
  } catch (error) {
    logger.error("Login error", { error: (error as Error).message })
    setResponseStatus(event, 500)
    return {
      success: false,
      data: null,
      message: {
        en: "An error occurred during login",
        vi: "Đã xảy ra lỗi khi đăng nhập",
      },
    }
  }
})
