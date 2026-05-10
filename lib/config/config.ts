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

const vietqrBankId = process.env.VIETQR_BANK_ID || ""
const vietqrAccountNo = process.env.VIETQR_ACCOUNT_NO || ""
const vietqrAccountName = process.env.VIETQR_ACCOUNT_NAME || ""

/** Cloudflare R2 config for VIP image uploads (S3-compatible API). All must be set for server-side upload to work. */
const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
const r2VipBucket = process.env.CLOUDFLARE_R2_VIP_BUCKET
/** Base URL for public object access (e.g. R2 custom domain or r2.dev). */
const r2VipPublicUrlBase = process.env.CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE

function getMissingR2Env() {
  const missing = []
  if (!r2AccountId) missing.push("CLOUDFLARE_R2_ACCOUNT_ID")
  if (!r2AccessKeyId) missing.push("CLOUDFLARE_R2_ACCESS_KEY_ID")
  if (!r2SecretAccessKey) missing.push("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
  if (!r2VipBucket) missing.push("CLOUDFLARE_R2_VIP_BUCKET")
  if (!r2VipPublicUrlBase) missing.push("CLOUDFLARE_R2_VIP_PUBLIC_URL_BASE")
  return missing
}

const missingR2Env = getMissingR2Env()
if (missingR2Env.length > 0) {
  throw new Error(
    `Cloudflare R2 is not configured. Missing env var(s): ${missingR2Env.join(", ")}`
  )
}

export const config = {
  databaseURL,
  testDatabaseURL,
  logLevel,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn,
  r2: {
    accountId: r2AccountId!,
    accessKeyId: r2AccessKeyId!,
    secretAccessKey: r2SecretAccessKey!,
    vipBucket: r2VipBucket!,
    vipPublicUrlBase: r2VipPublicUrlBase!,
  },
  vietqr: {
    bankId: vietqrBankId,
    accountNo: vietqrAccountNo,
    accountName: vietqrAccountName,
  },
}