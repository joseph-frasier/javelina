# Design: Migrate Javelina Off Supabase to AWS (Dev Environment)

**Date:** 2026-08-19
**Status:** Approved design — pending implementation plan
**Branch:** `feat/aws-migration`
**Scope:** Dev environment only. Production cutover is a separate, later spec.

---

## 1. Goal

Replace Supabase entirely with AWS-hosted infrastructure for the Javelina **dev**
environment, and establish a migration history that can recreate the database from
zero, reliably and repeatably.

Two motivations, both stated by the project owner:

1. **No lasting split dependency.** If data storage moves to AWS, it should move
   completely rather than leaving a partial reliance on Supabase.
2. **Recreatable databases.** Standing up a fresh environment should be a routine
   command, not an archaeology exercise.

The dev migration is also a **deliberate rehearsal** for the production cutover.
Its output includes a hardened runbook so prod executes a tested procedure.

---

## 2. Current State (measured, not assumed)

Findings from a survey of `javelina` and `javelina-backend` on 2026-08-19.

### Supabase coupling

| Surface | Count | Notes |
|---|---|---|
| Backend PostgREST queries (`supabaseAdmin.from`) | 462 | Across 22 controllers |
| Backend RPC calls (`.rpc`) | 29 | 16 distinct Postgres functions |
| Frontend Supabase queries | **1** | `AddZoneModal.tsx:81` — documented debt |
| Frontend Supabase Storage | 2 | `AvatarUpload.tsx` (avatars bucket) |
| Backend GoTrue admin calls (`auth.admin.*`) | 6 | `adminController`, `stripeController` |
| Migrations referencing `auth.*` / RLS | 48 of 116 | Plus 4 out-of-band `manual-migrations/` |
| FKs referencing `auth.users` | 16 | Canonical identity is `public.profiles` |
| Tables | 52 | |
| Extensions | `vector` (pgvector) | Supported on RDS |

### Findings that materially reduce scope

- **RLS is already bypassed on every backend path.** `src/config/supabase.ts`
  defines both `supabaseAdmin` (service role) and `supabaseClient` (anon key), but
  `supabaseClient` is **never imported anywhere**. All 462 backend queries run as
  service role. RLS therefore guards only the single frontend query.
- **Auth0 already owns 100% of login.** The frontend has zero `supabase.auth.*`
  call sites. The claim in `CLAUDE.md` that legacy Supabase Auth persists in the
  frontend is **stale and should be corrected**.
- **Query complexity is low.** 445 `.eq()` against 362 `.select()` — the bulk are
  single-predicate lookups. Only **9 embedded-join selects** use PostgREST's nested
  syntax, which is the only genuinely hard translation.
- **Concentration.** ~247 of 462 queries live in 6 controllers.
- **The 29 RPCs port nearly free.** They are plain Postgres functions
  (`increment_soa_serial`, `check_rate_limit`, `search_kb_chunks`, the
  `*_with_audit` set) that run unchanged on RDS; only the call syntax changes.
- **`lib/supabase/service-role.ts` is dead code** — imported by nothing. A
  service-role key helper in the frontend bundle; delete regardless.

### Findings that increase scope

- **50 of 73 backend test files mock the Supabase client.** They assert against
  `{ data, error }` shapes and `.from().select().eq()` chains. All 50 break on the
  Drizzle swap, and none verify real SQL behavior.
- **~150 queries live in controllers with zero test coverage**: `supportController`
  (42), `tagsController` (23), `searchController` (17), `mailboxController` (15).
- **The `{ data, error }` → throw shape change** affects 208 `.single()` /
  `.maybeSingle()` call sites plus every downstream error branch.

### Why the existing migration history cannot be trusted

- `supabase/README.md` names `consolidated-schema.sql` as "PRIMARY SOURCE OF
  TRUTH" — **that file does not exist in the repository.**
- 4 migrations in `manual-migrations/` were applied outside the numbered sequence.
- Dev is a **Supabase branch of prod**, not a replay of migrations. Nobody has
  verified in a long time that the 116 migrations replay to equal prod.
- 48 of the 116 are RLS policies being deleted anyway.
- Reference data is scattered and contradictory: `plans` rows are defined in
  **3 separate migrations and the seed file**, with nothing indicating which is
  authoritative.
- **`tld_pricing` has zero INSERTs anywhere in the repository.** That data exists
  only in the live database. A schema-only dump produces an empty pricing table
  and silently broken domain pricing.

Replaying the 116 migrations into RDS would faithfully reproduce a fiction.

---

