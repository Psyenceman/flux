# Flux Studio v0.1 — User accounts and private workspaces
Status: approved product direction; architecture proposal, not implemented.
Date: 2026-11-05

## Core model
- Each registered user has a private workspace by default.
- Users create, name, duplicate, edit, activate/deactivate and delete their own workflows.
- Private dashboard: My Automations, New Automation, Connections, Executions, Settings.
- Free signup/login: verified email and password, password reset. Google login optional later.
- No billing in v0.1. Quotas protect free infrastructure.

## Security invariants
- Identity from a verified server-side session/JWT, never from a client-supplied user_id.
- All workflows, executions, connector credentials and logs carry owner_id/workspace_id; enforce ownership at database RLS and API level.
- Server endpoints must verify authorization before reading, running, editing, deleting or exporting a workflow.
- No global FLUX_WEBHOOK_TOKEN as an end-user auth mechanism; migrate to per-user authenticated endpoints and scoped webhook secrets.
- Store external credentials encrypted at rest, never in graph JSON or localStorage. Prefer OAuth when feasible.
- Audit authentication, workflow changes, connector access and execution activity; redact secrets and sensitive payloads.
- Rate limits, payload limits, CSRF protections where cookie auth is used, secure cookies and session expiry.
- Separate development and production databases and secrets.

## Suggested schema
profiles(id UUID PK references auth.users, display_name, created_at)
workspaces(id UUID PK, owner_id UUID references profiles, name, created_at)
workspace_members(workspace_id, user_id, role) [future collaboration; v0.1 only owner]
workflows(id UUID PK, workspace_id, owner_id, name, description, graph_json JSONB, status, version, created_at, updated_at)
connections(id UUID PK, workspace_id, owner_id, provider, display_name, encrypted_credentials_ref, created_at)
workflow_runs(id UUID PK, workflow_id, workspace_id, owner_id, status, started_at, finished_at, trace_redacted JSONB)
webhook_endpoints(id UUID PK, workflow_id, secret_hash, enabled, created_at)

## Delivery milestones
A. Choose free-tier identity + DB backend after reviewing costs and hosting compatibility (Supabase Auth/Postgres RLS is one option; Cloudflare D1 + external identity is another).
B. Create isolated TEST environment and database, migrations, RLS ownership tests.
C. Register, verify email, login, logout, reset password.
D. Private dashboard + workflows CRUD with versioning and autosave.
E. Graph runner authorizes ownership; per-user execution history and credentials vault.
F. Security tests: cross-user access denied for all resources, session expiry, secret leakage, API misuse.
G. Mobile-first UX, onboarding and user documentation.

## Current status
Current Flow Canvas uses browser localStorage for graph drafts; it is not a secure multiuser workspace. The experimental graph runner authenticates with a shared server token. Do not offer public multiuser accounts until authorization, storage, and credential isolation are implemented and tested.
