# Customer Dashboard — Service Status Guide

For the frontend dev building the customer's per-business dashboard. Tells you which API to hit, what the response looks like, and how to render the per-service "tiles" (website / dns / email / domain) with their live progress narration.

> **Source of truth:** `provisioning_status` table in `javelina-backend`, written via `syncToJavelina()` from this repo (`src/lib/sync/javelina.ts`). The customer never reads from `agent_runs`, `operator_actions`, or `leads` — those are internal.

---

## 1. Route

```
GET /api/business/:orgId
```

Lives in `javelina-backend` (`src/routes/businessIntake.ts`). Auth: standard Auth0 bearer token from the logged-in user's session — the route is gated by `authenticate` + `requireOrgMember(orgId)`. **Do not use the `X-API-Key` header** — that's for server-to-server calls only.

There's also `GET /api/business/me` which returns the list of orgs the user belongs to that have started provisioning. Use that for an org picker if needed.

### Response shape

```jsonc
{
  "org": {
    "id": "uuid",
    "name": "Acme Co",
    "slug": "acme-co",
    "status": "active",
    "created_at": "2026-05-01T..."
  },
  "intake": { /* business_intake settings blob — form data */ },
  "provisioning": [
    {
      "service": "website",                 // see §2
      "state": "in_progress",               // see §3
      "internal_state": null,               // free-form, optional
      "progress_label": "Generated page-by-page copy for your site",
      "metadata": { "phase": "content" },   // see §4
      "updated_at": "2026-05-05T..."
    },
    // …one row per service that's emitted at least once
  ],
  "events": [
    // Last 50 pipeline_events rows for this org — for an activity feed
    {
      "id": "uuid",
      "service": "website",
      "previous_state": "not_started",
      "new_state": "in_progress",
      "message": "...",
      "actor_type": "agent" | "worker" | "operator" | "system",
      "created_at": "..."
    }
  ]
}
```

### Polling

There's no SSE/websocket channel today. Poll `GET /api/business/:orgId` while any service has `state === "in_progress"`. **5–10 second interval** is fine; back off (or stop) once everything is `live` / `failed` / `needs_input`.

---

## 2. Services

Always render one tile per service, even if a service hasn't emitted yet (in which case treat it as `not_started`):

| `service` | What it covers                                            |
| --------- | --------------------------------------------------------- |
| `website` | Generated marketing site (Agents 1, 10, 12, build, SSL)   |
| `dns`     | Javelina-managed DNS zone + records                       |
| `email`   | Mailbox provisioning (OMA for Starter, M365/Pax8 for Pro) |
| `domain`  | Domain registration / transfer / connection               |

---

## 3. `state` — the headline driver

Six values. **The tile's overall look (color, icon, animation) should key off this**, not off `progress_label`.

| `state`          | Meaning                                                              | Suggested UI                     |
| ---------------- | -------------------------------------------------------------------- | -------------------------------- |
| `not_started`    | No emit yet for this service                                         | Grey / placeholder               |
| `in_progress`    | Active work happening — `progress_label` will tell the customer what | Pulsing / spinner                |
| `needs_input`    | Stalled waiting on customer or staff (e.g. Pax8)                     | Amber, "we'll let you know"      |
| `failed`         | Hard failure                                                         | Red, "our team is investigating" |
| `live`           | Done and serving traffic                                             | Green checkmark                  |
| `not_applicable` | Service skipped for this package                                     | Greyed/hidden                    |

---

## 4. `progress_label` and `metadata.phase` — the sub-line

Inside an `in_progress` tile, `progress_label` is the customer-friendly sentence to show. **Render it directly.** It's already written for the customer.

`metadata.phase` is a short token you can switch on for icons, step indicators, or animations — same phase will always emit the same label, so it's stable.

### Per-service phase ladders

These are the canonical phase tokens + labels each service emits (locked in via the simulator at `src/lib/inngest/simulate-pipeline.ts`). When the real workers ship (JAV-121), they'll emit the same set.

#### `website` (5 phases pre-live)

| `phase`         | `progress_label`                                                  | Emitted by                        |
| --------------- | ----------------------------------------------------------------- | --------------------------------- |
| `understanding` | "Researching your industry, audience, and competitors" _(approx)_ | Agent 1 dispatch                  |
| `content`       | "Generated page-by-page copy for your site"                       | Agent 10 (Composer)               |
| `design`        | "Picked your palette and typography" _(approx)_                   | Agent 12                          |
| `building`      | "Assembling your pages from copy and design"                      | `intake/agents.all-complete`      |
| `securing`      | "Securing your site with SSL"                                     | Certificate Issuer (JAV-121 §3.5) |
| → `state: live` | "Live"                                                            | Final                             |

