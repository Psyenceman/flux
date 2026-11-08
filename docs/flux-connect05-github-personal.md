# CONNECT-05 — personal GitHub repositories and issue creation

2026-11-08. Baseline c6b219d5f026ab7dafc879a53a8abea0be331d5c. Branch test/trello-popup-feedback; flux-studio-test.netlify.app only. Production excluded.

## Delivered behavior
GitHub now supports public reads without credentials, private/personal issue reads using the authenticated owner's saved encrypted token, and issue creation with title/description mapped from connected upstream data. No automatic fallback from a failed personal connection to public access. Existing public read graph definitions remain compatible.

Editor: choose Public repository or My connected repositories for reads. Public mode accepts a familiar GitHub repository address. Personal mode and Create issue use a named repository picker, with 50 entries/page, refresh/load-more, saved selection, stale-response rejection and disposal. Discovery lists active, issues-enabled repositories visible to the token. It is bounded to 200 pages/10,000 entries; narrowing token access is required beyond that. No raw repository ID or credential in the block form.

The existing Slack selection controller is extracted into a reusable resource-choice module, with compatible Slack wrapper and a GitHub wrapper. Existing Slack tests remain passing. This keeps provider-specific configuration while sharing loading/selection/error behavior.

Safe creation previews the resolved title and description with simulated status and no GitHub requests. Real creation checks repository access, posts once to the fixed GitHub API and requires a valid issue number/ID. A constructed trusted GitHub link opens the created issue. Read returns the first page of up to 20 open entries, excluding pull requests, and reports hasMore. It does not imply a full-repository scan.

Live TEST permits one GitHub create action with supported read/local steps and at most three external nodes, using the shared editor/server policy. Explicit per-run confirmLiveGithub is required. Mixed/multiple writes stay blocked. Existing Trello, Slack and Miro policies remain. No unattended API/webhook/scheduler writes enabled.

## Security and permissions
Per-session owner query for GitHub credentials; graph owner_id ignored. Never send stored credentials for explicitly public-mode reads. Private reads and creation fail when no personal credential exists, before credit consumption. Repository availability checked before debit and again before creating. Actual Issues write permission is enforced by GitHub and can still fail after debit. Existing deferred FCX accounting unchanged.

Fixed api.github.com destinations; validated owner/name paths; redirects rejected; 10-second timeout; no automatic creation retries. On ambiguous success/timeout, inspect the repository before retrying; exactly-once delivery is not claimed. No code/branch changes through this connector, only issues. No provider response body or secret in error messages. Credentials remain in the existing encrypted server vault. No schema/RLS/auth configuration change.

Connection setup currently uses a user-provided personal token, preferably fine-grained, restricted to chosen repositories with Issues read permission and write for creation. A platform OAuth/GitHub App installation flow is not included. GitHub connector access inside Flux is separate from the ChatGPT GitHub connection.

## Verification
169 automated tests passed; build:studio, inline-module syntax and whitespace checks passed. New tests cover named pagination, private headers vs credential-free public requests, no public fallback, mapped creation and safe preview, trusted returned links, invalid destinations/fields, provider errors, uncertain creation without retry, shared live policy, owner-scoped encrypted loading, confirmation and denied preflight before charging, resource endpoint and picker restore/clearing. Provider private/write responses are controlled fixtures.

Direct public provider read against Psyenceman/flux passed again with the current reader (actual item count is in the session test output). No real private repository read or issue creation performed. No customer token collected or persisted for QA.

Published source 9424e5407d899b39041db3a4d4780a98b6cc950c as TEST deploy 6af08c5e02aa8585b2f35560, followed by placeholder fix 1b7fcb869ad2074bfaed5eb8df183762ede8c22e as ready deploy 6af08d1b1a3566feae52c3cc. Both branch test/trello-popup-feedback, matching source.
Browser https://flux-studio-test.netlify.app/flow-canvas.html: add GitHub after Log creates its connection; default Public repository read saves Psyenceman/flux and reopens preserving it; switching to My connected repositories shows named selector, refresh and sign-in recovery; Save is rejected without an available repository. Create issue forces connected mode and shows title/description fields. On final deploy, public-to-create switch with a saved repository correctly shows Choose a repository while signed out, rather than an empty selection. Screenshot flux-github-personal-test-final-20261108.jpg records final form. No credentials entered and no actual private read/write executed. Published github-resources without auth returns 401. Public provider read returned count=1, hasMore=false. Production remains deploy 6aedc72f553859dcc804e34c.

## Open acceptance
Real personal connection, private issue reading, issue creation on a disposable repository, and verifying the returned issue link remain OPEN until exercised with that user's TEST credential. Fully provider-accepted connector count is not increased by mocked private/write acceptance. Public GitHub reader retains its previous real/provider/browser acceptance. OAuth onboarding, broader pagination/mapping UI, retries/idempotency, mobile/cross-browser checks and final accounting remain later milestones.

## References
https://docs.github.com/en/rest/repos/repos
https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28
