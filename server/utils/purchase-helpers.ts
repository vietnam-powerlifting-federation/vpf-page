import { eq } from "drizzle-orm"
import { db } from "~/lib/external/drizzle/drizzle"
import { purchases } from "~/lib/external/drizzle/migrations/schema"
import { config } from "~/lib/config/config"

/**
 * QR image URL whose transfer memo is `SEVQR <refCode>` (see the VIP purchase flow).
 * The `SEVQR` prefix is required for SePay to pick up the transaction at all.
 */
export function buildQrUrl(refCode: string, amount: number): string {
  const { bankName, accountNo, accountName } = config.bankAccount
  const params = new URLSearchParams({
    bank: bankName,
    acc: accountNo,
    template: "compact",
    amount: String(amount),
    des: `SEVQR ${refCode}`,
    showinfo: "true",
    holder: accountName,
  })
  return `https://vietqr.app/img?${params.toString()}`
}

/** Random unique 6-digit ref code (matches the SePay webhook's `SEVQR`-anchored extraction). */
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
