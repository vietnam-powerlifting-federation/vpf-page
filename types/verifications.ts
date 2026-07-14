import type { InferSelectModel } from "drizzle-orm"
import type { identityVerifications } from "~/lib/external/drizzle/migrations/schema"

export type IdentityVerification = InferSelectModel<typeof identityVerifications>

/** Identity verification row plus the submitting athlete's identity, for the admin review list. */
export type IdentityVerificationWithUser = IdentityVerification & {
  userEmail: string | null
  userName: string
}
