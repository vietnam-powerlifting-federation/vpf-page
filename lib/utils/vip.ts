/**
 * VIP membership is active only when an expiry date exists and is on or after today.
 *
 * A null expiry means "never purchased" — new athletes are created without one
 * (see server/api/auth/register.post.ts), so treating null as active would hand
 * every registered athlete a free VIP profile. Permanent VIP is granted by setting
 * a far-future date in the admin panel, not by clearing the field.
 */
export function isVipActive(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  const today = new Date().toISOString().slice(0, 10)
  return expiresAt >= today
}
