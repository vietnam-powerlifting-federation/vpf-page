import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { config } from "~/lib/config/config"

/** VietQR image URL whose transfer memo is `VPF<refCode>` (see the VIP purchase flow). */
export function buildVietQrUrl(refCode: string, amount: number): string {
  const { bankId, accountNo, accountName } = config.vietqr
  const params = new URLSearchParams({ amount: String(amount), addInfo: `VPF${refCode}`, accountName })
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?${params.toString()}`
}

/** Random unique 6-digit ref code (matches SePay's `VPF\d{6}` extraction). */
export async function generateUniqueRefCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")
    const existing = await db
      .select({ refCode: purchases.refCode })
      .from(purchases)
      .where(eq(purchases.refCode, code))
      .limit(1)
      .then((rows) => rows[0])
    if (!existing) return code
  }
  throw new Error("Failed to generate unique ref code after 10 attempts")
}
