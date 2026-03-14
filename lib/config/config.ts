const isTest = process.env.VITEST === "true"
const testDatabaseURL = process.env.TEST_DATABASE_URL
if (isTest && !testDatabaseURL) {
  throw new Error(
    "TEST_DATABASE_URL is required when running tests"
  )
}
const databaseURL = isTest ? testDatabaseURL! : process.env.DATABASE_URL

const logLevel = process.env.LOG_LEVEL || "info"

const nodeEnv = process.env.NODE_ENV || "development"

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set")
}
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "30d"

/** Cloudflare R2 config for VIP image uploads (S3-compatible API). All must be set for server-side upload to work. */
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2VipBucket = process.env.CLOUDFLARE_R2_VIP_BUCKET
/** Optional: base URL for public object access (e.g. R2 custom domain or r2.dev). Required to return public URLs. */
const r2VipPublicUrlBase = process.env.CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE

export const config = {
  databaseURL,
  testDatabaseURL,
  logLevel,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn,
  r2: {
    accountId: r2AccountId,
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
    vipBucket: r2VipBucket,
    vipPublicUrlBase: r2VipPublicUrlBase,
    /** True when all required R2 env vars are set and VIP uploads can be used. */
    isConfigured: Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2VipBucket),
  },
}