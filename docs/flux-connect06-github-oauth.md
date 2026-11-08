# CONNECT-06 — GitHub App authorization and connections UI (TEST)

Date: 2026-11-08. Branch: `test/trello-popup-feedback`.
Production is excluded. Builds publish `studio` through `scripts/build-studio.mjs` into `site`; Netlify Functions supply the API. Existing CONNECT-05 personal-token/public GitHub executors are retained.

## Delivered implementation

- Connect GitHub opens a separate popup synchronously, checks the signed-in Flux session and starts GitHub App OAuth. Fixed callback/origin: `https://flux-studio-test.netlify.app/.netlify/functions/github-oauth-callback`.
- Popup completion checks origin and source, then reloads server connection status before showing connected. Closing, cancellation, expiry, blocked popups and missing configuration have explicit feedback. Both the account connection manager and GitHub block use the same controller.
- Installation is requested only when the authorized GitHub App has no accessible installation with Issues write permission. The installation callback must perform user authorization again. No broad OAuth `repo` scope is requested.
- Credentials remain encrypted in the existing server vault, scoped to the authenticated Flux owner. Existing personal tokens still work. Expiring user access and refresh tokens are supported, with a ciphertext compare-and-swap lease to prevent concurrent rotating-token refresh. Concurrent runs can receive a retry message; outbound mutations are never automatically retried.
- OAuth state is random, hashed, expires after ten minutes, has one pending attempt per owner and requires a matching HttpOnly Secure SameSite=Lax callback cookie. Claims are single use. Final state consumption and credential save are one SQL transaction. Disconnect or saving a manual token cancels pending authorization and prevents a late callback from restoring it. Local disconnect does not revoke GitHub authorization; users can revoke it in GitHub settings.
- Connections now use searchable white cards, status badges, a primary blue hover/glow connection button and reduced-motion support. Manual credentials and technical details are collapsed. Removed the duplicate homepage creation CTA and hid editor-only instructions on the automation home.

## Database

Applied ONLY to Flux TEST project `sgxinvmfkznzoueqjzop`: `supabase/migrations/20261108150353_github_oauth_test.sql`.
`flux_github_oauth_states` has RLS and no client policies. All client table privileges are revoked. `flux_finalize_github_oauth` is SECURITY INVOKER, executable only by service_role. Read-only database checks confirmed RLS enabled, anon/authenticated SELECT and function EXECUTE denied, service_role EXECUTE allowed.
A transactional SQL fixture for successful finalization was not executed: the tool confirmation expired. Do not count it as a database integration pass. Successful real provider authorization remains an acceptance gate.
Existing advisor warnings for credit RPCs and password protection were not changed by this milestone. The new deny-all OAuth state table intentionally produces the RLS-without-policy informational advisory.

## One-time provider setup still required

No GitHub App client ID/secret/slug exists in the TEST Netlify environment. Therefore authorization remains disabled with truthful setup feedback; it is not advertised as a live connector acceptance pass.

Register a **GitHub App**, not an OAuth App:

1. Homepage: `https://flux-studio-test.netlify.app`.
2. First and only callback: `https://flux-studio-test.netlify.app/.netlify/functions/github-oauth-callback`.
3. Enable **Request user authorization (OAuth) during installation**. Do not configure a separate Setup URL. Keep expiring user authorization tokens enabled.
4. Disable webhooks. Repository permissions: **Issues read and write**, **Metadata read-only** (automatic). No code permissions are needed. Allow installation by other accounts if this TEST is used by external testers. Each user should choose only the repositories they want Flux to access.
5. Add `FLUX_GITHUB_APP_CLIENT_ID`, `FLUX_GITHUB_APP_CLIENT_SECRET`, `FLUX_GITHUB_APP_SLUG` to Functions on the **flux-studio-test** Netlify site only. Mark the secret as secret. Keep credentials out of chat, source control and frontend variables. The existing `FLUX_CONNECTION_ENCRYPTION_KEY` is reused. Rebuild TEST after setting environment values.

End users subsequently enter through Connect GitHub and GitHub consent/repository selection; they do not create personal tokens. Provider consent screens mean this is one entry action, not a promise of no further provider confirmations.

## Verification and remaining gates

Build and automated suite must pass before deployment. The suite covers state hashing and cookies, invalid/replayed callbacks, ownership, conditional installation continuation, encrypted atomic finalization, provider failures, PAT compatibility, refresh leases/CAS races, popup origin/source validation and missing-configuration feedback.

Real GitHub App acceptance is pending registration: authorize an existing installation; authorize with a new selected-repository installation; cancel consent; close popup; private repository discovery/read; explicitly approved issue creation; refresh/revocation; disconnect during a pending callback. No real private issue or public issue was created by this milestone.
GitHub installation verification currently reads the first 100 accessible installations; unusually large installation lists require pagination.
Graphical scope is the connections experience and homepage cleanup. It does not establish platform-wide premium UX or mobile acceptance. Other connector provider tests and the broader roadmap retain their previous documented status.

Rollback: keep the credential-envelope decoder while any GitHub App credentials remain stored, or explicitly disconnect/replace those credentials first. Do not roll back to a plain-PAT-only reader against OAuth envelopes.

## Published verification

Source commit `e4963fbf727ea6afc1d1a2068f3c69fde2c437e3`; TEST deploy `6af09c228032d7df5d0bf9bf` ready, exact commit match. `npm run build:studio`, `git diff --check`, and **181 tests passed, 0 failed**.
Published API checks: status 200 with configured=false and connected=false; anonymous start 401; callback without state safely rejects verification. Browser guest QA: root resolves to the automation home, one primary new-automation CTA, connection search filters to one GitHub card, Advanced opens/closes the credential field, close/reopen retains a functioning search/controller, Connect GitHub is disabled and explicitly reports setup pending. Screenshot captured of the published filtered connection card. Actual provider popup consent, connected feedback, private reads/writes and mobile viewport acceptance remain pending; automated popup tests do not replace those provider checks.
Production deploy remained `6aedc72f553859dcc804e34c`, unchanged.

## Provider registration update

2026-11-08: user registered GitHub App `flux-studio-test` under Psyenceman and added the three GitHub App environment keys to the TEST Netlify site (presence verified without logging values). Rebuild requested to load these settings. Provider acceptance remains pending; presence of credentials does not prove validity or consent completion.
