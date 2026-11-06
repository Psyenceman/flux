-- TEST ONLY. Run on Flux TEST Supabase, never on another project's database.
create table if not exists public.flux_connector_credentials (
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('airtable','hubspot','notion')),
  token_ciphertext text not null,
  account_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(owner_id,provider)
);
alter table public.flux_connector_credentials enable row level security;
revoke all on public.flux_connector_credentials from anon, authenticated;
-- Only the server-side service role can read/write ciphertext.
