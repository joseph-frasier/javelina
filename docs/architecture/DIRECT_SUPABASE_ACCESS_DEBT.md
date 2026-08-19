# Known Issue: Direct Frontend → Supabase Data Access (Pre-API Remnants)

**Status:** 🔴 Open — needs resolution
**Severity:** High (security-relevant) — currently mitigated only by RLS
**Found:** 2026-06-03 (repo-cleanup audit)
**Rule violated:** Frontend MUST NOT read/write Supabase tables directly (CLAUDE.md);
all data goes through `javelina-backend`. Sanctioned exceptions: legacy Supabase Auth
calls and the staff admin portal.

These are the only two remaining call sites from before the Express API existed.
**Delete this document when both are resolved.**

---

## 1. ~~Zone-name validation reads ALL orgs' zones~~ — RESOLVED 2026-08-19

Resolved by `GET /zones/name-available` (`zonesController.checkZoneNameAvailability`),
which runs the overlap check with service-role access and returns only
`{ available, conflict? }`. `AddZoneModal` no longer imports the Supabase browser
client. The unused `lib/supabase/service-role.ts` was deleted at the same time.

This also repaired the check for Auth0 users, for whom the old browser query
silently returned nothing.

## 2. Avatar upload writes Storage + `profiles` directly — `components/ui/AvatarUpload.tsx` (~lines 144–198)

```ts
await supabase.storage.from('avatars').upload(fileName, croppedImage, ...);
await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
```

Used by: `app/profile/page.tsx` (dynamic import).

**Problems:**

- Direct `profiles` table write from the browser — RLS is again the only guard,
  and the write targets a row by `userId` passed in as a prop.
- **Likely broken for Auth0 users today**: no Supabase JWT → the `profiles`
  update (and a properly-locked `avatars` bucket upload) should fail RLS.
  If uploads currently *succeed* for Auth0 users, that means the bucket/table
  policies are permissive — which is worse, and worth checking on its own.

**Fix:** route through the backend. `PATCH` profiles on the backend already
accepts `avatar_url` (see `javelina-backend` `src/controllers/profilesController.ts`),
so the table-write half exists. The binary upload needs either a backend upload
endpoint or backend-issued signed upload URLs; keep the bucket non-public-write.

---

## Verification (how this list was produced — rerun after fixing)

```bash
# All direct data/storage/rpc call sites (excludes Array.from / *Storage):
grep -rn "\.from('\|\.from(\"\|\.storage\b\|\.rpc(" --include='*.ts' --include='*.tsx' \
  app components lib middleware.ts \
  | grep -v "Array\.from\|\.from(new\|localStorage\|sessionStorage\|gsap"

# Files importing a Supabase client (should be: lib/supabase/*, sanctioned
# auth/admin code, and nothing else):
grep -rln "from '@/lib/supabase" --include='*.ts' --include='*.tsx' app components lib
```

Expected end state: zero `.from(`/`.storage`/`.rpc(` data call sites outside
`lib/supabase/` and the sanctioned admin-portal/auth exceptions.