## 3. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Migration shape | **Full Supabase replacement** | Avoid a lasting partial dependency |
| Spec destination | **Dev only** | Prod cutover is a later spec; code work is shared |
| Data layer | **Drizzle ORM** | TS-first, SQL-shaped, replaces `types/supabase.ts`, and `drizzle-kit` also handles migrations |
| Infra management | **Console first, then Terraform** | Console teaches the concepts; Terraform makes it reproducible |
| Railway → RDS | **Railway Pro static outbound IP + SG allowlist + TLS** | Simplest adequate option for dev; caveat accepted knowingly (see 5.1) |
| Migration baseline | **Dump from prod, do not replay** | Prod is the only honest source of what the schema *is* |
| Old migrations | **Archive, do not delete** | Preserve readable history; stop it being executable |
| Dev data | **Migrate it, as cutover rehearsal** | Dev is prod-shaped; rehearsal is free here |
| Test strategy | **Characterization tests before porting** | ~150 queries have no safety net today |
| `{data,error}` shim | **No shim** | A shim permanently enshrines the Supabase idiom |

---

## 4. Target Architecture

One schema definition, three databases, zero Supabase.

```
Drizzle schema (db/schema.ts)          <- single source of truth
        |
        +-- drizzle-kit generate --> migrations/   (versioned, in git)
        |
        +-- applied identically to:
              +-- local   -> Docker Postgres   (free, offline, disposable)
              +-- dev     -> AWS RDS Postgres  (this spec's deliverable)
              +-- prod    -> still Supabase    (later spec)
```

Recreating any environment becomes `drizzle-kit migrate` against an empty database.

### Component mapping

| Today | After |
|---|---|
| `supabaseAdmin.from(...)` (462) | Drizzle queries over `node-postgres` pool |
| `.rpc('fn')` (29) | ``db.execute(sql`select fn(...)`)`` — functions unchanged |
| RLS policies (48 migrations) | Deleted |
| `auth.users` FKs (16) | Repointed to `public.profiles` |
| Supabase Storage (avatars) | S3 bucket + backend-issued presigned upload URLs |
| `auth.admin.*` (6) | Profile-table operations; Auth0 Management API where truly identity |
| Supabase Auth / GoTrue | Nothing — Auth0 already owns login |
| `types/supabase.ts` | Drizzle inferred types |

---

## 5. Design Detail

### 5.1 Connectivity (Railway -> RDS)

Railway assigns a **new outbound IP on every deploy, restart, and scale**, drawn
from a shared pool, so a plain security-group allowlist cannot work by default.

**Decision:** enable Railway Pro's static outbound IP, allowlist it in the RDS
security group, require TLS, and store credentials in AWS Secrets Manager.

**Caveat accepted knowingly:** per Railway's documentation the static outbound IP
is **shared with other Railway customers**, not dedicated. The allowlist therefore
admits other Railway tenants at the network layer; **TLS and credentials are the
actual guard.** This is acceptable for dev data and is explicitly **not** the
production answer. The prod destination is backend compute inside the VPC (ECS
Fargate or App Runner) with a private RDS endpoint — out of scope here, but it is
why the Terraform is structured to allow that change without a rewrite.

**Prerequisite to confirm early:** dev must be on a Railway **Pro** plan. If it is
on a lower tier this is a Phase 1 blocker, not a Phase 1 surprise.

### 5.2 Three data tiers

A schema-only dump produces a database that is structurally correct and
functionally dead. Data must be classified, not treated uniformly.

| Tier | Contents | Lives where | How it moves |
|---|---|---|---|
| **A — Schema** | DDL for 52 tables, 16 functions, triggers, pgvector | `db/schema.ts` + `0000_baseline` | Introspected from cleaned prod dump |
| **B — Reference data** | `plans`, `entitlements`, `plan_entitlements`, `tld_pricing`, `mailbox_pricing`, `app_settings`, `storefront_products` | **Versioned seed migrations in git** | Extracted from **prod** — not from the 28 scattered migrations |
| **C — Operational data** | orgs, profiles, zones, subscriptions, audit_logs, chat/kb, ... | **Never in git** | Repeatable ETL script, run per environment |

Tier B is a genuine improvement over today: reference data stops being "whatever
three migrations and a seed file last agreed on" and becomes one versioned,
reviewable artifact.

**The Tier B table list above is provisional and is itself a deliverable.**
Getting it wrong reproduces the `tld_pricing` failure mode. It must be confirmed
against the live database before the baseline is generated.

`supabase/seed/public-data.sql` mixes Tier B (`plans`, `entitlements`,
`plan_entitlements`) with Tier C (`zones`, `profiles`, `organizations`,
`audit_logs`) and must be split accordingly.

