# Admin tools

The federation-side console: everything VPF staff need to run the site that athletes cannot do themselves. **Built**, in the order §10 sets out — the shell, meet CRUD, the LiftingCast CSV round trip, athlete administration, violations and bans, finance and voucher polish. §1.3 (scoped roles) and §1.4 (audit log) remain deliberately unbuilt, for the reasons given there. This document is the design, the prioritised build order, and the record of *why* each tool exists; where it says "would" or "must", read it as the reason the code looks the way it does.

Throughout, "user" = athlete. Amounts are VND integers. Admin-facing UI copy is given in Vietnamese where it is shown to athletes verbatim.

**VPF does not run meets on this site — [LiftingCast](https://liftingcast.com) does.** That single fact shapes §3 and §6: this site owns registration, payment and the public record; LiftingCast owns the platform, the clock and the referee lights. The two exchange CSV in both directions, and the admin console's job at meet time is to hand LiftingCast a clean start list and to take its results back. There is no lifting console, no attempt grid and no live board here.

Sections §2–§6 are each large enough to graduate into their own spec when built; this document is the map, and the row in [README.md](README.md) points here until they split.

## 0. What exists today

The audit that motivated this document, with what closed each gap. Every table in [schema.ts](../lib/external/drizzle/migrations/schema.ts), against whether application code writes it:

| Table | Written by app | Closed by |
| --- | --- | --- |
| `users` | yes — self-service, verification approval, **and admin edit** | [athletes/[id]/index.patch.ts](../server/api/athletes/[id]/index.patch.ts) (§4.1) |
| `identity_verifications` | yes | [review.patch.ts](../server/api/verifications/[id]/review.patch.ts) (§4.4) |
| `purchases`, `*_purchase_metadata` | yes, and now **listable** | [purchases/all.get.ts](../server/api/purchases/all.get.ts) (§7) |
| `vouchers` | yes, plus edit and bulk issue | [index.patch.ts](../server/api/vouchers/[code]/index.patch.ts), [bulk.post.ts](../server/api/vouchers/bulk.post.ts) (§8) |
| `vip_benefits` | yes (athlete self-service) | — |
| `meets` | yes | [index.post.ts](../server/api/meets/index.post.ts), `[id]/index.patch.ts`, `[id]/index.delete.ts`, `[id]/clone.post.ts` (§2) |
| `meet_results` | yes — LiftingCast import only | [liftingcast-import.ts](../server/utils/liftingcast-import.ts) (§3) |
| `legacy_meet_results` | **still never** | Deliberate: closed historical data, SQL-only (§3.7) |
| `teams` | yes — created by the importer | [liftingcast-import.ts](../server/utils/liftingcast-import.ts) (§3.3) |
| `meet_entries` | yes — new table | [entries/](../server/api/meets/[id]/entries/) (§6) |
| `user_violations` | yes | [violations/](../server/api/violations/) (§5.1) |
| `competition_ban_list` | yes | [ban-list/](../server/api/meets/[id]/ban-list/) (§5.3) |

The two structural gaps:

- **The admin pages were unreachable.** Fixed by [openvpf-admin.vue](../layouts/openvpf-admin.vue) plus the role-gated entry in [OpenVPFHeader.vue](../components/OpenVPFHeader.vue) (§1.1).
- **There is still no audit trail.** Accountability remains three ad-hoc columns plus the server log, which every mutating admin handler writes to with the actor's `vpfId` and, for destructive actions, a required reason. See §1.4 for why the table is not built yet.

## 1. The console shell

### 1.1 Layout and navigation

A new `layouts/openvpf-admin.vue` alongside the existing [openvpf.vue](../layouts/openvpf.vue), with a persistent sidebar. Pages keep `middleware: "admin"` ([middleware/admin.ts](../middleware/admin.ts) already verifies the role server-side via `/api/auth/session`, so the guard is done — only the shell is missing).

Nav groups, mirroring this document: **Meets** (meets, entries, results import) · **Athletes** (athletes, verifications, violations, bans) · **Money** (purchases, vouchers).

The athlete-facing nav gains a single **Admin** entry, rendered only when `role === "admin"` (read from `useAuthSession`).

### 1.2 Dashboard — the queue, not the graph

The landing page is an **action queue**, not analytics. Staff open it to find out what is waiting on them:

- Identity verifications pending review (count → §4.4)
- Purchases `pending` older than 24h — someone transferred and was never matched, or never paid (§7)
- Meets whose `hostDate` has passed with zero `meet_results` rows — **results not imported yet** (§3)
- Meets whose `closeRegistration` is within 7 days
- Meets with paid registrations but no generated entries (§6)

Each row links straight into the tool with the filter pre-applied. Vanity metrics (total athletes, revenue charts) go below the fold or not at all.

### 1.3 Roles

`roles` is currently `["user", "admin"]` — one bit. A federation realistically separates:

| Role | Needs |
| --- | --- |
| Meet director | meets, entries, results import |
| Registrar | verifications, athletes, violations, bans |
| Finance | purchases, vouchers |
| Super admin | all of the above, plus roles |

**Verdict: do not build this yet.** Extending the enum is cheap later; guessing the boundaries now while there is one admin is not. Build every endpoint behind `requireAdmin` and keep the permission check in one call site per handler, so a `requirePermission(event, "results:write")` can replace it mechanically. Revisit when VPF has more than about three staff accounts.

What *is* needed now: an admin cannot currently promote another admin without SQL. Fold `role` into the athlete edit form (§4.1) behind a confirmation, and forbid demoting yourself.

### 1.4 Audit log

New table. Meet results, violations and ban-list entries are **contestable** — an athlete will eventually ask "who disqualified me, and when".

```ts
export const adminAuditLog = pgTable("admin_audit_log", {
  id: serial().primaryKey().notNull(),
  actorVpfId: text("actor_vpf_id").notNull(),   // FK → users, onDelete set null
  action: text().notNull(),                      // "results.import", "violation.create", …
  entityType: text("entity_type").notNull(),     // "meet", "user_violation", …
  entityId: text("entity_id").notNull(),         // stringified PK (uuid or serial)
  before: jsonb(),                               // null on create
  after: jsonb(),                                // null on delete
  note: text(),                                  // admin's reason, required for destructive actions
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
})
```

Written by a single `server/utils/audit.ts` helper — `await recordAudit(event, { action, entityType, entityId, before, after, note })` — called inside the same transaction as the mutation it describes. Indexed on `(entityType, entityId)` for "history of this row" and on `createdAt` for the global feed.

Retrofit the three existing ad-hoc columns? No — leave them, they are denormalised fast reads. The log is additive.

**Verdict: do not build this yet.** But note that a results import (§3) replaces a whole meet's public record in one action, which is exactly the case this table exists for. If the log is ever built, that is the first call site.

## 2. Meet management

`meets` has no write path. Every meet on the site was inserted by hand.

**Pages:** `pages/openvpf/admin/meets/index.vue` (list) and `meets/[id].vue` (create/edit).

**API:** `POST /api/meets` · `PATCH /api/meets/[id]` · `DELETE /api/meets/[id]`. Note [/api/meets/index.ts](../server/api/meets/index.ts) currently filters `hidden = false` unconditionally — the admin list needs hidden meets, so add an `includeHidden` query param honoured only for admins (same shape as the admin branch in [athletes/index.ts](../server/api/athletes/index.ts)).

Fields, and what staff must understand about each:

| Field | Notes |
| --- | --- |
| `meetName`, `city`, `mediaLink` | Free text |
| `meetSlug` | The public URL. **See §11.1 — it has no unique constraint.** Auto-derive from name, allow override, validate uniqueness in the handler until the constraint lands |
| `hostDate` | Drives dashboard "results missing" and record chronology |
| `startRegistration` / `closeRegistration` | The window `isRegistrationOpen` checks ([competition-registration.ts](../server/utils/competition-registration.ts)). Either being null means "open on that side" — the form must say so, not render an empty date box |
| `systemYear` | **The record-eligibility year** ([records.ts](../lib/utils/queries/records.ts) derives an athlete's division from `systemYear - dob`). Defaults from `hostDate` but stays editable, because a January meet may belong to the previous season |
| `type` | `meetType` enum; feeds the results-page filters |
| `entryFee` | VND, nullable. Nullable reads as 0 in the registration fee calc — the form should treat "free" as an explicit 0 |
| `hidden` | The publish switch. Hidden meets vanish from `/api/meets` and 404 on registration |
| `allowGuestRegistration` | Off ⇒ member-only meet |
| `allowSpotterRegistration` | Shows the "register as spotter" button on [competitions/index.vue](../pages/openvpf/competitions/index.vue), but `handleSpotterRegistration` just navigates to the meet page — the same as clicking the row. The flag is live, the flow behind it is a stub (§12.8) |
| `legacy` | Picks which results table backs the meet (§3.7). Effectively immutable once results exist; lock it in the UI |

**Clone from previous year** — one button that copies everything but dates, slug and `systemYear`. Annual meets are near-identical year to year and this is where hand-written SQL gets copy-pasted wrong.

**Deletion:** `meets` cascades to results, ban list and competition purchase metadata. A hard delete silently destroys paid registrations. Offer `hidden = true` as the default action, and gate real deletion on "no results and no purchases exist", with a reason recorded.

## 3. Results import

Results enter the system **exclusively as a LiftingCast results CSV export**. There is no manual results editor, no attempt grid and no weigh-in screen — LiftingCast is the system of record during the meet, and this site's job is to ingest its output faithfully.

The whole tool is three steps on one page (`pages/openvpf/admin/meets/[id]/results.vue`):

1. **Import** — pick a CSV.
2. **Preview** — a table of exactly what will change, with errors and warnings per row. Nothing has been written yet.
3. **Confirm** — one transaction, then the records cache is invalidated (§3.6).

That minimalism is the design, not a first cut. Every field in `meet_results` is present in the LiftingCast export, so a hand-editing path would only ever be a way to make the site disagree with the meet's official record. The correction path is **re-import**: fix it in LiftingCast, re-export, re-import. §3.5 covers why that is safe.

### 3.1 The CSV

71 columns. Grouped by what the importer does with each:

**Stored** — these become the `meet_results` row:

| CSV column | Column | Notes |
| --- | --- | --- |
| `Gender` | `sex` | Map to the `sexes` enum. Reject anything unmappable — the DB check constraint ties weight class to sex |
| `Team` | `teamId` | Resolved by name against `teams`; see §3.3 |
| `Lot` | `lot` | smallint |
| `Platform`, `Session`, `Flight` | `platform`, `session`, `flight` | Free text, round-tripped from the export (§6) |
| `Awards Division` | `division` | Free text upstream, enum here. See §3.2 |
| `Body Weight (kg)` | `bodyWeight` | numeric(5,2). Drives the DQ check in §3.4 |
| `Weight Class` | `weightClass` | Integer, validated against `WEIGHT_CLASS_MALE` / `WEIGHT_CLASS_FEMALE`. See §3.2 |
| `Squat 1..3`, `Bench 1..3`, `Deadlift 1..3` | `squat1..3`, `bench1..3`, `deadlift1..3` | The nine attempts. See §3.4 on signs |

**Matching only** — identify the athlete, never written:

`Member #` · `Name` · `Birth Date`. See §3.3.

**Cross-check, not stored** — VPF derives all of these itself, so the importer compares instead and treats a mismatch as a loud warning:

`Best Squat` · `Best Bench` · `Best Deadlift` · `Subtotal` · `Total` · `Place`.

This is the most valuable thing in the file. Recomputing best lifts from the attempts and finding LiftingCast agrees proves the attempts were parsed and signed correctly; finding it disagrees means the import is wrong in a way no other check would catch. A `Place` mismatch likewise flags a division or weight-class mapping error, because placement is computed within `(sex, division, weightClass)`.

**Ignored** — VPF computes its own or already holds the data:

All eleven points columns (`Dots`, `Wilks`, `IPF`, `Glossbrenner`, `Schwartz Malone`, and their age-adjusted variants), `Wilks Coef`, `Age Coef`, `Exact Age`, `Division Based Age`, `State/Province`, `Country`.

Note that **none of the CSV's points columns are GL points.** VPF ranks on IPF GL points via `calculateGLPointsRaw` ([meet-result.ts](../lib/utils/meet-result.ts)) and computes them from total and bodyweight at read time. `IPF Points` is the older IPF formula and `Glossbrenner` is a different coefficient set entirely — importing either into a GL field would silently corrupt every ranking. Take none of them.

**No schema home** — flagged, not stored:

- `Raw/Equipped` — **there is no equipment column anywhere in the schema.** If VPF only sanctions raw lifting this is harmless and the importer should reject non-raw rows rather than silently merge them into the same rankings. If VPF runs equipped divisions, results and records are wrong today and a column is needed. Blocking question, §12.2.
- The 27 referee-light columns (`S1LRef` … `D3RRef`, three lifts × three attempts × left/head/right). No storage, and none needed for rankings — but they are a second independent signal for §3.4, so the importer reads them even though it stores nothing.

### 3.2 Mapping the two enums

`Awards Division` and `Weight Class` are the only fields where LiftingCast's free text meets a constrained VPF column.

**Division.** LiftingCast division names are whatever the meet director typed — "Open", "Raw Open Men", "Masters 1", "Sub-Junior". VPF's enum is `subjr | jr | open | mas1..mas4 | guest`. Put a normalised lookup (lowercased, punctuation stripped) in `lib/constants/`, and make an unmapped value a **blocking error naming the exact unrecognised string**. Do not guess, and do not build an interactive mapping UI: the right fix is to correct the division names in LiftingCast and re-export, which keeps the two systems' vocabularies converging instead of drifting behind a translation layer.

Note `RANKED_DIVISION` excludes `guest`, so guest-division rows should import with `ranked = false`.

**Weight class.** VPF stores plain integers with **999 as the unlimited-class sentinel** (`120+` for men, `84+` for women). LiftingCast may render a class as `74`, `-74`, or `120+`. Parse by stripping a leading `-` and mapping a trailing `+` to 999, then validate the result against the sex's array. An invalid pair is a blocking error — the DB check constraint would reject the insert anyway, and failing in the preview is far kinder than failing mid-transaction.

### 3.3 Matching athletes

`meet_results` is `unique(meetId, vpfId)`, so every row must resolve to exactly one athlete.

Match on **`Member #` first** — the export in §6 writes `vpfId` into that field precisely so results come home unambiguously. Fall back to `Name` + `Birth Date` year, and treat any name-only match as **needing manual confirmation in the preview**, never as automatic. Unmatched rows are blocking errors; the preview lists them with a search box to bind each to a VPF id, and rows can be skipped individually (a guest lifter from another federation may have no account).

`Birth Date` is only usable to the year: `users.dob` is a `smallint` year, not a date (§6.4).

**Teams.** `teams.teamName` is unique and nothing in the app writes the table, so the importer creates missing teams by name inside the same transaction, and the preview shows *"will create team X"* explicitly. Team administration — renaming, merging the inevitable "VPF Hanoi" / "VPF Hà Nội" pair — is out of scope here; until it exists, a typo in LiftingCast becomes a new team row, which is the one place this importer can quietly make a mess. Worth a follow-up.

### 3.4 Failed attempts, and how the CSV settles the sign question

`meet_results` stores attempts as signed `numeric(5,2)`, and **failed attempts appear to be negative** — `calculateBestLift` takes `Math.max(...values, 0)`, so a negative can never become the best lift and three failures collapse to 0, which `isDisqualified` treats as a DQ. But nothing documents this and no fixture exercises it ([test/fixtures/data.ts](../test/fixtures/data.ts) uses successful lifts and nulls only), so the alternative — failures stored as `null` — is not ruled out by the code alone.

**The CSV resolves it empirically.** LiftingCast exports both the signed attempts and its own `Best Squat` / `Best Bench` / `Best Deadlift`. So the importer asserts, per row and per lift:

```
max(positive attempts, 0) === Best <Lift>
```

If that holds across a real export, negative-means-failed is confirmed and the attempts can be stored verbatim. If it does not, the parser is wrong and the import must **hard-fail rather than write** — a silently mis-signed import turns successful lifts into disqualifications across a whole meet. The referee columns are the corroborating signal: three whites on `S1LRef`/`S1HRef`/`S1RRef` and a negative `Squat 1` would be a contradiction worth stopping for.

**This check has been run and it holds.** A real export — the 2026 national qualifier, HCMC, session 2 day 2, 20 lifters — parses with zero errors and zero warnings: every best lift, subtotal, total and placement agrees with LiftingCast's own. §12.1 is answered: **a failed attempt is a negative weight, and an attempt never taken is blank.** `crossCheckBestLifts` in [liftingcast-csv.ts](../lib/utils/liftingcast-csv.ts) keeps the assertion live on every future import.

One wrinkle the real file exposed: when an athlete bombs a lift, LiftingCast leaves `Best <Lift>` **blank** rather than writing 0, and zeroes `Total`. The check reads a blank best as 0 whenever any attempt was taken.

**The bodyweight trap.** `isDisqualified` DQs an athlete whose bodyweight falls outside the entered class (`bodyweight > previousClass && bodyweight <= thisClass`). A LiftingCast row with 74.5 kg against the 74 class disqualifies that athlete with no error anywhere — the row imports fine and the athlete drops off the rankings. The preview must therefore show **derived state per row** — best lifts, total, GL points, computed placement, and a prominent DQ badge with its reason ("bodyweight 74.5 outside class 74", "no successful bench"). A preview that only echoes the CSV back would let this through, which is the single most important reason the preview step exists.

### 3.5 Preview, confirm, and idempotency

**API:**

- `POST /api/meets/[id]/results/import` — multipart CSV. Parses, matches, maps, computes derived values, **writes nothing**, and returns the per-row diff plus a checksum of the parsed content.
- `POST /api/meets/[id]/results/import/confirm` — the same file plus that checksum. The server re-parses and refuses if the checksum differs, so what is committed is provably what was previewed. One transaction.

Both share one parser in `server/utils/liftingcast-import.ts`, which takes the file bytes and returns a fully-resolved diff — no `db` writes, no H3 dependency, so it is directly unit-testable against fixture CSVs.

The preview table is one row per CSV line: matched athlete, then per-field **new / changed / unchanged**, the derived block from §3.4, and any errors or warnings. Blocking errors disable the confirm button; warnings do not. Rows already in `meet_results` and absent from the CSV are shown as **will be deleted** — a withdrawn lifter must actually disappear.

**Idempotency matters more than it looks.** Meets get re-exported after corrections, so importing the same file twice must be a no-op and importing a corrected file must converge. Write as an upsert on `(meetId, vpfId)` — the existing unique constraint — plus a delete of rows the CSV omits. That makes the import a **declarative replace of the meet's results**, which is both easy to reason about and the reason §1.4 names it as the first thing an audit log should cover.

Two VPF-only columns have no CSV source and must survive a re-import: `ranked` and `showOnProfile`. Default them on insert (`ranked` from the guest-division rule in §3.2) and **preserve the stored value on update** rather than resetting it — otherwise an admin's deliberate un-ranking is undone by the next import. Toggling those two per row is the one editing capability worth adding later.

### 3.6 Cache invalidation

Records are served through [server/service/records.ts](../server/service/records.ts) and cached in Redis for a day. **Importing results would therefore not change the public records page for up to a day** — so confirming an import calls `invalidatePublicData` ([service/cache.ts](../server/service/cache.ts)), which clears the cached meets, records and results together. Without it staff import, see nothing change, and import again — which is exactly what happened the first time the round trip was run end to end.

The dashboard also carries a manual "rebuild records cache" button, for when the data is corrected some other way — directly in the database, say.

An import is one of only two places that invalidate eagerly; every other write waits for the day's expiry. See [the Redis caching spec](redis-caching-spec.md).

`/api/records` used to add `Cache-Control: max-age=86400` on top of this. That header is gone: a *browser* copy cannot be reached by the invalidation above, so it stacked on the server-side day and pushed the worst case for a returning visitor to nearly two days.

**A caching hazard worth knowing about.** `/api/meets/**` and `/api/results` used to carry cache route rules. A route rule is keyed on the request URL alone, with no notion of who asked — so once `/api/meets` grew an admin branch (`?includeHidden=true`) and admin-only sub-routes appeared beneath it (entries, ban list), that rule would have stored an admin's response and replayed it to anyone requesting the same path. Narrowing it with `cache: false` exclusions is **not** a fix: Nitro compiles a cache route rule into its own handler entry in the route table, and the resulting entry shadowed every real handler under `/api/meets/`, 404-ing them all. There are no cache route rules any more; caching lives in `server/service/`, where the code that caches a response is the code that knows whether it is public.

### 3.7 Legacy meets

`legacy_meet_results` stores `bestSquat` / `bestBench` / `bestDeadlift` only — no attempts — for meets predating attempt-level records. `meets.legacy` selects the table.

These meets predate LiftingCast, so there is no CSV to import and this table is effectively **read-only historical data**. If a legacy result ever needs correcting, do it in SQL; building an editor for a closed set of past meets is not worth it. The importer should refuse a meet with `legacy = true` outright, with a clear message, rather than half-mapping into the wrong table.

## 4. Athlete administration

### 4.1 Editing athletes

[athletes/[id]/index.patch.ts](../server/api/athletes/[id]/index.patch.ts) rejects any id but `"self"` outright. Admins have no write path to `users` at all. Needed, in rough order of how often staff will reach for it:

| Field | Why |
| --- | --- |
| `drugViolate` | **A doping ban is a registration gate** (`evaluateBanGates`) with no UI. Setting it currently requires SQL. Needs a mandatory reason, and it should arguably be a dated record rather than a boolean (§11.2) |
| `vpfMembershipExpiresAt` / `vipMembershipExpiresAt` | Corrections, comps, goodwill extensions. `null` on the VIP column means *permanent* VIP (`isVipActive`) — the form must not let that be set by accident |
| `fullName`, `dob`, `nationalId`, `nationality`, `address`, `phoneNumber` | Verification approval copies these from the CCCD form; typos there are currently permanent. These also feed the LiftingCast export (§6.3) |
| Rack heights (`squatRackPin`, `benchRackPin`, `benchSafetyPin`, `benchFootBlock`) | Exported to LiftingCast (§6.3); athletes set them but staff correct them at weigh-in |
| `notes` | The column exists and is written by nothing. Staff scratchpad per athlete |
| `role` | See §1.3 |
| `slug` | Unique (`members_slug_key`), and the public profile URL. Regenerate on name change, warn that old links break |
| `email` | Unique. Changing it should force `emailVerified = false` |

Editing identity fields must **not** silently desync `identityVerified` — that flag's invariant is maintained in exactly one place today ([identity-verification.md](identity-verification.md)). Admin edits to name/DOB/CCCD are corrections to an approved record, so leave the flag alone.

### 4.2 The athlete list is unusable for admin

[athletes/index.ts](../server/api/athletes/index.ts) filters every response through `vpfMembershipActive`. Admins therefore **cannot see lapsed members** — the exact population they need for renewals, and for finding the account of someone whose membership expired. Add an admin-only `includeInactive` param, plus server-side search (VPF id, name, email, national id), pagination, and filters on membership status, `identityVerified`, `emailVerified`, `drugViolate`, `role`.

### 4.3 Merging duplicate accounts

Real and recurring: `vpfId` comes from a sequence, `legacyEmail` exists as a column, and nothing stops an athlete registering twice. Duplicates split a competition history across two profiles and break records.

A merge tool repoints `meet_results`, `legacy_meet_results`, `meet_entries`, `purchases`, `vouchers`, `user_violations` and `competition_ban_list` from the loser to the winner, then deletes the loser. The hazard is `unique(meetId, vpfId)` on both results tables and on `meet_entries` — if both accounts have a row for the same meet, the merge must stop and ask which to keep. Preview first, transaction, no exceptions.

### 4.4 Verifications (built, gaps)

Working today. Two gaps worth noting:

- `identity_verifications` is `unique(vpfId)` — one row per athlete. A resubmission **overwrites** the previous status and review note, so a rejection reason is lost once the athlete resubmits.
- No bulk approve, and no filter by submission age.

## 5. Violations, doping and ban lists

Three gates in `evaluateBanGates` decide whether an athlete may register. **None of the three tables behind them can be written by the application.**

### 5.1 Violation registry

`user_violations` is many-rows-per-athlete, and the athlete's *level is the row count* still in force: `expireYear >= meet.systemYear`, or `expireYear IS NULL`. Level ≥ 2 blocks registration; level 1 lets the athlete continue but requires a written pledge and a fine ([competition-registration-flow.md](competition-registration-flow.md) §2).

CRUD at `pages/openvpf/admin/violations.vue`, with `note` and `expireYear`. Two things the UI must make explicit:

- **`expireYear` null means the violation never expires.** A blank field here is a permanent sanction, which is not what "blank" usually implies. Label it, default it to something finite, and confirm on null.
- **Show the resulting level and its consequence as you type** — "this athlete moves to level 2 and will be blocked from all 2026 meets". The count-based rule is not obvious from a list of rows.

The level-1 pledge-and-fine step is currently handled by a manual email. Worth tracking as a status on the violation row rather than living in someone's inbox (§12.6).

### 5.2 Doping

`users.drugViolate` — see §4.1. A boolean is a blunt instrument for a sanction that is normally time-limited; §11.2 asks whether it should become a dated record.

### 5.3 Competition ban list

`competition_ban_list` is per-meet exclusion with a free-text `reason`, and that reason is shown to the athlete **verbatim** in the block popup. Managed from the meet page (§2) rather than a global screen, since it is meet-scoped.

The UI must preview the exact rendered copy, because the admin is authoring public-facing Vietnamese inside a data field:

> **Vận động viên A** nằm trong danh sách không được đăng ký **giải B**. Lý do: {reason}. Nếu phát hiện nhầm lẫn, vui lòng liên hệ VPF tại đây.

Real reasons look like "đã giành HCV hạng cân 74 tại giải đấu X" — this list is used for "already qualified, cannot re-enter" as much as for discipline, so avoid framing the screen as punishment. `unique(meetId, vpfId)` means re-banning is an edit, not an insert.

## 6. Entries and the LiftingCast export

The outbound half of §3. There is no `registrations` table — **a registration *is* a purchase** with `'competition'` in `purchases.type` plus a `competition_purchase_metadata` row — and nothing surfaces that to staff, let alone hands it to LiftingCast.

The flow, end to end:

```
competition_purchase_metadata   (what the athlete paid for)
            ↓  generate
       meet_entries             (the start list: session, flight, platform, lot, openers)
            ↓  export CSV
        LiftingCast             (runs the meet)
            ↓  results CSV → §3
        meet_results            (the public record)
```

### 6.1 Why an intermediate table

Assignments cannot live on either end of that chain:

- **Not on `competition_purchase_metadata`.** That row is a **payment record**: it is what the athlete bought, at the price they were charged, and it is referenced by voucher redemption. Overwriting its weight class because a lifter cut weight, or because the awards division was reassigned, rewrites financial history to record a logistics decision.
- **Not on `meet_results`.** Rows there are public. A `meet_results` row with null attempts computes as a disqualification (`bestSquat === null` → DQ), so pre-creating the start list there would publish a meet full of DQ'd zero-total lifters before anyone lifted. It would also mean a results re-import (§3.5), which deletes rows absent from the CSV, could wipe the assignments.

So: a table that exists from "registration closed" to "results imported", owns the meet-day logistics, and holds the handful of LiftingCast fields VPF has nowhere else.

### 6.2 `meet_entries`

```ts
export const meetEntries = pgTable("meet_entries", {
  entryId: serial("entry_id").primaryKey().notNull(),
  meetId: integer("meet_id").notNull(),          // FK → meets, cascade
  vpfId: text("vpf_id").notNull(),               // FK → users, cascade
  purchaseId: integer("purchase_id"),            // FK → purchases; null for a door entry
  teamId: integer("team_id"),                    // FK → teams

  // Competition data, seeded from the purchase metadata then editable
  sex: sexes().notNull(),
  weightClass: integer("weight_class").notNull(),
  division: division().notNull(),

  // Assignment
  platform: text(),
  session: text(),
  flight: text(),
  lot: smallint(),

  // LiftingCast fields VPF has no other home for
  rawOrEquipped: text("raw_or_equipped").default("Raw").notNull(),
  wasDrugTested: boolean("was_drug_tested").default(false).notNull(),
  squatOpener: numeric("squat_opener", { precision: 5, scale: 2, mode: "number" }),
  benchOpener: numeric("bench_opener", { precision: 5, scale: 2, mode: "number" }),
  deadliftOpener: numeric("deadlift_opener", { precision: 5, scale: 2, mode: "number" }),
  additionalItems: text("additional_items"),

  withdrawn: boolean().default(false).notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("meet_entries_meet_vpf_key").on(table.meetId, table.vpfId),
  // + the three FKs, and the same chk_weight_class_sex check as meet_results
])
```

`sex` / `weightClass` / `division` are **copies**, seeded from `competition_purchase_metadata` and then freely editable — that is the whole point of §6.1. Carry the same `chk_weight_class_sex` check constraint as `meet_results`, so an invalid pair cannot reach the export and fail on the way back in.

`withdrawn` rather than a delete: a withdrawal is a fact, it interacts with the purchase, and the row should stay visible to staff. Withdrawn entries are excluded from the export.

### 6.3 The export

`GET /api/meets/[id]/entries/export.csv` — 29 columns, in exactly this order:

| CSV column | Source |
| --- | --- |
| `name` | `users.fullName` |
| `team` | `teams.teamName` via `meet_entries.teamId` |
| `lot`, `platform`, `session`, `flight` | `meet_entries` |
| `birthDate` | `users.dob` — **year only**, see §6.4 |
| `memberNumber` | **`users.vpfId`** — this is the join key that brings results home in §3.3. Non-negotiable |
| `gender` | `meet_entries.sex`, rendered in LiftingCast's vocabulary |
| `rawOrEquipped` | `meet_entries` |
| `division` | `meet_entries.division`, reverse of the §3.2 mapping |
| `declaredAwardsWeightClass` | `meet_entries.weightClass`, 999 → `120+` / `84+` |
| `bodyWeight` | Blank — weigh-in happens in LiftingCast (§12.4) |
| `squatRackHeight` | `users.squatRackPin` |
| `benchRackHeight` | `users.benchRackPin` |
| `squat1`, `bench1`, `dead1` | The three openers on `meet_entries` |
| `wasDrugTested` | `meet_entries` |
| `phoneNumber` | `users.phoneNumber` |
| `country` | `users.nationality` |
| `streetAddress` | `users.address` — the whole address; see below |
| `city`, `state`, `zipCode` | Blank — no structured address exists |
| `email` | `users.email` |
| `emergencyContactName`, `emergencyContactPhoneNumber` | Blank — never collected (§12.5) |
| `additionalItems` | `meet_entries` |

Three mismatches worth stating plainly, because each is a silent data-quality loss rather than an error:

- **Rack heights: four columns in, two out.** `users` has `squatRackPin`, `benchRackPin`, `benchSafetyPin` and `benchFootBlock`; LiftingCast takes two. The bench safety pin and foot block have no target — fold them into `additionalItems` as text so the platform crew still gets them, rather than dropping them.
- **Address is one free-text field.** `users.address` maps to `streetAddress` whole; `city` / `state` / `zipCode` export empty. Fine for LiftingCast's purposes, but it means the export can never be a source of structured address data.
- **Emergency contact is not collected anywhere.** For a strength sport that is a genuine safety gap, not just a blank column (§12.5).

**The reverse-mapping rule:** every enum translation in the export must be the exact inverse of §3.2's import mapping, driven from the *same* constant. If the two drift, a meet exports as "Masters 1" and fails to import as `mas1`, and the failure surfaces days later with the results in hand. One table, two directions, one test asserting round-trip identity for every enum value.

### 6.4 Birth date is a year, not a date

`users.dob` is a `smallint` — a year. So is `identity_verifications.dob`. **VPF holds no full date of birth anywhere**, yet LiftingCast's `birthDate` drives its age and Masters-division calculations.

The export can only emit a year-derived placeholder (`YYYY-01-01`), which makes LiftingCast's `Exact Age`, `Age Coef` and age-adjusted points wrong for anyone whose birthday falls after the meet. VPF's own logic is unaffected — divisions come from `systemYear - dob` ([records.ts](../lib/utils/queries/records.ts)) and the importer ignores every age column (§3.1) — so this is tolerable for a meet with no Masters awards and quietly wrong for one with them.

Fixing it means collecting a real date at identity verification and adding a column. Worth doing before the first Masters-heavy meet; see §12.3.

### 6.5 The entries screen

`pages/openvpf/admin/meets/[id]/entries.vue`:

- **Generate** — `POST /api/meets/[id]/entries/generate` creates one row per athlete with an `active` competition purchase for the meet, seeded from `competition_purchase_metadata`. Idempotent: re-running adds newly-paid athletes without disturbing existing assignments. This is the dashboard's "paid registrations but no entries" action (§1.2).
- **Roster table** — athlete, VPF id, sex/class/division, payment status, media plus, rack heights, openers, and the assignment columns. Counts per weight class and division, which is what session planning needs.
- **Assign** — `PATCH /api/meets/[id]/entries/[entryId]`. Auto-assign sessions and flights by division and weight class, then adjust by hand. Bulk-set platform/session/flight for a selection.
- **Add a door entry** — an athlete who paid at the venue. Creates the entry and, separately, the purchase; [purchases/index.post.ts](../server/api/purchases/index.post.ts) already lets admins create a purchase against another athlete's `vpfId`, so most of that exists.
- **Withdraw** — sets `withdrawn`, excludes from export, and releases any voucher attached to the purchase (`voucher-helpers.ts` has the release logic).
- **Export** — the CSV above, plus a weigh-in sheet PDF (`jspdf` and `html2canvas-pro` are already dependencies).

Once results are imported, the entries screen becomes read-only history for that meet. Comparing `meet_entries` assignments against the `platform` / `session` / `flight` / `lot` that come back in the results CSV is a cheap consistency check worth showing — a divergence means the meet was re-organised on the day, which is useful to know and harmless.

## 7. Finance

### 7.1 There is no admin purchase list

[purchases/index.get.ts](../server/api/purchases/index.get.ts) filters to `currentUser.vpfId` with no admin branch. Meanwhile [approve.patch.ts](../server/api/purchases/[refCode]/approve.patch.ts) approves *by ref code*. So manual approval today requires the admin to already know a six-digit code that only exists in the athlete's own view or the database.

`GET /api/purchases/all` (mirroring `vouchers/all.get.ts`): filter by status, type, date range, athlete, meet; search by ref code; show the athlete, the resolved line items, applied vouchers, and `approvedBy`.

### 7.2 Reconciliation

The core finance job is matching bank transfers to purchases. The list needs a **pending, ordered by age** view — with the amount, the expected memo (`VPF<refCode>`), and one-click approve/cancel with a note. Approval goes through `approvePurchase` and nothing else ([vip-purchase-flow.md](vip-purchase-flow.md)).

### 7.3 Reporting

Revenue by meet, by type, by month; entry-fee totals per meet against roster size; outstanding pending value. Export CSV. Low priority against everything above, but the federation will ask.

## 8. Vouchers (extend)

Built ([voucher-system.md](voucher-system.md)). Gaps:

- **No edit** — only create, list, delete. Fixing an expiry date means delete and recreate, which loses the code the athlete was already given.
- **No bulk issue** — issuing a Tết promotion to 200 athletes is 200 clicks. Needs multi-select athletes or "all with active membership", one shared code prefix, generated suffixes.
- **No usage view** — issued vs redeemed vs expired, and total discount given.

Redemption safety is already handled: [index.delete.ts](../server/api/vouchers/[code]/index.delete.ts) refuses a redeemed voucher with a 409 and repeats the check as an `IS NULL` predicate on the delete itself, closing the race between read and write. Preserve that behaviour if the delete path is touched.

## 9. Conventions for all of the above

Nothing here overrides the existing rules; this is the checklist.

- **Every handler** starts with `requireAdmin(event, { en, vi })` carrying a context-specific forbidden message, returns `ApiResponse` via `ok()` / `fail()` with bilingual messages, and never throws `createError`.
- **Tests** in `test/api/` per [the harness](../test/setup/globalSetup.ts) — in-process handler import against the seeded test database. Admin endpoints need three cases minimum: anonymous → 401, non-admin → 403, admin → 200. The CSV parser and both enum mappings additionally get pure unit tests against fixture files, including a round-trip assertion (§6.3).
- **Zod schemas** in `lib/zod/schemas/`, validated with `readZodBody`. Types in `types/`, never exported from `server/api/`. Note `types/attempts.ts` exists and is empty — the import row shapes are a reasonable home for it.
- **Schema changes** go in [schema.ts](../lib/external/drizzle/migrations/schema.ts) and the SQL is generated by drizzle-kit. Never hand-write a migration. `meet_entries` (§6.2) is the next new table.
- **PrimeVue + Tailwind only**, no `@apply`, no new Volt components. `DataTable` with lazy server-side paging for every admin list — the athlete list will not stay small. The import preview and entries roster are the two places a plain client-side `DataTable` is correct, since both are bounded by one meet's roster.
- **Bilingual UI**, keys under `admin<Thing>.*` matching the existing `adminVerifications` / `adminVouchers` convention. See §12.7 on whether Vietnamese should be the primary admin language.
- **Destructive actions** prefer soft delete (`hidden`, `withdrawn`, `ranked = false`, `showOnProfile = false`) over `DELETE`, and require a typed confirmation naming what is being destroyed. The results import is the exception — it is a declarative replace by design (§3.5) — which is exactly why its preview step is mandatory rather than a convenience.

## 10. Build order

Ranked by "how much breaks without it", not by size. All shipped except where noted.

| # | Tool | Status |
| --- | --- | --- |
| 1 | Admin shell + nav + dashboard (§1.1–1.2) | Built |
| 2 | Admin purchase list (§7.1–7.2) | Built |
| 3 | Athlete search, edit, doping flag (§4.1–4.2) | Built |
| 4 | Meet CRUD (§2) | Built, including clone and the guarded delete |
| 5 | Results import (§3) | Built, and validated against a real export |
| 6 | Entries + export (§6) | Built, with a round-trip test over every enum value |
| 7 | Violations + ban list (§5) | Built |
| 8 | Vouchers polish (§8) | Built — edit, bulk issue, usage stats |
| — | Finance reporting (§7.3) | **Not built.** Revenue by meet/type/month is the one item here nothing is blocked on |
| — | Merging duplicate accounts (§4.3) | **Not built.** Needs the preview-and-transaction design §4.3 sketches |

Note the dependency between §3 and §6 — the importer matches on `Member #`, which only contains a VPF id because the exporter put it there. Building §3 first is still right (it unblocks importing meets already run in LiftingCast, where `Member #` may be blank and name matching carries the load), but the pair should land in the same cycle.

## 11. Schema defects found while writing this

Independent of the admin tools; worth fixing regardless.

### 11.1 `meets.meetSlug` is not unique — **fixed**

`meetSlug` was `text NOT NULL` with no unique constraint, yet [/api/meets/[id]](../server/api/meets/[id]/index.ts) and `resolveMeet` both resolve it with `.limit(1)` and no ordering, so two meets sharing a slug made one unreachable non-deterministically. `unique("meets_slug_key")` landed in migration `0018_meet_entries.sql`; both databases were checked for duplicates first and had none. The meet form derives a free slug from the name and the handlers return a named 409 rather than letting the constraint surface raw.

### 11.2 `users.drugViolate` is an undated boolean

A doping sanction has a start and an end. As a boolean it can only be set and forgotten — and clearing it loses the fact it ever happened. Compare `user_violations`, which does model expiry.

### 11.3 No date of birth, anywhere

`users.dob` and `identity_verifications.dob` are both `smallint` years. See §6.4 — this is invisible until the export needs a real date.

## 12. Open questions

1. ~~**Failed-attempt encoding**~~ — **answered.** A failed attempt is a negative weight; an attempt never taken is blank. Confirmed against a real export, and asserted per row on every import (§3.4).
2. **Raw/Equipped** — does VPF sanction equipped lifting? The schema still has no equipment column, so equipped and raw results would share one ranking. **The importer currently rejects any row whose `Raw/Equipped` is not `RAW`**, with a blocking error naming the category — the safe reading, and the real export was raw throughout. If VPF does run equipped divisions, results and records are wrong today and a column is needed; until someone says so, a non-raw row fails loudly rather than merging silently.
3. **Date of birth** — collect a real date at identity verification, or accept year-only and live with wrong Masters ages in LiftingCast? Blocks §6.4, and matters most before the first meet with Masters awards.
4. **Weigh-in** — does bodyweight get recorded on this site or only in LiftingCast? The export currently sends `bodyWeight` blank and takes it back from the results CSV, which assumes the latter. If VPF weighs in on this site, `meet_entries` needs the column and the export needs to fill it.
5. **Emergency contact** — add it to competition registration so the export can carry it? A safety field, not a data-completeness one.
6. **Level-1 pledge and fine** — track as a status on the violation row, or keep it as a manual email? Affects §5.1.
7. **Admin UI language** — VPF staff are Vietnamese. Should the admin console be Vietnamese-first, with English as the secondary locale? The project mandates both, but the *primary* choice affects which copy gets written carefully.
8. **Spotter registration** — the `allowSpotterRegistration` button exists but leads nowhere. Is a spotter/volunteer flow planned? If so it needs its own spec, and staff need a spotter roster per meet.
9. **Staff count** — how many people will have admin accounts within a year? Decides whether §1.3 scoped roles are worth building.
