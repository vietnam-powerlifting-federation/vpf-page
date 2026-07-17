# Voucher system

Per-athlete discount vouchers applied at purchase creation. **Built** — the design below is the reference, and the code matches it except where noted in §8. Read the code for current behaviour.

Throughout, "user" = athlete. Amounts are **VND integers** — there is no sub-unit, and the bank transfer amount must be a whole number.

A voucher is owned by exactly one athlete, targets exactly one purchase type, is **single use**, and expires on a date. It discounts **only its own type's line item** — never the whole purchase, and never another type's fees.

## 0. What this replaced

[pages/openvpf/profile/voucher.vue](../pages/openvpf/profile/voucher.vue) *was* a demo page with hardcoded `demoVouchers` rows; it now reads real data through [useVouchers.ts](../composables/useVouchers.ts). The i18n keys it uses (`profile.voucherTable.*` in [en.json](../i18n/locales/en.json) / [vi.json](../i18n/locales/vi.json)) were already translated and define the athlete-facing vocabulary — **Active / Expired / Used** (`Còn hiệu lực` / `Hết hiệu lực` / `Đã sử dụng`). §6 explains why those three are derived, not stored.

Its demo rows also hint at the intended range of vouchers ("Free competition registration", "Free annual membership", "-20% for souvenir items"). Note the souvenir one has **no matching purchase type** — vouchers only apply to the three `purchase_type` values, so souvenir discounts are out of scope unless a type is added.

## 1. Data model

Build in [schema.ts](../lib/external/drizzle/migrations/schema.ts) (source of truth), then generate the migration with drizzle-kit — the next file is `0016_*.sql`. **Never hand-write the SQL.**

New enum, alongside the others at the top of the file:

```ts
export const voucherDiscountKind = pgEnum("voucher_discount_kind", ["fixed", "percent"])
```

New table `vouchers`:

| Column | Type | Notes |
| --- | --- | --- |
| `voucherId` | `serial` PK | |
| `code` | `text NOT NULL` | Unique, human-readable (e.g. `VPF-TET2026-A1B2`). Still **bound to `vpfId`** — the code is a handle, not a bearer token (§3). |
| `vpfId` | `text NOT NULL` FK → `users.vpfId` | The owner. Cascade on update/delete, matching `purchases`. |
| `type` | `purchaseType() NOT NULL` | A **single** enum value, *not* an array. Unlike `purchases.type`, a voucher targets one type only. |
| `discountKind` | `voucherDiscountKind() NOT NULL` | `fixed` = VND off, `percent` = % off. |
| `discountValue` | `integer NOT NULL` | VND when `fixed`; `1..100` when `percent`. |
| `expiresAt` | `date NOT NULL` | Inclusive — a voucher is usable **through** this date (§3). |
| `redeemedPurchaseId` | `integer` FK → `purchases.purchaseId` | `NULL` until redeemed. This is what makes it single-use. |
| `redeemedAt` | `timestamptz` | `NULL` until redeemed. |
| `discountApplied` | `integer` | VND actually deducted, frozen at redemption (§2). `NULL` until redeemed. |
| `note` | `text` | Free text for the athlete, e.g. why it was issued. Optional. |
| `createdAt` | `timestamptz NOT NULL DEFAULT now()` | |
| `createdBy` | `text` FK → `users.vpfId` | The admin who issued it (mirrors `purchases.approvedBy`). |

Constraints:

- `unique("vouchers_code_key").on(table.code)`
- **`unique("vouchers_purchase_type_key").on(table.redeemedPurchaseId, table.type)`** — this is the rule *"each purchase can have one voucher applied for each purchase type"*, enforced by the database rather than by application logic. Postgres treats `NULL`s as distinct in a unique constraint, so unredeemed vouchers (`redeemedPurchaseId IS NULL`) never collide with each other — no partial index needed.
- `check("chk_voucher_discount_value", sql`((discount_kind = 'percent') AND (discount_value BETWEEN 1 AND 100)) OR ((discount_kind = 'fixed') AND (discount_value > 0))`)`
- `check("chk_voucher_redeemed_consistent", sql`(redeemed_purchase_id IS NULL AND redeemed_at IS NULL AND discount_applied IS NULL) OR (redeemed_purchase_id IS NOT NULL AND redeemed_at IS NOT NULL AND discount_applied IS NOT NULL)`)` — the three redemption columns move together.

