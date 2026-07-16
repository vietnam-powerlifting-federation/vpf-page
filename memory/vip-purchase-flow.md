# VIP purchase flow

VIP membership — and, through the same tables, VPF membership and competition entry — is paid by **Vietnamese bank transfer**, not a card processor.

1. `POST /api/purchases` creates a `purchases` row with status `pending`, a random unique six-digit `refCode`, and the amount from `VIP_MEMBERSHIP_PLANS`. It also writes the type-specific metadata row (for VIP, `vip_purchase_metadata.durationMonths`). It returns a **VietQR image URL** (`img.vietqr.io/...`) whose transfer memo is `VPF<refCode>`. Admins may pass another athlete's `vpfId`; regular athletes may not.
2. The athlete transfers the money. The bank notifies SePay, which calls `POST /api/webhook/sepay`. That handler extracts the ref code from the transfer content with `/VPF(\d{6})/i` and calls `approvePurchase(refCode, null)`. It **always returns `{ success: true }`** — failures are logged, never surfaced, so SePay does not retry.
3. Admins can approve manually with `PATCH /api/purchases/:refCode/approve`, or cancel with `/cancel`. Both go through the same function.

## Activation

[server/utils/approve-purchase.ts](../server/utils/approve-purchase.ts) is the single place that activates a purchase. It rejects anything not in `pending`, then extends `users.vipMembershipExpiresAt` **from the current expiry if that is still in the future, otherwise from today** — so stacking purchases adds time rather than resetting it.

Membership is considered active by `isVipActive` ([lib/utils/vip.ts](../lib/utils/vip.ts)), where a `null` expiry means permanent VIP.

> **Check before relying on this:** both `VIP_MEMBERSHIP_PLANS` entries — `"6months"` and `"1year"` — currently have `amount: 300_000`, so a year costs the same as six months. Confirm whether that is intentional.

## VIP perks

The perks are the `vip_benefits` row: custom avatar and banner images, alias, social links, and the two gradient `decorator` colors applied to the athlete's name and avatar ring across the site (`nameGradientStyle` in [lib/utils/client.ts](../lib/utils/client.ts), [components/athletes/AthleteAvatar.vue](../components/athletes/AthleteAvatar.vue)).

Images are uploaded server-side to **Cloudflare R2** through `uploadVipImage` ([lib/utils/r2-vip-upload.ts](../lib/utils/r2-vip-upload.ts)), which uses the S3-compatible API. The same uploader also stores identity-verification ID card photos.
