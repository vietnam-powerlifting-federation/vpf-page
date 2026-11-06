import winston from "winston"
import path from "path"
import fs from "fs"
import { config } from "../config/config"

// Readable output for a person at a terminal.
const prettyFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, ...meta }) =>
      `${timestamp} [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
      }`
  )
)

// In production the console is read by Vector (monitoring/vector/vector.yaml),
// which needs one JSON object per line: no colour codes, no multi-line meta.
// The logger's own format below already produces exactly that.
const transports: winston.transport[] = [
  new winston.transports.Console(config.nodeEnv === "production" ? {} : { format: prettyFormat }),
]

// Add file transport only in development
if (config.nodeEnv === "development") {
  const logsDir = path.resolve("./logs")
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
  
  // Create file transports for different log levels
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  )
}

// Create and export the logger
export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
})
