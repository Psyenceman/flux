-- TEST only: expand verified personal provider types. No grants, policies or credentials changed.
BEGIN;
ALTER TABLE public.flux_connector_credentials DROP CONSTRAINT flux_connector_credentials_provider_check;
ALTER TABLE public.flux_connector_credentials ADD CONSTRAINT flux_connector_credentials_provider_check CHECK (provider IN ('airtable','hubspot','notion','github','miro','slack','openai','cloudflare','resend'));
COMMIT;
