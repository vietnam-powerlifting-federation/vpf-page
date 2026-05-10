import { approvePurchase } from "~/server/utils/approve-purchase"
import { logger } from "~/lib/logger/logger"

// SePay webhook payload: https://docs.sepay.vn/webhook.html
interface SepayWebhookPayload {
  id: number
  gateway: string
  transactionDate: string
  accountNumber: string
  code: string | null
  content: string
  transferType: "in" | "out"
  transferAmount: number
  accumulated: number
  subAccId: string
  referenceCode: string
  description: string
}

// Transfer content uses "VPF" + 6-digit refCode, e.g. "VPF123456"
const REF_CODE_PATTERN = /VPF(\d{6})/i

export default defineEventHandler(async (event) => {
  const body = await readBody<SepayWebhookPayload>(event)

  const content = body?.content ?? ""
  const match = REF_CODE_PATTERN.exec(content)

  if (!match) {
    logger.warn("SePay webhook: no VPF ref code found in transfer content", {
      transactionId: body?.id,
      content,
      transferAmount: body?.transferAmount,
      transferType: body?.transferType,
    })
    return { success: true }
  }

  const refCode = match[1]

  try {
    const result = await approvePurchase(refCode, null)

    if (!result.success) {
      logger.warn("SePay webhook: purchase approval failed", {
        transactionId: body.id,
        refCode,
        statusCode: result.statusCode,
        reason: result.message.en,
      })
    } else {
      logger.info("SePay webhook: purchase approved", {
        transactionId: body.id,
        refCode,
        purchaseId: result.purchaseId,
        vipMembershipExpiresAt: result.vipMembershipExpiresAt,
      })
    }
  } catch (error) {
    logger.error("SePay webhook: unexpected error during approval", {
      transactionId: body.id,
      refCode,
      error: (error as Error).message,
    })
  }

  return { success: true }
})
