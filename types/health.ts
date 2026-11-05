export type HealthStatus = {
  database: "ok"
  /** The cache is optional, so `down` or `disabled` still counts as healthy. */
  cache: "ok" | "down" | "disabled"
}
