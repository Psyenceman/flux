-- TEST ONLY. Apply to Supabase flux-test after reviewing existing role and wallet schema.
-- No payment processing, subscription billing or PROD changes.
create table if not exists public.flux_plan_catalog(
 plan_id text primary key check(plan_id in ('free','pro','business')),
 max_automations integer not null check(max_automations>0),
 max_active_automations integer not null check(max_active_automations>0),
 max_monthly_runs integer not null check(max_monthly_runs>0),
 monthly_coin_grant integer not null check(monthly_coin_grant>=0),
 created_at timestamptz not null default now()
);
insert into public.flux_plan_catalog(plan_id,max_automations,max_active_automations,max_monthly_runs,monthly_coin_grant)
values ('free',3,1,100,100),('pro',30,10,5000,5000),('business',200,100,50000,50000)
on conflict(plan_id) do nothing;
create table if not exists public.flux_user_plans(
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan_id text not null default 'free' references public.flux_plan_catalog(plan_id),
 updated_at timestamptz not null default now()
);
create table if not exists public.flux_admin_credit_adjustments(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id),
 target_user_id uuid not null references auth.users(id),
 delta integer not null check(delta<>0 and delta between -100000 and 100000),
 reason text not null check(length(btrim(reason)) between 8 and 240),
 request_id uuid not null unique,
 created_at timestamptz not null default now()
);
alter table public.flux_plan_catalog enable row level security;
alter table public.flux_user_plans enable row level security;
alter table public.flux_admin_credit_adjustments enable row level security;
revoke all on public.flux_plan_catalog,public.flux_user_plans,public.flux_admin_credit_adjustments from anon,authenticated;
grant select on public.flux_plan_catalog to authenticated;
grant select on public.flux_user_plans to authenticated;
grant select on public.flux_admin_credit_adjustments to authenticated;
create policy flux_plan_catalog_read_test on public.flux_plan_catalog for select to authenticated using(true);
create policy flux_user_plans_owner_read_test on public.flux_user_plans for select to authenticated using(user_id=(select auth.uid()));
create policy flux_admin_adjustments_actor_read_test on public.flux_admin_credit_adjustments for select to authenticated using(actor_id=(select auth.uid()));
create or replace function public.flux_admin_adjust_coins_test(p_target uuid,p_delta integer,p_reason text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; new_balance integer; existing record;
begin
 actor:=auth.uid();
 if actor is null or not exists(select 1 from public.profiles where id=actor and role='super_admin')
 then raise exception 'Forbidden' using errcode='42501';end if;
 if p_target is null or p_request_id is null or p_delta is null or p_delta=0 or abs(p_delta)>100000
 or length(btrim(coalesce(p_reason,''))) not between 8 and 240 then
 raise exception 'Invalid adjustment' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into existing from public.flux_admin_credit_adjustments where request_id=p_request_id;
 if found then
  if existing.actor_id<>actor or existing.target_user_id<>p_target or existing.delta<>p_delta or existing.reason<>btrim(p_reason)
  then raise exception 'Idempotency key conflict' using errcode='23505';end if;
  select balance into new_balance from public.flux_credit_accounts where user_id=p_target;
  return jsonb_build_object('ok',true,'duplicate',true,'balance',new_balance);
 end if;
 if not exists(select 1 from auth.users where id=p_target) then raise exception 'Target not found' using errcode='22023';end if;
 insert into public.flux_credit_accounts(user_id,balance) values(p_target,0) on conflict(user_id) do nothing;
 update public.flux_credit_accounts set balance=balance+p_delta,updated_at=now()
 where user_id=p_target and balance+p_delta>=0 returning balance into new_balance;
 if not found then raise exception 'Insufficient balance' using errcode='22023';end if;
 insert into public.flux_admin_credit_adjustments(actor_id,target_user_id,delta,reason,request_id)
 values(actor,p_target,p_delta,btrim(p_reason),p_request_id);
 insert into public.flux_credit_ledger(user_id,delta,action)
 values(p_target,p_delta,'admin_adjustment');
 return jsonb_build_object('ok',true,'duplicate',false,'balance',new_balance);
end $$;
revoke all on function public.flux_admin_adjust_coins_test(uuid,integer,text,uuid) from public,anon;
grant execute on function public.flux_admin_adjust_coins_test(uuid,integer,text,uuid) to authenticated;
-- Plan limits are a proposed TEST policy; enforcement must be integrated into create/run RPCs before launch.
