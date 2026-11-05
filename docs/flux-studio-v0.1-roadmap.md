# Flux Studio v0.1 — Approved Development Plan
Updated: 2026-11-05
Status: scope approved; roadmap, not a claim of implemented features.

## Product goals
Open-source, mobile-first, visual drag-and-drop workflow builder with configurable nodes, branching, reusable connections, transparent execution logs and safe server-side credentials. Free for users during v0.1. No paid Flux tier or billing dependency. Third-party API usage and hosting may still have costs and rate limits.

## Approved catalog
8 integrations: Trello; Email/SMTP; HTTP API; Google Sheets; Slack; Google Drive; GitHub; WordPress.
10 universal blocks: Webhook; Manual Trigger; Schedule; Condition; Router; Merge; Filter; Data Mapper; Delay; Loop.
Initial scope: 18 block families; each integration can expose multiple operations. Exact action count is not yet approved.

## Drag-and-drop experience
- Node palette with search, category, accessible click-to-add and drag-to-add.
- Nodes drag by body; left input and right output ports; multi-edge branches and joins.
- Inspector tabs: Connection, Operation, Input, Output, Advanced, Test.
- Connection: friendly credential reference, authorization status, dynamic account/board/list selection; no raw secrets in graph JSON.
- Operation: choose trigger/action and resource; dynamically render required and optional parameters.
- Input: map prior node outputs through a variable picker with data previews and type hints; support constants and expressions.
- Output: preview sanitized sample result, available fields and schema.
- Advanced: timeout, retry/backoff, error path, pagination, concurrency limits, idempotency.
- Test: validate graph, run node, dry-run workflow, execution traces and redacted errors.
- Save/import/export versioned graph JSON; secrets excluded; migrations for schema changes.
- Responsive inspector/drawer for mobile; keyboard-accessible node actions.

## Execution architecture
- Authenticated backend, versioned graph schema, validation, bounded DAG scheduling, explicit fan-out/fan-in.
- Event triggers (webhook/manual/schedule), execution state persistence, retries, resumability and audit trail.
- Loop requires bounded iterations and explicit loop semantics, never unrestricted graph cycles.
- Delay/schedule require durable queue/scheduler; do not simulate them as durable before implemented.
- Credentials encrypted server-side, scoped per user/workspace; never exposed to browser, Trello, Drive or GitHub.
- SSRF defenses for HTTP connector: disallow local/private/link-local destinations, redirects and metadata services; enforce timeouts and payload limits.
- OAuth where supported; scoped tokens; per-connector rate limits, permission checks and consent.
- Dry-run must distinguish simulation, live read-only API calls and real writes.

## Delivery sequence / acceptance
Phase 1 — Canvas and inspector: all 18 block types represented; configurable forms; data mapping; graph JSON migration; mobile and accessibility checks.
Phase 2 — Runtime: validation, branching, merge, error handling, traces, persisted runs; manual/webhook triggers; test coverage.
Phase 3 — Core connectors: Trello, HTTP API, Email/SMTP, Google Sheets; real read/write operations behind explicit user authorization.
Phase 4 — More connectors: Slack, Google Drive, GitHub, WordPress; at least one read and one write operation per applicable connector.
Phase 5 — Advanced controls: Schedule, Router, Merge, Filter, Data Mapper, Delay, bounded Loop; retries and concurrency.
Phase 6 — End-to-end testing, documentation, onboarding, secure credential setup and v0.1 release checklist.

## Current implementation and limitations (2026-11-05)
Flow Canvas visual graph and experimental server graph runner already exist. Trello read-only list connector code exists, requiring Netlify server-side FLUX_TRELLO_API_KEY and FLUX_TRELLO_TOKEN for live reads; dry-run does not contact Trello. Other integrations and many universal blocks are not yet operational. The current runner is a prototype, not a general-purpose workflow automation service. No subscription/billing is implemented. Do not mark roadmap phases complete without integration tests and verified deployment.

## Cost policy
Free-to-use v0.1, no paid features; set safe quotas for execution time, schedules, requests and log retention. Monitor hosting and third-party costs. Monetization may be considered after validated usage.
