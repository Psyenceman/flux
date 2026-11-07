# AUTH-01 — duplicate email registration, TEST
2026-11-07. Baseline 46969a3.

## Database evidence (read-only)
Verified Flux account connection and project flux-test / sgxinvmfkznzoueqjzop. Normalized duplicate email groups among non-SSO auth.users: 0. Supabase-managed users_email_partial_key is UNIQUE(email) WHERE is_sso_user=false. Auth API remains authoritative and handles concurrent signups; no duplicate client-side user table or schema change added. Existing auth tables not modified.

## Fix
Shared normalizeEmail trims outer spaces and lowercases email for signup and both existing password sign-in paths. Passwords remain unchanged. Legacy playground signup previously announced Account created whenever error was null, including obfuscated duplicate responses. New shared registration helper handles explicit existing-email errors and no-session/empty-identity obfuscated duplicate response, directs users to sign in, and describes pending confirmation without claiming completion. No unauthenticated user-list/email-existence endpoint. Double submission suppressed while auth request pending; buttons restored and password cleared on completion.

## Verification
122 automated tests pass, Studio build and syntax checks pass. Cases: normalized variants, explicit duplicate, obfuscated duplicate, pending confirmation, malformed input and upstream error. Live database invariant checked read-only. No test accounts created, confirmation emails sent, passwords changed or user rows removed. Live duplicate-signup submission not performed. Deployment to TEST pending verification. Production unchanged.

## Limits
Existing Supabase-managed API uniqueness applies to current non-SSO email/password flow. Future SSO/OAuth providers require identity linking review. Plus addressing and dot aliases are not collapsed; they may be distinct addresses.
