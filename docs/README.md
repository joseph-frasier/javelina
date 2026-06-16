# Javelina Docs

All project documentation lives in this folder. Completed migration plans, one-off
fix logs, and implementation summaries are **deleted once done** (recoverable from
git history) — if a doc is in this tree, it should describe the *current* state of
the system or active/pending work.

## Layout

| Folder | What goes here |
|--------|----------------|
| `architecture/` | How the system works today. Start with [`AUTH0_SUPABASE_HYBRID_MODEL.md`](architecture/AUTH0_SUPABASE_HYBRID_MODEL.md) — the authoritative auth doc (Auth0 for customers, Supabase Auth for the admin panel only). |
| `features/<feature>/` | Active feature specs, API contracts, and backend handoff docs, grouped by feature (`auth/`, `billing/`, `support-chat/`, `admin/`, `dashboard/`, `business-wizard/`). |
| `superpowers/plans/` | Dated implementation plans for in-flight work. |
| `superpowers/specs/` | Dated design specs for in-flight work. |

## Conventions

- New feature docs go in `features/<feature>/`. Create the folder if it doesn't exist.
- Backend handoff docs (work the frontend needs from `javelina-backend`) are named
  `BACKEND_*` or marked "Backend Status: Pending" in their header.
- When a handoff or plan is fully implemented and verified, **delete the doc** in the
  same PR rather than letting it go stale.
