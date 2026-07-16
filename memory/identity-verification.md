# Registration & identity verification

The once-per-account lifecycle that turns a fresh signup into an admin-verified athlete. This is the **account-level** identity gate that the per-meet [competition registration flow](competition-registration-flow.md) depends on — don't confuse the two: this doc is "prove who you are once", that doc is "enter this specific meet".

Throughout, "user" = athlete. "CCCD" is the Vietnamese citizen ID card.

## Two independent flags on `users`

There are two separate verification axes, and they gate different things. Both are `boolean NOT NULL DEFAULT false`:

| Column | Meaning | Set by |
| --- | --- | --- |
| `emailVerified` | Email ownership proven via a 6-digit code | [verify-email.post.ts](../server/api/auth/verify-email.post.ts) |
| `identityVerified` | CCCD identity **admin-approved** | [review.patch.ts](../server/api/verifications/[id]/review.patch.ts) |

`emailVerified` is a **precondition** for identity: [self.post.ts](../server/api/verifications/self.post.ts) refuses identity submission until the email is verified.

## The lifecycle

1. **Register** — [register.post.ts](../server/api/auth/register.post.ts). Creates the `users` row (DB auto-generates `vpfId`), stores a hashed password, sets `emailVerified=false`, generates a 30-min email code, and **auto-logs-in** (issues the JWT cookie) so the athlete can proceed. `fullName` is optional here — it defaults to the email local-part and is replaced by the real name at approval. The `EMAIL_VERIFICATION_SKIP` env shortcuts this in dev (marks verified, sends no code).
2. **Verify email** — the code flips `emailVerified=true`.
3. **Submit identity** — [self.post.ts](../server/api/verifications/self.post.ts). Multipart form (personal info + front-of-CCCD photo to R2). Writes **one row per athlete** in `identity_verifications` (unique on `vpfId`, FK cascade) with `status='pending'`. Any (re)submission **resets status to pending** and clears the review fields. Approved rows are **locked** — resubmission is rejected.
4. **Admin review** — [review.patch.ts](../server/api/verifications/[id]/review.patch.ts). Admin sets `approved` or `rejected`. On **approved**: the verified fields (name, nationality, dob, nationalId, address, phone) are copied onto the `users` record **and `identityVerified` is set true**. On **rejected**: `identityVerified` is set false. Either way the athlete gets a bilingual email.

## `identity_verifications.status` vs the `identityVerified` flag

The enum has only three values — `pending` / `approved` / `rejected` ([schema.ts](../lib/external/drizzle/migrations/schema.ts)). There is **no "not submitted" value**; that state is the *absence* of a row. So the real derived status is a **4-state**:

```
row missing            → "not_submitted"   (registered, never filled the form)
status = pending       → "pending"         (submitted/resubmitted, awaiting admin)
status = approved       → "approved"        (verified; form locked)
status = rejected       → "rejected"        (may resubmit → back to pending)
```

**Invariant:** `users.identityVerified === true` iff the athlete's current `identity_verifications.status === 'approved'`. It's a **denormalized flag** — a fast gate that avoids joining `identity_verifications` (e.g. the competition wizard's identity gate, or a profile badge). It's maintained in exactly one place — the approve/reject branch of `review.patch.ts` — because `approved` is only reachable there and resubmission of an approved row is blocked, so no other path can desync it.

`identityVerified` is **internal**: it's listed in `UserInternal` in [types/users.ts](../types/users.ts), so it never appears in `UserPrivate` / `UserPublic` (and is absent from `userPrivateSelect`/`userPublicSelect`).

## Reading status

[self.get.ts](../server/api/verifications/self.get.ts) is the dedicated status endpoint. It returns `{ emailVerified, identityVerified, verification }` — the two flags plus the full row (or `null`). Frontends derive the 4-state from `verification?.status ?? "not_submitted"` and use the flags for quick gating. Consumers: [profile](../pages/openvpf/profile/index.vue), [verification.vue](../pages/verification.vue), [verify-email.vue](../pages/verify-email.vue).

## API surface

| Route | Purpose |
| --- | --- |
| `POST /api/verifications/self` | Athlete submits / resubmits identity (multipart) |
| `GET /api/verifications/self` | Athlete's own email + identity status |
| `GET /api/verifications` | Admin list of submissions (with submitter identity) |
| `PATCH /api/verifications/[id]/review` | Admin approve/reject; maintains `identityVerified` |

Tests: [test/api/verifications.test.ts](../test/api/verifications.test.ts).