Index `vouchers(vpf_id)` for the athlete's list query.

**No change to `purchases`.** `purchases.amount` keeps its current meaning: **the amount the athlete must transfer**, i.e. post-discount, which is what [buildVietQrUrl](../server/utils/purchase-helpers.ts) already puts in the QR. The pre-discount subtotal is recoverable as `amount + sum(discountApplied)` over the purchase's vouchers, so it needs no column.

Add `Voucher`-related unions to [types/union-types.ts](../types/union-types.ts) (`VoucherDiscountKind`) and response shapes to a new `types/vouchers.ts`, per the directory rules — no types exported from `server/api`.

## 2. Discount math

Put this in a **new pure module** [lib/utils/vouchers.ts](../lib/utils/vouchers.ts) so the server and the client compute identical numbers from one implementation. It must not import `db` — it takes plain data.

The purchase is first broken into **line items keyed by purchase type**:

| Type | Line item | Source |
| --- | --- | --- |
| `competition` | Entry fee | `meets.entryFee ?? 0` |
| `vpf_membership` | Membership fee | `VPF_MEMBERSHIP_FEE` (200,000), when owed per `isMembershipOwed` |
| `vip` | Plan price | `VIP_MEMBERSHIP_PLANS[plan].amount` |

**Media Plus is never discounted.** `MEDIA_PLUS_FEE` is not a line item and belongs to no type — it is added to the total after discounts and always paid in full. (It is an add-on boolean on `competition_purchase_metadata`, not a purchase type — see [competition registration flow](competition-registration-flow.md) §5.)

Per voucher, against its own line item only:

- **fixed** → `discount = min(discountValue, lineItem)` — **clamped**. A 500,000 VND voucher on a 350,000 VND entry fee discounts 350,000, not 500,000. It never goes negative and never spills into another line item.
- **percent** → `discount = Math.floor(lineItem * discountValue / 100)`. Floored, so the payable amount is never rounded below the true price and stays a whole VND. 15% of 350,000 = 52,500 → athlete pays 297,500.

Then:

```
payable = Σ(lineItem − discount) + mediaPlusFee
```

`discountApplied` stores the **resolved** discount, not the rule — so editing or deleting the voucher later never rewrites the price of a purchase already made, and the receipt stays reconstructible.

### The zero-amount case

A 100% (or fully-clamping fixed) voucher makes `payable === 0`. A VietQR for 0 VND is meaningless and no SePay webhook will ever arrive, so the purchase would hang in `pending` forever.

**When `payable === 0`, create the purchase and immediately activate it** through `approvePurchase(refCode, null)` — the same single activation point the webhook uses, so VIP/membership expiry extension happens through exactly one code path. `approvedBy` stays `null` (it already means "not a human admin"). Return the activated purchase with **no `qrUrl`**; the frontend must show a success state, not a QR.

## 3. Validation

When a voucher code is applied, in order:

1. **Exists** — look up by `code`.
2. **Owned** — `voucher.vpfId === currentUser.vpfId`. Return the **same** bilingual "voucher not found" message as step 1, with the same status. Distinguishing the two lets anyone enumerate valid codes; a voucher is per-athlete, so someone else's code simply does not exist for you. Admins creating a purchase for another athlete (as `POST /api/purchases` already allows) resolve ownership against the **target** `vpfId`, not their own.
3. **Unredeemed** — `redeemedPurchaseId IS NULL`, else 409 "already used".
4. **Not expired** — `expiresAt >= today`, compared as `YYYY-MM-DD` strings the way [isRegistrationOpen](../server/utils/competition-registration.ts) does. Expiry is **inclusive**: a voucher expiring `2026-07-16` is still good all of 2026-07-16.
5. **Applicable** — `purchases.type.includes(voucher.type)`, else 400 "not applicable to this purchase".
6. **Line item is non-zero** — reject a voucher whose line item is 0 (a `vpf_membership` voucher when membership is not owed, a `competition` voucher when the meet has no `entryFee`). Silently redeeming it for 0 VND would burn a single-use voucher for nothing.
7. **One per type per request** — two `competition` vouchers in one request is a 400, not a silent drop. (The DB constraint in §1 is the backstop; catch it early for a decent message.)

All failures use `fail(event, …)` with bilingual `en`/`vi` messages per the [API response envelope](../memory/api-response-envelope.md). Handlers never throw `createError`.

## 4. API surface

Athlete-facing, `requireUser`:

