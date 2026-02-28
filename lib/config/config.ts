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

export const config = {
  databaseURL,
  testDatabaseURL,
  logLevel,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn,
}