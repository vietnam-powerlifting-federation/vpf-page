/**
 * VIP membership is active when expire date is null (no expiry) or on or after current date.
 */
export function isVipActive(expiresAt: string | null): boolean {
  if (expiresAt === null || expiresAt === undefined) return true
  const today = new Date().toISOString().slice(0, 10)
  return expiresAt >= today
}
