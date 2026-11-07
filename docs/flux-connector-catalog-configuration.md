# CONNECT-02 — configurable catalog and personal credentials
2026-11-07, TEST only. Baseline 372a086.

## Product distinction
A configured block is NOT proof of an executable provider action. Existing editor schemas retain all provider actions; GitHub create_issue and Notion create_page are now explicitly configurable pending execution. Public catalog lists 23 external connectors with actions, connection mode, help and executor status. Internal blocks retain their existing configuration.

## Implemented
- All external block modals route to My connections rather than a generic coming-soon button. Trello keeps its working popup/resource selectors. GitHub public-read exception remains.
- All catalog providers visible in My connections, including signed-out help. Nine providers support verified encrypted personal token storage: Airtable, HubSpot, Notion, GitHub, Miro, Slack, OpenAI, Cloudflare, Resend. Each uses a fixed provider endpoint; redirects rejected; provider-level failure checked even on HTTP 200. No AI generation, messages, emails or resource mutations happen during verification.
- Google Sheets/Drive/Calendar, WhatsApp, Discord, Stripe and Shopify explicitly require a Flux-owned OAuth app before user authorization. Other service adapters are explicitly marked incomplete. No disabled app was represented as connected.
- Structured field/value controls replace raw object/array JSON in ordinary Airtable, Sheets, Supabase, HubSpot, HTTP and database forms. Typed rows support text/number/boolean, with structured JSON only as an explicit advanced choice. Duplicate keys and invalid typed values block save. Existing invalid data requires explicit reset instead of silent loss.
- Provider constraint expanded in TEST vault; existing PK(owner_id,provider), FK, RLS and revoked anon/authenticated table grants retained. Authenticated server verifies owner, then provider, then encrypts credential; no token returned or stored in graph/localStorage.

## Validation
127 automatic tests passed; build:studio and syntax checks passed. Tests cover catalog coverage, nine fixed verification endpoints, provider-level failure, encrypted save scoped to authenticated owner despite hostile owner_id, field serialization and invalid/duplicate values. Migration applied via Supabase migration API to flux-test / sgxinvmfkznzoueqjzop only. Post-change SQL confirms RLS enabled, anon SELECT=false, authenticated SELECT=false and expanded constraint.
Security advisors unchanged: five intentional deny-all RLS tables without policies; two existing SECURITY DEFINER RPC warnings; existing leaked-password protection disabled. Existing guard review remains in roadmap. References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Not claimed complete
This does not implement missing provider executors, OAuth registrations, resource discovery for all providers, or generic production-safe outbound destinations. Credential verification for newly added providers is mock-tested; real user authorization still requires that user's account/key. Saved credentials for new providers are not yet used by unavailable executors. Never label these actions operational until tested. Provider API permissions can restrict identity/list verification; UI reports that without saving. Stripe platform billing remains deferred.

## Operations
Migration: 20261107212842_connector_catalog_test.sql. Recovery: revert application code first; do not contract provider CHECK while new-provider rows exist. No rows deleted. No production changes. TEST source commit b2cb487aa188d408057ad5f836cb986b1b686128 deployed successfully as Netlify deploy 6aef986202aa8585b2b9c412 (ready, matching commit). Browser QA on https://flux-studio-test.netlify.app/flow-canvas.html verified all 23 catalog entries while signed out, provider-specific help/status, HubSpot action switching to Create contact, adding email=qa@example.test through field controls, saving and reopening with values preserved, and Manage connection returning to My connections. No provider credentials submitted, no external actions run. Browser noted the legacy “Contact JSON” heading still appears above the guided controls; remove the remaining technical label in the next UX polish.

## Provider references
https://docs.slack.dev/reference/methods/auth.test/
https://developers.miro.com/reference/get-boards
https://developers.openai.com/api/reference/resources/models/methods/list
https://developers.cloudflare.com/api/resources/user/subresources/tokens/
