# UX-05 / CONNECT-04 — one product entrance and Miro execution

2026-11-08. Baseline f9301f0c1ae0e67bf19d205f9bd1356c10c648df. Branch test/trello-popup-feedback. TEST only: flux-studio-test.netlify.app. Production flux.flussia.it excluded.

## Product decision
The language playground is a developer tool, not the customer's SaaS entrance. Keep the existing canvas/graph/session instead of building another app. Root and index.html now redirect temporarily to flow-canvas.html, whose existing Automations view is the landing area. Preserve query parameters and hash in the static fallback. Canvas header no longer links to Workflow Lab or the old Studio. Brand navigation opens Automations without discarding the current graph.

Ordinary navigation: Automations, Scenario builder, Run history, Help, My connections, account. The dashboard Connections shortcut opens the actual connection manager. Cloud/webhook tools remain under advanced settings. Existing language editor/lessons/reference are preserved at developer-lab.html; Workflow Lab and Webhook Test stay as separately named development tools. They are not linked from the customer header and have noindex,nofollow. These are navigation/indexing changes, NOT authentication or access control: people with direct URLs can still open these static development pages. No claim of admin-only protection is made.

Account registration is now reachable inside the canvas account dialog. It reuses the same Supabase client and registerAccount duplicate-email handling, switches back to sign-in for existing accounts or pending email confirmation, clears the password and blocks concurrent signup. Existing login/logout/private overview remains. No users created, signup emails sent, or Supabase configuration changed for this release. Email-confirmation delivery and a fresh real signup remain unverified.

## Miro implemented actions
- Read cards: real stable-v2 fixed-host API, up to 50 cards. Optional title-contains filter is explicitly scoped to that first page; count and hasMore do not imply all-board search.
- Create card: title + description from guided fields and connected upstream mappings. Safe test previews without writing. Real run POSTs card data and requires a confirmed returned card ID.
- Update card: select an existing card by name and change its title only. PATCH omits unrelated properties so they are preserved. Safe test previews. Real run requires card access and a confirmed response.
- Named board picker (offset pages of 50, cap 10,000 with explicit truncation), card picker (cursor pages of 50), refresh/error/empty states, saved selection across pages, stale-response rejection and disposal. No ordinary board/card ID inputs.

All resource discovery and execution use the authenticated owner's encrypted Miro credential. Miro requires boards:read and boards:write for edits. Connecting verifies read access; write permission is still decided by Miro. No platform-wide personal credential fallback.

Live TEST permits one Miro card edit with supported read/local steps, max three external graph nodes, or the existing Slack/Trello policies. Mixed or multiple writes remain denied. Miro reads can feed Slack workflows. Server and editor share the policy. Explicit confirmLiveMiro required. Existing API/webhook/scheduler live permissions remain unchanged. Existing FCX accounting is deferred and unchanged.

## Security and validation
Fixed api.miro.com/v2 host, encoded validated resource paths, bearer header only, redirects rejected, timeouts and no automatic write retry. Malformed responses and denied targets never count as completed. Plain title/description input escaped for Miro HTML fields. No raw provider errors or credentials echoed. Owner_id supplied by the graph ignored. Target access checked before existing credit debit and again before writing; write-specific permissions and provider errors may still fail after debit. Exactly-once delivery is not claimed.

157 automatic tests passed. Studio build, inline module syntax and whitespace checks passed. New tests exercise real handler/engine paths with controlled provider responses: owner-scoped encrypted loading, confirmation, missing connection/denied target before charge, successful writes, first-page reads/downstream output, malformed responses, arbitrary URLs, write ambiguity, selector pagination/races/disposal/clearing, product redirect topology and account signup/duplicate/confirmation/double-submit behavior.

## Release acceptance
Published TEST deployment and browser checks pending; append evidence after release. Real Miro provider acceptance is OPEN: no actual Miro board was modified or credential collected. Existing Trello/GitHub acceptance remains unchanged; this does not increase the fully provider-accepted connector count yet. Real signup/confirmation delivery, mobile and cross-browser testing remain separate open checks.

## Next work
Complete Miro provider acceptance using a disposable board when a user-owned TEST connection is available. Continue GitHub private issues/repository discovery and personal resource discovery/writes for existing readers. Google integrations require the platform OAuth application before customer authorization. Do not recreate developer-page navigation in the customer product.

## Primary references
https://developers.miro.com/reference/get-boards-1
https://developers.miro.com/docs/rest-api-reference-guide
https://developers.miro.com/reference/create-card-item-1
https://developers.miro.com/reference/update-card-item-1
https://supabase.com/docs/reference/javascript/auth-signup
