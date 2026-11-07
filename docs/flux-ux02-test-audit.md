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

## Published TEST verification — 2026-11-07
- Netlify deploy `6aef59c725f35370597ac226`: ready, branch test/trello-popup-feedback, source commit `1fc382b2fee63929a698c0b296c6f86f0664c93d`.
- Browser at https://flux-studio-test.netlify.app/flow-canvas.html: Scenario builder → Add a step → Trello → configuration verified.
- Named board/list selectors present; raw list ID input absent. Unauthenticated selectors disabled with sign-in error and enabled Refresh boards recovery button.
- Save without valid board/list rejected; modal stays open with actionable validation.
- Switching to Create card shows title/description fields alongside the same board/list picker.
- Authenticated E2E blocked: login returned Invalid login credentials; no provider authorization or card creation claimed.
- Production published deploy remains `6aedc72f553859dcc804e34c`; no production mutation.
- Owner deferred Stripe and per-block billing gaps; these remain open and outside this deployment/QA slice.

## Authenticated follow-up
Flux login succeeded. Expired Trello connection was reauthorized in a separate popup; callback closed popup and automatically loaded real boards. Board/list discovery succeeded. Switching to Create card and selecting Backlog preserved the card title. Reopening exposed a duplicate-refresh race clearing the saved list; fixed with a persistent desired selection across refresh requests and added regression coverage. Full suite: 106 passed; Studio build passed. No Trello card created. Recheck published fix before marking reopen acceptance passed.
