# Flux Requests — first real automation (experimental)

This server-side endpoint is a **first integration slice**, not yet the full Flux workflow engine. It accepts a request, validates it and optionally sends a notification to a configured HTTPS webhook. It does **not** write to a database, schedule jobs or execute arbitrary Flux programs.

## Deployment configuration

On the Netlify site, set server-side environment variables (never in Studio JavaScript or Git):
- `FLUX_WEBHOOK_TOKEN`: a random secret of at least 24 characters, for example generated using `openssl rand -hex 32`.
- `FLUX_NOTIFICATION_WEBHOOK_URL`: optional HTTPS URL to receive the notification. The destination must be controlled by the operator; use a test destination before production.

The function should be available at `/.netlify/functions/flux-request` **if Netlify deploys the functions directory**. Confirm the site's build configuration and deploy status; committing the file alone does not prove the endpoint is active.

## Example (replace host and secret)

```bash
curl -i -X POST 'https://flux.flussia.it/.netlify/functions/flux-request' \
  -H 'Content-Type: application/json' \
  -H "x-flux-token: $FLUX_WEBHOOK_TOKEN" \
  --data '{"name":"Test Customer","email":"test@example.com","message":"Hello from Flux","dryRun":true}'
```

Set `dryRun:false` or omit it to attempt the configured outbound notification. Without `FLUX_NOTIFICATION_WEBHOOK_URL`, the request is validated but **not stored or forwarded**.

## Security and next milestone

- The secret must stay server-side. Never embed it in a public page or share it in a URL.
- Authentication is required even for dry runs. Missing secret disables the endpoint.
- Requests have size and field limits; no arbitrary source execution.
- Logs are operational diagnostics, **not durable request storage**.
- Production readiness still requires a database, durable run history, rate limiting, idempotency/retries, managed secrets, and integration tests.
- Next: database persistence and a server-side execution engine linked to Flux Studio, then verified end-to-end tests.
