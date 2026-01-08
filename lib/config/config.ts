const databaseURL = process.env.DATABASE_URL
if (!databaseURL) {
  throw new Error("DATABASE_URL is not set")
}

export const config = {
  databaseURL,
}