# Flux Studio — Supabase TEST integration

Environment: `flux-test` (project ref `sgxinvmfkznzoueqjzop`).
This branch is for integration work; do not deploy it to production before testing.

## Existing experience
- Keep the public Flux editor, tutorials, and local execution working without an account.
- Preserve localStorage drafts and .flux download.
- Logged-in users may save and load their own projects.
- Never place Supabase secret/service_role keys in browser code.

## Integration sequence
1. Configure the public Supabase project URL and publishable key through the deployment environment.
2. Implement email authentication, session restoration and sign-out.
3. Add a private project list and cloud save/load with explicit user action.
4. Handle migration of an existing local draft without overwriting it.
5. Verify RLS with two independent test accounts: users must not read or modify each other's projects.
6. Add automation management UI; keep automations disabled until an execution service is implemented and tested.

## Database already created in TEST
- public.profiles
- public.projects
- public.automations
- public.automation_runs

All four have RLS enabled. No automatic execution engine is deployed.
