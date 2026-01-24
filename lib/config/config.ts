const databaseURL = process.env.DATABASE_URL
if (!databaseURL) {
  throw new Error("DATABASE_URL is not set")
}

const logLevel = process.env.LOG_LEVEL || "info"

const nodeEnv = process.env.NODE_ENV || "development"

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not set")
}
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d"

export const config = {
  databaseURL,
  logLevel,
  nodeEnv,
  jwtSecret,
  jwtExpiresIn,
}