- **`GET /api/vouchers`** — the athlete's own vouchers, newest first. Query params `?type=` (filter by purchase type) and `?available=true` (unredeemed **and** unexpired — what a purchase form should offer). Never returns another athlete's rows, and takes no `vpfId` param.

Admin-facing, `requireAdmin`:

- **`POST /api/vouchers`** — issue a voucher to an athlete. Body: `vpfId`, `type`, `discountKind`, `discountValue`, `expiresAt`, optional `note`. Server generates `code` and sets `createdBy` from the admin. Validate with a Zod schema in [lib/zod/schemas/](../lib/zod/schemas/) (`voucher.schema.ts`), mirroring the `discountValue` range check from §1 so the error is a 400 rather than a DB constraint violation.
- **`DELETE /api/vouchers/[code]`** — revoke. **Only when unredeemed** — a redeemed voucher is part of a purchase's price history and must not vanish; return 409. (The FK is `ON DELETE CASCADE` from `users`, so deleting an athlete still cleans up their vouchers.)

**No preview endpoint.** The frontend computes the live total with the shared `lib/utils/vouchers.ts` function from §2 against the vouchers it already fetched — no second copy of the fee math, no round-trip per keystroke. The server recomputes authoritatively at creation and its number wins.

Add tests to [test/api/](../test/api/) — `vouchers.test.ts` for the endpoints above, plus new cases in the existing `purchases.test.ts` and `competition-registration.test.ts` for redemption (§5). Per the [test harness](../memory/api-test-harness.md), these import handlers in-process against the seeded `TEST_DATABASE_URL`; add voucher fixtures to [test/fixtures/data.ts](../test/fixtures/data.ts).

## 5. Redemption and lifecycle

### Where vouchers are consumed

Both purchase-creating endpoints gain voucher input:

