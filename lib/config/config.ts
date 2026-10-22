/**
 * Environment configuration.
 *
 * Every secret is read through a lazy getter, so *importing* this module never
 * throws — a missing value fails when something first tries to use it, naming
 * what is missing and why.
 *
 * That distinction matters more than it looks. This module used to validate at
 * import time, and `nuxt build` loads the Nitro bundle to prerender pages, so a
 * build could not start without a JWT secret and a full set of R2 credentials —
 * none of which prerendering touches. The Dockerfile answered that with six
 * `build-time-placeholder` environment variables, which meant the build proved
 * nothing about the real configuration and any genuinely missing value surfaced
 * in production instead. Deferring to first use lets the build run with no
 * secrets at all while keeping the same clear failure for a real misconfiguration.
 *
 * Not `useRuntimeConfig()`: this module is also loaded by the drizzle-kit CLI and
 * by Vitest, neither of which has a Nuxt runtime to read from.
 */

function required(name: string, hint?: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set.${hint ? ` ${hint}` : ""}`)
  }
  return value
}

const isTest = process.env.VITEST === "true"

/**
 * Tests must never reach the development or production database, so the swap is
 * explicit and a missing test URL is an error rather than a silent fallback.
 */
function resolveDatabaseUrl(): string | undefined {
  if (!isTest) return process.env.DATABASE_URL
  return required("TEST_DATABASE_URL", "It is required whenever Vitest runs.")
}

/**
 * When enabled, email verification is skipped: newly registered users are marked
 * verified immediately and no verification code email is sent. Intended for local
 * development only — see the email service for the production warning.
 */
function emailVerificationSkip(): boolean {
  return process.env.EMAIL_VERIFICATION_SKIP === "true"
}

/** Credentials are only required when verification emails are actually being sent. */
function requiredSmtp(name: string): string {
  if (emailVerificationSkip()) return process.env[name] ?? ""
  return required(
    name,
    "SMTP must be configured when email verification is active. Set EMAIL_VERIFICATION_SKIP=true to disable it in development.",
  )
}

const R2_HINT = "Cloudflare R2 is required for image uploads."

export const config = {
  get databaseURL(): string | undefined {
    return resolveDatabaseUrl()
  },
  get testDatabaseURL(): string | undefined {
    return process.env.TEST_DATABASE_URL
  },
  get logLevel(): string {
    return process.env.LOG_LEVEL || "info"
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV || "development"
  },
  get jwtSecret(): string {
    return required("JWT_SECRET")
  },
  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || "30d"
  },
  get emailVerificationSkip(): boolean {
    return emailVerificationSkip()
  },

  /** SMTP config for outbound email. When incomplete, the email service logs instead of sending. */
  get smtp() {
    return {
      host: process.env.SMTP_HOST || "",
      port: Number(process.env.SMTP_PORT || "587"),
      user: process.env.SMTP_USER || "",
      password: requiredSmtp("SMTP_PASSWORD"),
      secure: process.env.SMTP_SECURE === "true",
      from: requiredSmtp("SMTP_FROM"),
    }
  },

  /** Cloudflare R2 for VIP image uploads (S3-compatible API). All values are required together. */
  get r2() {
    return {
      accountId: required("CLOUDFLARE_R2_ACCOUNT_ID", R2_HINT),
      accessKeyId: required("CLOUDFLARE_R2_ACCESS_KEY_ID", R2_HINT),
      secretAccessKey: required("CLOUDFLARE_R2_SECRET_ACCESS_KEY", R2_HINT),
      vipBucket: required("CLOUDFLARE_R2_VIP_BUCKET", R2_HINT),
      /** Base URL for public object access (e.g. an R2 custom domain or r2.dev). */
      vipPublicUrlBase: required("CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE", R2_HINT),
    }
  },

  /** Our receiving bank account, used to render a payment QR. Bank name (e.g. "VietinBank"), not a NAPAS BIN. */
  get bankAccount() {
    return {
      bankName: process.env.BANK_NAME || "",
      accountNo: process.env.BANK_ACCOUNT_NO || "",
      accountName: process.env.BANK_ACCOUNT_NAME || "",
    }
  },
}
