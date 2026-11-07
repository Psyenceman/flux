-- Flux Studio PHASE 6 / TEST ONLY. Execute on project sgxinvmfkznzoueqjzop.
-- First stage: plan metadata, RLS and audited admin credit adjustments.
-- No production, payments, subscription activation, or automation triggers.
BEGIN;

CREATE TABLE IF NOT EXISTS public.flux_plan_catalog (
 plan_id text PRIMARY KEY CHECK (plan_id IN ('free','pro','business')),
 max_automations integer NOT NULL CHECK (max_automations>0),
 max_active_automations integer NOT NULL CHECK (max_active_automations>0),
 max_monthly_runs integer NOT NULL CHECK (max_monthly_runs>0),
 monthly_coin_grant integer NOT NULL CHECK (monthly_coin_grant>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.flux_plan_catalog
 (plan_id,max_automations,max_active_automations,max_monthly_runs,monthly_coin_grant)
VALUES ('free',3,1,100,100),('pro',30,10,5000,5000),('business',200,100,50000,50000)
ON CONFLICT (plan_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.flux_user_plans (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 plan_id text NOT NULL DEFAULT 'free' REFERENCES public.flux_plan_catalog(plan_id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.flux_admin_credit_adjustments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 target_user_id uuid NOT NULL REFERENCES auth.users(id),
 delta integer NOT NULL CHECK (delta BETWEEN -100000 AND 100000 AND delta<>0),
 reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 8 AND 240),
 request_id uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flux_plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flux_user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flux_admin_credit_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.flux_plan_catalog,public.flux_user_plans,public.flux_admin_credit_adjustments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.flux_plan_catalog,public.flux_user_plans,public.flux_admin_credit_adjustments TO authenticated;
DROP POLICY IF EXISTS flux_plan_catalog_read_test ON public.flux_plan_catalog;
CREATE POLICY flux_plan_catalog_read_test ON public.flux_plan_catalog FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS flux_user_plans_owner_read_test ON public.flux_user_plans;
CREATE POLICY flux_user_plans_owner_read_test ON public.flux_user_plans FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS flux_admin_adjustments_actor_read_test ON public.flux_admin_credit_adjustments;
CREATE POLICY flux_admin_adjustments_actor_read_test ON public.flux_admin_credit_adjustments FOR SELECT TO authenticated USING (actor_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.flux_admin_adjust_coins_test(
 p_target uuid,p_delta integer,p_reason text,p_request_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 v_actor uuid;
 v_balance integer;
 v_existing public.flux_admin_credit_adjustments%ROWTYPE;
BEGIN
 v_actor:=auth.uid();
 IF v_actor IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id=v_actor AND role='super_admin'
 ) THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_target IS NULL OR p_request_id IS NULL OR p_delta IS NULL
 OR p_delta=0 OR p_delta NOT BETWEEN -100000 AND 100000
 OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 8 AND 240
 THEN RAISE EXCEPTION 'Invalid adjustment' USING ERRCODE='22023'; END IF;

 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 SELECT * INTO v_existing FROM public.flux_admin_credit_adjustments WHERE request_id=p_request_id;
 IF FOUND THEN
  IF v_existing.actor_id<>v_actor OR v_existing.target_user_id<>p_target
   OR v_existing.delta<>p_delta OR v_existing.reason<>btrim(p_reason)
  THEN RAISE EXCEPTION 'Idempotency key conflict' USING ERRCODE='23505'; END IF;
  SELECT balance INTO v_balance FROM public.flux_credit_accounts WHERE user_id=p_target;
  RETURN jsonb_build_object('ok',true,'duplicate',true,'balance',v_balance);
 END IF;

 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_target)
 THEN RAISE EXCEPTION 'Target user not found' USING ERRCODE='22023'; END IF;
 -- Existing wallet balances remain unchanged. New wallet uses its existing DEFAULT (100).
 INSERT INTO public.flux_credit_accounts(user_id) VALUES(p_target)
 ON CONFLICT (user_id) DO NOTHING;
 UPDATE public.flux_credit_accounts
 SET balance=(balance::bigint+p_delta)::integer,updated_at=now()
 WHERE user_id=p_target AND balance::bigint+p_delta BETWEEN 0 AND 2147483647
 RETURNING balance INTO v_balance;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance or balance overflow' USING ERRCODE='22023'; END IF;
 INSERT INTO public.flux_admin_credit_adjustments(actor_id,target_user_id,delta,reason,request_id)
 VALUES(v_actor,p_target,p_delta,btrim(p_reason),p_request_id);
 INSERT INTO public.flux_credit_ledger(user_id,delta,action)
 VALUES(p_target,p_delta,'admin_adjustment');
 RETURN jsonb_build_object('ok',true,'duplicate',false,'balance',v_balance);
END
$fn$;
REVOKE ALL ON FUNCTION public.flux_admin_adjust_coins_test(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.flux_admin_adjust_coins_test(uuid,integer,text,uuid) TO authenticated;

COMMIT;
-- Deliberately NOT included: active automation quota trigger and monthly run metering.
-- These require separate compatibility and real-role tests before enabling.
