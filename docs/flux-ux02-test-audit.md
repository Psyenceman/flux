# UX-02 — continuity audit and guided Trello configuration
Updated: 2026-11-07

## Provenance and safety
Baseline: 03d7100, branch `test/trello-popup-feedback`, repository Psyenceman/flux.
Read UX-01 audit, FLUX_STUDIO_STATUS, Supabase integration notes, active editor,
functions, migrations and regression tests. Preserve the existing interpreter,
canvas state, Supabase authentication, execution engine and deployment layout.
TEST Netlify site c1eb0566-bafe-4ab0-adf1-15581093ccbb publishes `site`, built by
`npm run build:studio` from `studio/flow-canvas.html` and its referenced assets.
PROD is separate site 53d0d761-0a0c-4161-a922-6458a15f8aee; do not modify it.

## Capability inventory (source evidence, not a claim of live verification)
| Area | Existing implementation | Limits / outstanding verification |
|---|---|---|
| Authentication | Supabase sessions in canvas-cloud.js / cloud.js, server identity checks | Two-account RLS and browser signup/session recovery require authenticated E2E |
| Automations | Save/load owned graphs, automation cards | Cloud save leaves workflows disabled; exercise edit, reload and ownership isolation |
| Editor | Existing graph, drag/drop, ports, history, modal forms, UX-01 EN/IT | Multiple overlapping UI layers; full keyboard/mobile audit remains open |
| Trello | OAuth popup, encrypted owner credentials, boards/lists endpoint, read and guarded create-card | Refresh/revoke lifecycle incomplete; actual provider authorization and write need manual account verification |
| Other connectors | Engine branches and regression tests; Airtable/HubSpot credential storage with verification | Branch existence is not usable end-to-end OAuth. Several types skip; token setup remains technical. Notion storage is not execution |
| Scheduler | Five-minute Netlify function claims up to five jobs through DB RPC; internal safe-block allowlist | Requires deployed RPCs; external unattended actions rejected; crash/retry audit pending |
| Webhook | Secret hash claim, rate/quota responses, internal-only execution, sanitized run summary | Confirm migrations applied, idempotency and durable failure history. Some rejection paths happen after claim |
| Run history | Browser memory panel; webhook DB summaries; scheduler completion RPC | Not a unified durable paginated execution history |
| FluxCoins | Existing flux_consume_credit RPC calls plus preview per-completed-block metering | Current debit is per request; not compliant with required per-executed-block accounting. Do not label estimates as actual charges |
| Plans | Free/Pro/Business catalog, entitlement/quota migrations | Migration files do not prove live application; subscriptions and monthly provisioning require tests |
| Super Admin | Server-authorized overview and audited idempotent credit adjustment | Verify role escalation protection and concurrent adjustment in live TEST DB |
| Stripe | No Checkout / subscription webhook implementation found | Not integrated. Requires TEST Stripe connection, price decisions, signature secret and idempotent entitlement handling |

## UX-02 implemented slice
Extend the existing modal and existing authenticated resource endpoint, without a second editor:
- Trello list ID input removed from ordinary configuration; select board/list by name.
- Selecting a list no longer writes the first text input (which could overwrite the card title).
- Race-safe resource state: changing or clearing a board invalidates older requests.
- Clear dependent list and connection references on board changes.
- Save requires an available selected list; loading/errors cannot falsely mark a step ready.
- Loading/empty/error/retry states and disabled dependent controls.
- Dispose pending responses/listeners on modal close.
- No database schema, credential scope, billing debit or live-write permissions changed.

## Validation
Automated state-controller regression tests cover restore, stale/foreign selection,
out-of-order responses, clearing during loading, title preservation, retry and disposal.
Run the complete existing suite and build before commit. See release log for exact results.
Authenticated provider E2E, mobile visual QA and live plan/account isolation remain OPEN.
UX-02 overall is not complete until those acceptance checks pass; this is its first tested slice.

## Architecture decision
Retain the existing static Studio + authenticated Netlify endpoints + Supabase model.
Extract small testable controllers from legacy overlays incrementally. Provider access,
resource discovery and execution must share owner-scoped credentials. Never allow
browser graph data to supply secrets or select arbitrary server-connected resources.
Do not unlock external unattended writes to make demonstrations appear operational.

## Release validation result
- 105/105 Node tests passed; Studio TypeScript/build:studio passed.
- Four new picker controller tests, plus legacy Trello tests reconciled to current skipped-without-credentials semantics.
- Popup VM harness now implements browser Event/dispatchEvent used by the existing connection callback.
- Syntax and diff whitespace checks passed.
- Deployment and authenticated browser acceptance must be recorded after publication.