- **[POST /api/meets/[id]/register](../server/api/meets/[id]/register.post.ts)** — gains `voucherCodes`, a comma-separated string (the body is `multipart/form-data`, so it arrives as a text field). Up to one code per owed type. Extend `CompetitionRegisterSchema` in [competition-registration.schema.ts](../lib/zod/schemas/competition-registration.schema.ts) to split and validate it. This replaces the `amount` math at [register.post.ts:195-201](../server/api/meets/[id]/register.post.ts#L195-L201), which currently sums the fees directly; the `breakdown` in its response gains the discounts (§6).
- **[POST /api/purchases](../server/api/purchases/index.post.ts)** — gains an optional single `voucherCode` (this endpoint creates one-type purchases today).

### Redeeming atomically

Redemption happens **inside the same `db.transaction` as the purchase insert** — `register.post.ts` already opens one. After inserting the purchase:

```sql
UPDATE vouchers
   SET redeemed_purchase_id = $purchaseId, redeemed_at = now(), discount_applied = $discount
 WHERE voucher_id = $voucherId AND redeemed_purchase_id IS NULL
```

**Check the affected row count is 1, and roll back the transaction if it is not.** The `IS NULL` guard in the `WHERE` is what makes concurrent redemption safe: two simultaneous requests with the same code both pass the §3 read-time check, but only one `UPDATE` matches, and the loser rolls back its purchase rather than issuing a discounted QR against an already-spent voucher. This is the same shape as the `eq(purchases.status, "pending")` guard in [approve-purchase.ts:127](../server/utils/approve-purchase.ts#L127).

Re-validate expiry inside the transaction too — a request can sit long enough to straddle midnight.

### The rest of the lifecycle

- **`approvePurchase`** — **does nothing with vouchers.** The price was fixed at creation; `purchases.amount` is already the discounted amount, and re-checking a voucher at approval would let an expiry that lapsed between transfer and webhook retroactively raise a price the athlete already paid. Do not add voucher logic to [approve-purchase.ts](../server/utils/approve-purchase.ts).
- **[PATCH /api/purchases/[refCode]/cancel](../server/api/purchases/[refCode]/cancel.patch.ts)** — **releases** the voucher: set `redeemedPurchaseId`, `redeemedAt`, `discountApplied` back to `NULL` in the same transaction as the cancel. The athlete gets it back and can spend it elsewhere; expiry is re-checked at next use, so a voucher released after its date is simply dead. Without this, cancelling a purchase silently destroys the voucher.
- **`status = 'expired'`** — the `purchase_status` enum has an `expired` value that nothing currently sets. If a sweep is ever added to expire stale `pending` purchases, it **must release vouchers the same way cancel does**.

## 6. Frontend

Per the [frontend conventions](../memory/frontend-conventions.md): PrimeVue components, Tailwind utilities only (no `@apply`), and **every string in both `en` and `vi`**.

### Derived status

The athlete-facing status is computed, never stored — the demo page's three states map onto the columns from §1:

| Label (`profile.voucherTable.*`) | Condition |
| --- | --- |
| `used` — Đã sử dụng | `redeemedPurchaseId !== null` |
| `expired` — Hết hiệu lực | not redeemed **and** `expiresAt < today` |
| `active` — Còn hiệu lực | not redeemed **and** `expiresAt >= today` |

Checked in that order — a voucher redeemed before it expired reads **Used**, not Expired. Expose it as a `status` field on the `GET /api/vouchers` response so the ordering is decided once, on the server.

### Pages

- **[profile/voucher.vue](../pages/openvpf/profile/voucher.vue)** — swap `demoVouchers` for `GET /api/vouchers` via a `useFetch` composable in [composables/](../composables/), drop the `profile.demo` badge, and keep the existing columns. Render the discount as a human string (`-20%` / `-100.000₫` + the type) for the `voucherType` column. The `viewDetail` button currently calls `() => {}` — either wire it to a detail dialog showing `note` and, for used vouchers, the purchase it was spent on, or remove the column.
- **Registration wizard payment step** ([competitions/[slug]/register.vue](../pages/openvpf/competitions/[slug]/register.vue)) and the **VIP checkout** ([checkout.vue](../pages/openvpf/checkout.vue)) — a voucher picker per owed type, fed by `GET /api/vouchers?available=true&type=…`. Show the itemised total: subtotal, each discount as its own line, Media Plus (undiscounted), then the payable amount. Recompute live with the shared function from §2.
- **Admin** — a management page under [pages/openvpf/admin/](../pages/openvpf/admin/) (alongside `verifications.vue`) to issue and revoke, gated by the same admin route middleware.

When `payable === 0` (§2), the payment step must **skip the QR entirely** and show the success state — the purchase is already active by the time the response arrives.

## 7. Open questions

- ~~**Is a code even needed?**~~ **Resolved: `code` was kept**, as specified above — vouchers stay issuable over email/social and support has something to quote. The athlete-facing pickers never make anyone type one: they list the athlete's own vouchers and submit the code behind the scenes.
- **Souvenir vouchers** — the demo page shows "-20% for souvenir items", which no `purchase_type` covers. Out of scope here; it needs a new purchase type and a shop.
- **Stacking** — one voucher per type per purchase is specified. Two vouchers on the *same* line item is rejected by the §1 constraint. Confirm the federation does not want stacking.
- **`VIP_MEMBERSHIP_PLANS`** — both plans are still 300,000 VND ([constants.ts:27-36](../lib/constants/constants.ts#L27-L36)), so a `vip` percent voucher discounts a year and six months identically. That is a pre-existing question flagged in the [VIP purchase flow](vip-purchase-flow.md), not one this feature introduces.

## 8. Where the code differs from the design above

Two things the spec did not settle, decided during implementation:

- **`GET /api/vouchers/all` exists.** §4 defines no admin *list* endpoint, but the admin page needs one to revoke from. Rather than grow `GET /api/vouchers` a `vpfId` param — which §4 explicitly forbids, since that is the enumeration surface — admin listing lives at [all.get.ts](../server/api/vouchers/all.get.ts) behind `requireAdmin`, with `?vpfId=`, `?type=` and `?redeemed=` filters. `GET /api/vouchers` stays athlete-scoped.
- **`redeemedPurchaseId` is `ON DELETE CASCADE`.** §1 does not name the action. `SET NULL` would leave `redeemed_at` / `discount_applied` populated and violate `chk_voucher_redeemed_consistent`, so cascade is the only action consistent with that check. Purchases are cancelled rather than deleted in normal operation, so this only bites if a purchase row is hard-deleted — which also cascades from deleting the athlete, when the voucher should vanish anyway.

The discount math lives in one place, [lib/utils/vouchers.ts](../lib/utils/vouchers.ts): `resolveVouchers` returns a validated *rule*, and `computeVoucherTotals` is the only code that turns a rule into VND. The server reads the resolved lines back to freeze `discount_applied`; the pickers call the same function for the live total. Nothing else computes a discount.
