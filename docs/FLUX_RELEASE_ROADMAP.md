# Flux TEST release roadmap and decision log
Updated: 2026-11-07

Goal: international automation SaaS, English default / Italian, usable without technical assistance.
Required metering: **1 FluxCoin per actually executed block**. Simulated/skipped blocks must
not be presented as external executions. A complete SaaS is not yet shipped.

| Milestone | Acceptance gate | State |
|---|---|---|
| UX-01 | Existing premium bilingual workspace, desktop/mobile/authenticated smoke | Implemented; open acceptance items in flux-ux01-test-audit.md |
| UX-02 | Guided named resource selection, recovery states, real account E2E | Trello controller slice implemented/tested; provider E2E open |
| RUN-03 | Unified run IDs and sanitized durable paginated per-owner history, crash/retry semantics | Planned; preserve webhook/scheduler work |
| BILL-04 | Reserve/settle per-block wallet with atomic balance checks, idempotency, refunds for unexecuted blocks, reconciliation across manual/API/webhook/scheduler | Required; current request-based debit must be replaced only after DB integration tests |
| CONNECT-05 | Provider OAuth, refresh/revoke, resource pickers, owner-scoped execution and action-level availability | Partial Trello/Airtable/HubSpot foundations; remaining providers not complete |
| PAY-06 | Stripe TEST Checkout, signed idempotent webhook, subscription lifecycle, billing portal and quota synchronization | Blocked on Stripe test configuration and approved commercial pricing |
| RELEASE-07 | Signup → plan → connection → workflow → run → history → payment, two-account security tests, mobile/keyboard/accessibility and recovery | Not ready |

## Working rules
- Only `test/trello-popup-feedback` and dedicated TEST hosting/database may be changed.
- Production release always requires explicit authorization.
- Preserve working features and graph compatibility; migrations must have rollback/recovery planning.
- Distinguish source implemented, automated tested, deployed, and authenticated E2E verified.
- Each release records baseline, changed files, tests, deploy SHA and unresolved acceptance checks.
- Before database or Stripe changes verify actual TEST configuration and current provider docs.
- A credential or commercial blocker does not block unrelated local implementation/testing.

## Open product decisions / indispensable configuration
Stripe TEST products/prices, currency, tax handling and subscription cancellation rules require owner decisions.
Provider OAuth applications and restricted TEST accounts are needed for real authorization/refresh tests.
Do not collect passwords/API secrets in chat or commit them to source.

## 2026-11-07 UX-02 slice
See flux-ux02-test-audit.md for inventory, decisions and exact scope.
No production changes, no new external permissions and no billing behavior changes.
