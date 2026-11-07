# CONNECT-01 — real reader activation, TEST only
2026-11-07. Baseline 7cdef48.

## Delivered
- GitHub list_issues: actual fixed-host public repository API, 20 items/page, excludes pull requests, reports hasMore, explicit 404/rate-limit errors. No private repo or writes implied. Repo input accepts owner/name or canonical GitHub URL.
- Notion search_pages: real search request using encrypted owner credential already supported by connection storage. Pages shared with the integration only; no page writes. Bounded 20-result page, hasMore preserved. API version pinned to existing connection verification version 2022-06-28.
- Airtable personal tokens no longer blocked by a global base allowlist intended for shared server credentials. Shared server access retains the allowlist.
- Owner-scoped Airtable/HubSpot/Notion credentials and Trello validity checked BEFORE existing credit debit; missing connection returns 409, not fake execution or a charged skipped result.
- Block modal routes to My connections for personally connected providers. GitHub public reads do not ask for an unavailable OAuth connection.
- Palette distinguishes connection-required Notion and ready public GitHub reads.

## Evidence
114 automatic tests pass; Studio build passes. Tests cover fixed destinations, redirects disabled, hostile repository inputs, denied writes, rate limits, missing credentials, owner query scoping, downstream propagation and credit preflight. Direct live read of Psyenceman/flux: one actual issue, hasMore false. Published authenticated browser test pending.

## Actual account state observed
Flux My connections: Airtable / HubSpot / Notion not connected. Trello connected in previous authenticated QA. No tokens collected, persisted or printed in this change.

## Status and remaining work
GitHub public issues is executable and provider-read verified; Notion reader is implemented and mock-tested, actual provider authorization pending. Airtable/HubSpot readers remain dependent on actual personal connections. Neither storage nor a config form proves active integration. Google Sheets/Supabase/Telegram/Resend still depend on existing server configuration; no broad live-write permissions unlocked. Other external providers still require separate integrations. API and webhook/scheduler remain restricted; no unattended external execution enabled. Stripe/billing redesign deferred by owner.

## References
https://docs.github.com/en/rest/issues/issues
https://developers.notion.com/reference/post-search
