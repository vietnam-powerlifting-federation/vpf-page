# Database and Drizzle

Postgres accessed through Drizzle ORM. The schema is [lib/external/drizzle/migrations/schema.ts](../lib/external/drizzle/migrations/schema.ts) and the client is `db` from [lib/external/drizzle/drizzle.ts](../lib/external/drizzle/drizzle.ts), configured with `casing: "camelCase"` so TypeScript camelCase properties map to snake_case columns automatically.

**Never hand-edit the `.sql` files** in the migrations folder — drizzle-kit generates them from `schema.ts`. The one exception is `0019_user_id_primary_key.sql`: moving the primary key from `vpfId` to `userId` needs a backfill drizzle-kit cannot express, so its snapshot is generated and its SQL is written to reach that snapshot without losing any athlete link. A change that moves data rather than shape needs the same treatment: generate, keep the snapshot, rewrite the SQL, and check it against a populated database.

## Core tables

- **`users`** — the athlete. Primary key is `userId`, a random uuid; every other table references athletes by it (`user_id`, plus `reviewedBy` / `approvedBy` / `createdBy`). `vpfId` — `VPF` + six zero-padded digits from the `vpf_seq` sequence — is the unique **public** number: shown on results, typed at login, used in profile URLs and written into the LiftingCast `Member #` column. Responses that carried `vpfId` still do, joined from `users`; request bodies that name an athlete take `userId`. Holds auth fields (password hash, role, `emailVerified`, verification and reset codes), profile fields, and the two membership expiries `vpfMembershipExpiresAt` and `vipMembershipExpiresAt`. Note that `dob` is a **year** (smallint), not a date.
- **`meets`** → **`meet_results`** and **`legacy_meet_results`**, both unique on `(meetId, userId)`. `meet_results` stores all nine individual attempts (`squat1..3`, `bench1..3`, `deadlift1..3`); `legacy_meet_results` stores only `bestSquat` / `bestBench` / `bestDeadlift` for historical meets. Any query that spans history has to handle both shapes.
- **`vip_benefits`** — per-athlete VIP customization: avatar, up to five banners, alias, social links (each with its own `display*` boolean), and the two gradient colors `decorator1` / `decorator2`.
- **`identity_verifications`** — one row per athlete (unique on `userId`), status `pending` / `approved` / `rejected`.
- **`purchases`** plus one metadata table per type: `vip_purchase_metadata`, `vpf_membership_purchase_metadata`, `competition_purchase_metadata`.

Check constraints in the database enforce the weight-class/sex pairing, so an invalid combination fails at insert rather than silently storing.

## The query layer

Handlers rarely write raw queries. Shared read logic lives in [lib/utils/queries/](../lib/utils/queries/):

- `queries.ts` — `getMeetsAndResultsAndAthletes()`, the workhorse that joins meets, results (both tables), and athletes with optional filters.
- `records.ts` — national-record computation.
- `results.ts` — sorting, personal bests, distinct filtering.
- `users.ts` — the `userPublicSelect` / `userPrivateSelect` column sets that keep the password hash and PII out of public responses. Use them instead of `select()`.
