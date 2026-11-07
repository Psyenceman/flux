# CONNECT-03 — Slack execution in TEST

2026-11-07. Baseline: 3eac6d18ffccdad54eaa685a5cea1a59746e1c3a.
Environment: flux-studio-test.netlify.app only. Active entrypoint remains studio/flow-canvas.html; Netlify functions under netlify/functions. Production flux.flussia.it is excluded.

## Problem and implemented behavior
The Slack form existed but the graph engine skipped Slack as unimplemented. Slack now has two connected actions: list available channels and send a plain-text message. The action uses the authenticated Flux owner's encrypted Slack bot credential, never a shared owner account or a credential embedded in a graph.

The editor discovers joined, active public channels by name, with cursor pagination, refresh, empty/error states, stale-response rejection and saved-selection restoration. No channel IDs need to be entered. Slack requires a bot token (xoxb-) with channels:read and chat:write. The bot must be invited to the public destination channel. Private channels and DMs are explicitly outside this slice. Existing token authorization through auth.test is retained; it does not claim all action scopes are present.

Safe test resolves upstream message fields and displays the resulting message without posting. List channels is a real read. Send is marked simulated in safe test and delivered only after Slack confirms the POST response. Live TEST permits one Slack Send message with supported local and read steps, up to three external nodes; it is no longer limited to an isolated Slack block. Supported accompanying reads: Trello read_list, GitHub public list_issues, Notion search_pages, Airtable find_records, HubSpot search_contacts. Other writes remain denied. A filtered branch never sends. Existing single Trello create behavior remains. HTTP/API/webhook/scheduler live permissions are not expanded.

The browser confirms the destination name and message template for each live run. The graph submitted is the same snapshot shown in that confirmation. Server independently requires authenticated ownership, an allowed graph and explicit Slack confirmation. Membership is checked before the existing credit debit and again immediately before posting. No automated retries: on ambiguous delivery, inspect Slack before retrying. This is not an exactly-once delivery guarantee. Existing FluxCoins accounting remains unchanged and is not reconciled to the displayed per-operation estimate in this milestone.

## Security and failure handling
- Fixed slack.com API destinations; bearer credential only in server headers; redirects rejected and requests time-limited.
- Graph owner_id and graph credentials are ignored. Resource queries and execution use session owner.
- No credential returned by resource or execution endpoints.
- Unjoined, archived, private, foreign-ID and direct-message destinations denied.
- Provider ok:false on HTTP 200, missing scopes, revoked tokens and rate limits produce errors, never fabricated delivery.
- Plain text suppresses markup, mass mentions and link previews from incoming content.
- Missing personal connection and denied membership fail before credit consumption. Other execution/provider failures can still occur after debit under the existing deferred accounting rules.
- No schema, RLS, grant, encryption or production changes.

## Validation
141 automated tests passed; Studio build and syntax/whitespace checks passed. Added contract and integration coverage for provider success/failures, fixed endpoints, pagination, owner isolation with encrypted credentials, explicit confirmation, denied destinations before charging, actual graph propagation, safe preview with zero Slack requests, filtered branches, unsupported live actions, ambiguous write without retry, selector races/pagination/clearing and cleanup. Provider calls in these tests use controlled responses, not a real workspace.

Deployment and published browser results are appended after release.

## Acceptance still open
No real Slack workspace/bot credential was available in the Flux session; no real message was sent. A real user must connect their bot, invite it to a disposable public TEST channel, select that channel, check a safe preview, explicitly send one test message and verify its identifier in Slack. Until this passes, status is implemented + contract-tested, not provider-accepted. No need for the platform owner to own every future customer's service account.

## Continuation roadmap
1. Finish Slack provider acceptance when a dedicated TEST workspace is available; keep the feature's acceptance status visible.
2. Miro: board picker, real item read, card creation/update with named resources and explicit write controls.
3. GitHub: use the stored personal credential for private issue reads; permission-aware repository picker, then issue creation.
4. Airtable/HubSpot/Notion: named resource discovery and end-to-end writes through personal credentials, retaining existing readers.
5. Google Sheets/Drive/Calendar: Flux-owned OAuth app/scopes/callbacks, per-user refreshable connections. No shared developer credentials masquerading as customer connections.
6. Continue the catalog in complete vertical slices; list each implemented action separately from unimplemented actions and provider acceptance.

## Primary API references
https://docs.slack.dev/reference/methods/conversations.list/
https://docs.slack.dev/reference/methods/conversations.info/
https://docs.slack.dev/reference/methods/chat.postMessage/
https://docs.slack.dev/reference/methods/auth.test/