### 5.3 Building the baseline

1. **Extract ground truth** — `pg_dump --schema-only` from prod (read-only).
2. **Strip the Supabase layer** — drop `auth` and `storage` schemas, all RLS
   policies, Supabase roles (`anon`, `authenticated`, `service_role`), and the
   `supabase_realtime` publication. **Keep** pgvector, all 16 Postgres functions,
   and all triggers.
3. **Repoint the 16 `auth.users` FKs to `public.profiles`.** This is the one real
   schema *change* in the project, not a translation.
4. **Introspect into Drizzle** — `drizzle-kit pull` produces `db/schema.ts`, which
   becomes the source of truth and replaces `types/supabase.ts`.
5. **Generate `0000_baseline`** — one migration that builds the full schema from
   empty.
6. **Archive** the 116 + 4 migrations to `supabase/migrations-archive/` with a
   README recording the cutover date.
7. **Prove it in CI** — spin up empty Postgres, run `drizzle-kit migrate`, diff the
   result against the committed schema snapshot.

**One-way door, accepted:** archived history stops being replayable. The trade is
"complete lineage back to January" for "the migrations in git are guaranteed to
produce the real schema." The lineage is already broken, so this is a net gain —
but it cannot be undone.

**Pre-FK data audit (required before step 3):** count orphan rows and duplicate
profiles before writing the FK migration. Duplicate profiles by email are known to
exist from the Auth0 migration. The reconciliation rule must be decided before the
migration is written, not discovered during it.

### 5.4 ETL as a first-class deliverable

The Tier C migration script must be:

- **Idempotent** and safely re-runnable
- **Dependency-ordered** with respect to foreign keys
- **Reconciling** — emits a row-count report, source vs destination, per table

The same script serves prod later; only connection strings change. Its dev run
produces the hardened runbook.

### 5.5 Porting the data layer

**Turn the mock problem into the safety net.** Rather than rewriting 50 Supabase
mocks into 50 Drizzle mocks, replace mocked tests with **integration tests against
real Postgres** (Docker locally, from Phase 1). The result verifies actual SQL,
which is what a data-layer migration requires.

**Four principles:**

1. **Characterization tests before porting.** Capture current behavior against real
   Postgres *while it still runs on Supabase*; those tests gate the port. The four
   untested controllers get tests before a single query is touched.
2. **No architectural refactor during migration.** Drizzle calls go exactly where
   `supabaseAdmin.from(...)` sits today. A repository-layer refactor at the same
   time would make every diff unreviewable. It is a separate, later project.
3. **Spike the 9 embedded joins first.** They are the only hard translations.
4. **Port whole controllers.** The backend points at one database at a time, so a
   half-ported controller is untestable.

**No `{ data, error }` compatibility shim.** It would shrink the diff but
permanently enshrine the Supabase idiom, defeating the project's stated purpose.
The 208 `.single()` sites and their error branches are ported to try/catch.

**Order:**

| Step | Controllers | Queries | Why |
|---|---|---|---|
| 3a | Spike the 9 embedded joins | 9 | Prove the hard case first |
| 3b | `plans`, `operatorActions`, `users`, `internal` | 10 | Establish pattern on low-risk surface |
| 3c | `tags`, `search`, `mailbox`, `support` | 97 | Characterization tests first — biggest gap |
| 3d | `zones`, `dnsRecords`, `domains`, `subscriptions`, `businessIntake`, pricing/audit/profiles/legal | ~66 | Core product surface |
| 3e | `organizations`, `admin`, `stripe` | 134 | Largest and riskiest; patterns proven by now |
| 3f | 29 RPCs -> ``db.execute(sql`...`)`` | 29 | Nearly free |

**Cutover mechanics:** Phase 3 runs on a branch pointed at RDS with dev data
already migrated. Dev's Railway backend keeps using Supabase until the branch is
complete, then flips in one deploy. No dual-write, no split-brain.

---

## 6. Phases

| Phase | Work | AWS? | Depends on |
|---|---|---|---|
| **0** | Move zone-name validation server-side; delete dead `service-role.ts` | No | — |
| **1** | AWS account, billing alarm, VPC, RDS Postgres + pgvector (console then Terraform) | Yes | — |
| **2** | Clean baseline; Tier B seeds; Tier C ETL; dev data migration rehearsal | Yes | 1 |
| **3** | Backend data layer -> Drizzle (462 queries, 29 RPCs) | — | 2 |
| **4** | `AvatarUpload` -> S3 presigned uploads; 6 `auth.admin.*` sites | Yes | 1 |
| **5** | Delete RLS policies | — | 0, 4 |

