# Specs

One document per **feature or flow** — how a particular thing works end to end, and why it works that way. Whether it is built yet is a property of the feature, not of where the document lives: a spec is written before the code, then kept as the record of intent after it ships.

The split against [memory/](../memory/) is scope, not tense:

- **specs/** — one feature each. Answers *"how does competition registration work?"*. Read the spec for the intent, the flowchart rules, and the Vietnamese UI copy; read the code for current behaviour.
- **memory/** — cross-cutting architecture and conventions that no single feature owns. Answers *"how do endpoints return errors?"* or *"how do I write a test?"*.

Rule of thumb: if the document would be obsoleted by deleting one feature, it is a spec. If deleting any one feature would leave it standing, it is memory.

| Spec | What it covers | Status |
| --- | --- | --- |
| [VIP purchase flow](vip-purchase-flow.md) | VietQR bank transfer, SePay webhook, `approvePurchase` as the single activation point, VIP perks and R2 uploads | Built |
| [Registration & identity verification](identity-verification.md) | Account lifecycle: signup, email verification, CCCD submission, admin review, the `identityVerified` flag | Built |
| [Competition registration flow](competition-registration-flow.md) | Registration wizard: identity gate, ban-list checks, member vs guest, entry details, add-ons, combined payment | Built — doc still says otherwise, see below |
| [Voucher system](voucher-system.md) | Per-athlete single-use discount vouchers: per-type line items, fixed/percent math, redemption and release | Built |

## Stale: competition registration says it is unbuilt

[competition-registration-flow.md](competition-registration-flow.md) opens with "not yet implemented … there is no registration endpoint under `server/api/`". That stopped being true in commit `171d07b`, which added [server/api/meets/[id]/register.post.ts](../server/api/meets/[id]/register.post.ts), [registration.get.ts](../server/api/meets/[id]/registration.get.ts), [server/utils/competition-registration.ts](../server/utils/competition-registration.ts), and migration `0015_competition_registration.sql`.

The **design** in that doc is still the reference — only its claim about implementation status is wrong. Its §0 ("data model changes this feature introduces") is likewise a description of changes that have already landed.
