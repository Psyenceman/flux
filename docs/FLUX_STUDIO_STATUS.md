# Flux Studio — development status (TEST)
Updated: 2026-11-05

## Environments
- Repository: Psyenceman/flux
- TEST branch: develop-supabase-auth; Netlify PR preview: https://deploy-preview-2--startling-moxie-c2f12e.netlify.app/flow-canvas.html
- Production: https://flux.flussia.it/ — do not modify without explicit approval.
- Supabase TEST project: flux-test (ref sgxinvmfkznzoueqjzop), owned by info@flussia.it.
- Changes in TEST do not imply production release.

## Current architecture
- studio/flow-canvas.html: visual canvas, node/edge editing, inspector, runner, cloud selection, automation cards and log panels.
- studio/canvas-cloud.js: Supabase user session, list and save/load automations. Automations remain disabled on cloud save. User-specific visibility depends on database RLS.
- studio/canvas-config.js: block settings, Data Mapper, upstream field suggestions; successful test outputs provide observed paths. Data references must be verified.
- studio/canvas-guided-operations.js: guided operation choices. Some operations are UI-only and have no executor yet.
- studio/canvas-test-results.js: readable per-block statuses, output details and dry-run warnings.
- studio/canvas-automation-logs.js: last 25 per-automation test summaries, in browser memory only, lost on refresh; NOT database history.
- studio/canvas-connections.js: browser-local non-secret connection references; NOT OAuth or secure credential storage.
- netlify/functions/flux-graph-engine.mjs: validated acyclic graph executor; no arbitrary code evaluation or user-selected outbound URLs.
- netlify/functions/flux-graph.mjs: authenticated HTTP endpoint for test execution.

## Implemented vs planned
Implemented in TEST (subject to UI testing):
- Visual block editor, edge insertion/disconnection, data mapping, filtering, limited declarative transforms, graph validation.
- User automation list and click-to-open saved graphs.
- Browser-session debug summaries per automation.
- CI tests for graph engine and mapper.

Limited / not complete:
- HTTP POST restricted to server-configured destination; Trello live reads require server-side credentials.
- Other external connectors may be skipped by executor even if their configuration UI exists.
- Automation runs are not yet persisted to a per-user database history by the new log panel.
- Browser session log summaries are not a substitute for durable audit records.
- Field suggestions without test data are illustrative; they may not exist in actual output.
- No production-ready AI workflow generation, Flux Assistant, or automatic repair.
- No implemented paid-plan billing, entitlements or marketplace.

## Security boundaries
- No secret tokens in graph JSON or client-side connection reference store.
- Keep user data isolated by Supabase RLS. Verify policies before exposing new tables.
- Dry run is default; a simulated/skipped block does not mean an external action happened.
- Never merge TEST into main without explicit user approval.

## Verification
- .github/workflows/flux-test.yml runs Node tests and syntax checks.
- tests/flux-graph-engine.test.mjs and tests/flux-mapper.test.mjs cover engine behavior.
- GitHub Actions success does not replace end-to-end browser, auth and connector verification.
- Before release, verify cloud auth, user isolation, save/load, mapper, debug, live connector restrictions and mobile interaction.

## Roadmap
1. Verify automation cards and log panel end to end, resolve failures.
2. Persistent execution history with per-user access controls, pagination and safe redaction.
3. Real connector authentication and server-side execution; retries, idempotency and error handling.
4. Flux Assistant: natural language to proposed graph, explicit preview, validation and confirmation.
5. Product dashboard and UX improvements, keyboard/mobile accessibility.
6. Paid plans and marketplace only after core reliability and security.

## Documentation policy
Update this file with each material feature, clearly separating implemented, verified and planned capabilities. Keep GitHub as source of truth; sync the Google Drive AI Setup project documentation as a separate step, not assumed automatic.