### Phase 0 detail (first, and independent of AWS)

Ships to `dev` immediately. It is a live cross-tenant enumeration risk that should
not wait behind a multi-week migration, and it is the last thing depending on RLS —
so fixing it first makes Phase 5 a clean removal rather than a coupled change.

The backend **already performs this exact validation**: `zonesController.ts:289-304`
fetches all zone names with service-role access and runs `detectZoneOverlap`
(`src/utils/validation.ts:331`). The frontend query duplicates logic that exists
server-side.

1. Extract `zonesController.ts:289-304` into a shared helper returning
   `{ available: boolean, conflict?: string }`.
2. Add `GET /zones/name-available?name=` in `src/routes/zones.ts` reusing it.
   Returns **only a boolean and conflict reason — never a zone list.** Same
   `requireScopes("dns:read")` treatment as sibling routes, plus rate limiting.
3. `AddZoneModal.tsx` — remove `createClient()`, the `.from('zones')` query, and
   `allZoneNames` state; call the new endpoint, debounced.
4. Delete `lib/supabase/service-role.ts`.
5. Verify callers: `app/organization/[orgId]/OrganizationClient.tsx` and
   `app/domains/[id]/page.tsx`.

**This repairs a broken feature, not only a security hole.** Per
`docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md`, the client-side check silently
no-ops for every Auth0 user today (no Supabase session -> anon -> RLS returns
nothing). `POST /zones` already enforces the rule server-side, so there is no
correctness gap during the change — only UX timing.

---

## 7. Verification

| Phase | Definition of done |
|---|---|
| 0 | `AddZoneModal` has no Supabase import; overlap validation works for Auth0 users (it does not today); debt doc item 1 closed |
| 1 | `psql` connects from laptop and from Railway over TLS; Terraform reproduces the stack from scratch; billing alarm firing-tested |
| 2 | CI: empty Postgres -> `drizzle-kit migrate` -> schema matches committed snapshot; ETL reconciliation clean per table; runbook written |
| 3 | Full suite green against real Postgres; zero `@supabase/supabase-js` imports in backend |
| 4 | `@supabase/supabase-js` removed from both `package.json` files; `DIRECT_SUPABASE_ACCESS_DEBT.md` deleted |
| 5 | RLS policies dropped with no behavior change |

---

## 8. Cost

The legacy 12-month free RDS tier **no longer exists for new accounts.** Since
July 2025, new accounts receive **$200 in credits** ($100 up front, $100 via
onboarding tasks) and a Free Plan ending at **6 months or credit exhaustion,
whichever comes first.** RDS draws down against that balance.

Estimated running cost after credits (dev, single-AZ, us-east-1): **$15-20/month**
— `db.t4g.micro` ~$12, 20GB gp3 ~$2.30, Secrets Manager ~$0.40/secret, backups
minor.

Two Phase 1 notes:

- **Aurora Serverless v2 now scales to zero**, which suits an intermittently-used
  dev database. Price it against fixed RDS before committing.
- **The billing alarm goes in on day one, before any resource is created.**

---

## 9. Rollback

- **Phases 0-2** are additive and reversible; nothing is removed.
- **Phase 3** is a branch — rollback is "do not merge."
- **Phase 5** is the first irreversible step, which is why it comes last and only
  after Phases 0 and 4 have removed everything depending on RLS.
- **Production is untouched throughout.** Reads of prod (schema dump, Tier B
  extraction) are read-only. Any database apply is a separate, explicitly
  authorized action.

---

## 10. Out of Scope

- Production cutover (separate spec, informed by this one's runbook)
- Moving compute off Railway or Vercel
- The repository-layer refactor of the backend
- Any write to the production database

---

## 11. Open Questions

1. **Tier B table list** — must be confirmed against the live database before the
   baseline is generated (see 5.2).
2. **Railway plan** — is dev on Railway Pro? Blocks the static outbound IP.
3. **RDS vs Aurora Serverless v2** — decide in Phase 1 on cost and cold-start.
4. **Duplicate-profile reconciliation rule** — decide before the FK migration
   (see 5.3).

---

## 12. Follow-ups Noted During Survey

Not part of this project, but found while surveying and worth recording:

- `CLAUDE.md` claims legacy Supabase Auth persists in the frontend. **It does not** —
  zero `supabase.auth.*` call sites. Correct the file.
- `supabase/README.md` names a `consolidated-schema.sql` that does not exist.
- `lib/supabase/service-role.ts` is dead code in the frontend (removed in Phase 0).
