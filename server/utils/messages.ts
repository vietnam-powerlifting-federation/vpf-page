import type { I18nMessage } from "~/server/utils/api-response"

/**
 * Bilingual (en/vi) messages reused across multiple API handlers.
 * Keep single-use, endpoint-specific messages inline at their call site;
 * only messages shared by two or more handlers belong here.
 */
export const MSG = {
  internalError: { en: "Internal server error", vi: "Lỗi máy chủ" },
  unauthorized: { en: "Unauthorized", vi: "Không được phép" },
  adminOnly: { en: "Admin access required", vi: "Yêu cầu quyền quản trị viên" },
  userNotFound: { en: "User not found", vi: "Không tìm thấy người dùng" },
  athleteNotFound: { en: "Athlete not found", vi: "Không tìm thấy vận động viên" },
  invalidInput: { en: "Invalid input data", vi: "Dữ liệu đầu vào không hợp lệ" },
  refCodeRequired: { en: "Ref code is required", vi: "Mã tham chiếu là bắt buộc" },
  purchaseNotFound: { en: "Purchase not found", vi: "Không tìm thấy giao dịch" },
  passwordRequired: { en: "Password is required", vi: "Mật khẩu là bắt buộc" },
  failedCreateUser: { en: "Failed to create user", vi: "Không thể tạo người dùng" },
  emailAlreadyExists: { en: "Email already exists", vi: "Email đã tồn tại" },
  emailAlreadyVerified: { en: "Email already verified", vi: "Email đã được xác minh" },
} as const satisfies Record<string, I18nMessage>
