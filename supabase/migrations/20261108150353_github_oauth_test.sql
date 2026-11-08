-- Flux TEST only. OAuth state is server-only; no public client access.
create table public.flux_github_oauth_states (
 state_hash text primary key,
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 phase text not null default 'authorize' check (phase in ('authorize','install')),
 claim_nonce uuid,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.flux_github_oauth_states enable row level security;
revoke all on public.flux_github_oauth_states from public, anon, authenticated;
grant all on public.flux_github_oauth_states to service_role;
create index flux_github_oauth_states_expiry on public.flux_github_oauth_states(expires_at);
create function public.flux_finalize_github_oauth(p_state_hash text,p_claim_nonce uuid,p_ciphertext text,p_label text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare owner_uuid uuid;
begin
 delete from public.flux_github_oauth_states
 where state_hash=p_state_hash and claim_nonce=p_claim_nonce and expires_at>now()
 returning owner_id into owner_uuid;
 if owner_uuid is null then return false; end if;
 insert into public.flux_connector_credentials(owner_id,provider,token_ciphertext,account_label,updated_at)
 values(owner_uuid,'github',p_ciphertext,left(p_label,100),now())
 on conflict(owner_id,provider) do update set token_ciphertext=excluded.token_ciphertext,account_label=excluded.account_label,updated_at=excluded.updated_at;
 return true;
end; $$;
revoke all on function public.flux_finalize_github_oauth(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.flux_finalize_github_oauth(text,uuid,text,text) to service_role;
