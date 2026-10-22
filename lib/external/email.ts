import nodemailer, { type Transporter } from "nodemailer"
import { config } from "~/lib/config/config"
import { logger } from "~/lib/logger/logger"

// Warn once at module load if email verification is being skipped in production.
if (config.emailVerificationSkip && config.nodeEnv === "production") {
  logger.warn(
    "EMAIL_VERIFICATION_SKIP is enabled in production. New accounts are marked verified without email confirmation. Disable this in production.",
  )
}

let cachedTransporter: Transporter | null = null

function isSmtpConfigured(): boolean {
  const { host, user, password } = config.smtp
  return Boolean(host && user && password)
}

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    })
  }
  return cachedTransporter
}

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email via SMTP. When SMTP is not configured, the email is logged instead
 * of being delivered so local development works without a mail server.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transporter = getTransporter()

  if (!transporter) {
    logger.warn("SMTP not configured; email not sent (logging instead)", {
      to: options.to,
      subject: options.subject,
      text: options.text,
    })
    return
  }

  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    logger.info("Email sent", { to: options.to, subject: options.subject })
  } catch (error) {
    logger.error("Failed to send email", { to: options.to, subject: options.subject, error: (error as Error).message })
  }
}

function layout(bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937;">${bodyHtml}<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/><p style="font-size:12px;color:#9ca3af">Vietnam Powerlifting Federation</p></div>`
}

/** Send the email-verification code (bilingual en/vi). */
export async function sendVerificationCodeEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Verify your email / Xác minh email của bạn",
    text: `Your verification code is ${code}. It expires in 30 minutes.\n\nMã xác minh của bạn là ${code}. Mã hết hạn sau 30 phút.`,
    html: layout(
      `<h2>Verify your email</h2>
       <p>Your verification code is:</p>
       <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
       <p style="color:#6b7280">This code expires in 30 minutes.</p>
       <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
       <h2>Xác minh email của bạn</h2>
       <p>Mã xác minh của bạn là:</p>
       <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
       <p style="color:#6b7280">Mã này hết hạn sau 30 phút.</p>`,
    ),
  })
}

/** Send the password-reset code (bilingual en/vi). */
export async function sendPasswordResetCodeEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your password / Đặt lại mật khẩu của bạn",
    text: `Your password reset code is ${code}. It expires in 30 minutes. If you did not request a reset, ignore this email.\n\nMã đặt lại mật khẩu của bạn là ${code}. Mã hết hạn sau 30 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
    html: layout(
      `<h2>Reset your password</h2>
       <p>Your password reset code is:</p>
       <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
       <p style="color:#6b7280">This code expires in 30 minutes. If you did not request a reset, ignore this email.</p>
       <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
       <h2>Đặt lại mật khẩu của bạn</h2>
       <p>Mã đặt lại mật khẩu của bạn là:</p>
       <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
       <p style="color:#6b7280">Mã này hết hạn sau 30 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
    ),
  })
}

/** Notify the athlete that their identity verification was approved. */
export async function sendVerificationApprovedEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Your verification was approved / Hồ sơ xác minh đã được duyệt",
    text: "Your identity verification has been approved.\n\nHồ sơ xác minh danh tính của bạn đã được duyệt.",
    html: layout(
      `<h2>Verification approved</h2>
       <p>Your identity verification has been approved. Thank you.</p>
       <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
       <h2>Hồ sơ đã được duyệt</h2>
       <p>Hồ sơ xác minh danh tính của bạn đã được duyệt. Xin cảm ơn.</p>`,
    ),
  })
}

/** Notify the athlete that their identity verification was rejected, with an optional reason. */
export async function sendVerificationRejectedEmail(to: string, reason?: string | null): Promise<void> {
  const reasonHtml = reason
    ? `<p><strong>Reason / Lý do:</strong> ${reason}</p>`
    : ""
  const reasonText = reason ? `\nReason / Lý do: ${reason}` : ""
  await sendEmail({
    to,
    subject: "Your verification needs changes / Hồ sơ xác minh cần chỉnh sửa",
    text: `Your identity verification was not approved. Please review and resubmit.${reasonText}\n\nHồ sơ xác minh của bạn chưa được duyệt. Vui lòng kiểm tra và gửi lại.${reasonText}`,
    html: layout(
      `<h2>Verification not approved</h2>
       <p>Your identity verification was not approved. Please review your information and resubmit.</p>
       ${reasonHtml}
       <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
       <h2>Hồ sơ chưa được duyệt</h2>
       <p>Hồ sơ xác minh danh tính của bạn chưa được duyệt. Vui lòng kiểm tra thông tin và gửi lại.</p>
       ${reasonHtml}`,
    ),
  })
}