#### `domain` (branches on intake `domain.mode`)

| `phase`            | `progress_label`                                              | When                                                           |
| ------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `registering`      | "Registering your domain"                                     | mode = `register`                                              |
| `connecting`       | "Connecting your existing domain"                             | mode = `connect`                                               |
| `transfer_pending` | "Awaiting transfer authorization from your current registrar" | mode = `transfer`                                              |
| `transfer_polling` | "Transfer in progress (this can take a few hours)"            | Transfer Coordinator polling — **can sit here for hours/days** |
| → `state: live`    | "Live"                                                        | Final                                                          |

#### `dns`

| `phase`         | `progress_label`                         |
| --------------- | ---------------------------------------- |
| `zone_create`   | "Setting up your DNS zone"               |
| `records`       | "Adding mail and verification records"   |
| `propagating`   | "Waiting for DNS to propagate worldwide" |
| → `state: live` | "Live"                                   |

#### `email` (branches on package)

| `phase`            | `progress_label`                               | Path                                                                                      |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `verifying_domain` | "Verifying your domain with the mail provider" | both                                                                                      |
| `provisioning`     | "Creating your mailboxes"                      | Starter (OMA)                                                                             |
| `pax8_pending`     | "Pax8 setup in progress — our team is on it"   | Pro — emitted with `state: needs_input`, **stays there** until staff click mark-pax8-done |
| → `state: live`    | "Live"                                         | both                                                                                      |

---

## 5. What state is actually wired today vs simulated

**This matters — don't design for narration that doesn't ship.**

| Service   | In production today                                                                        | In the simulator                    |
| --------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| `website` | ✅ All 4 pre-live phases emit (Agents 1/10/12 + all-complete). `securing` not yet emitted. | ✅ Full ladder including `securing` |
| `domain`  | ❌ No phase emits yet — will jump `not_started → live` once worker exists                  | ✅ Full ladder                      |
| `dns`     | ❌ No phase emits yet                                                                      | ✅ Full ladder                      |
| `email`   | ❌ No phase emits yet                                                                      | ✅ Full ladder                      |

So **build the dashboard against the simulator** — it represents the target UX. Just be aware that hitting prod (real intake submission, no simulator) today, you'll only see website narrate; the other three tiles will sit at `not_started` until provisioning finishes, then flip to `live` collectively.

When JAV-121 workers ship, each one will start emitting the labels above and the dashboard "comes alive" with no frontend changes needed.

---

## 6. Testing against the simulator

The simulator fires real `syncToJavelina` calls (no LLM cost). It's Inngest-driven; trigger it via:

```bash
# from repo root, requires INTAKE_APP_URL + ADMIN_API_KEY in env or .env.local
scripts/simulate-pipeline.sh <org_id> <scenario> [interval_ms]
```

Scenarios:

| Scenario           | What it exercises                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `happy_path`       | Full lifecycle end-to-end. All 4 services land at `live`.                                                                        |
| `agent_failure`    | Website fails mid-Composer; other tiles still reach "Draft ready".                                                               |
| `rejected`         | All 4 tiles flip to `needs_input` "Routed to custom" (operator-rejected lead).                                                   |
| `pro_pending`      | Pro flow where email stalls at `pax8_pending`; website/domain/dns finish. Requires `--package=business_pro` (script handles it). |
| `transfer_pending` | Domain enters long-poll transfer; dns/email/website held at "Waiting on domain transfer". Tests blocked-but-not-failed UX.       |

Default interval is 1500ms (~quick scan). Bump to 4000–5000 for a more realistic demo pace.

---

## 7. Gotchas

1. **Out-of-order arrivals are possible.** `syncToJavelina` retries via `pending_jobs` on HTTP failure, so a stale phase emit could in theory land after a newer one. The javelina-backend upsert _should_ handle ordering, but if a tile flickers backwards, that's the cause. **Don't try to be clever client-side — trust whatever the row currently says.**
2. **`provisioning[]` may be missing rows for services that haven't emitted yet.** Render a `not_started` placeholder by default so the layout doesn't shift.
3. **`transfer_polling` can sit on the same label for hours.** Don't time-out the spinner; the Transfer Coordinator backs off (5min → 15min → 1h → 6h → 12h, hard timeout 7 days).
4. **`needs_input` tiles don't necessarily mean the customer needs to do something.** `pax8_pending` is staff-driven. Use the label to clarify ("our team is on it" vs. asking customer for input).
5. **Don't query `operator_actions`, `agent_runs`, or `leads` from the frontend.** Those are internal/admin surfaces. Customer dashboard's full picture lives in `org` + `provisioning` + `events`.

---

Headline = `service` title + state-driven visual. Sub-line = `progress_label`. Optional phase indicator = `metadata.phase`.
