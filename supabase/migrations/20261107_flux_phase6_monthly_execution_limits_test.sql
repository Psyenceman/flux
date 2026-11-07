-- TEST ONLY: atomic monthly execution quotas across live manual runs, webhooks, scheduler.
BEGIN;
CREATE TABLE IF NOT EXISTS public.flux_monthly_run_usage_test(
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 month_start date NOT NULL,
 used integer NOT NULL DEFAULT 0 CHECK (used>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,month_start)
);
ALTER TABLE public.flux_monthly_run_usage_test ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.flux_monthly_run_usage_test FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.flux_monthly_run_usage_test TO service_role;

CREATE OR REPLACE FUNCTION public.flux_reserve_monthly_run_test(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_limit integer; v_used integer; v_month date;
BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'Missing owner' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND role='super_admin') THEN RETURN; END IF;
 SELECT c.max_monthly_runs INTO v_limit FROM public.flux_plan_catalog c
 WHERE c.plan_id=coalesce((SELECT up.plan_id FROM public.flux_user_plans up WHERE up.user_id=p_user),'free');
 IF v_limit IS NULL OR v_limit<0 THEN RAISE EXCEPTION 'Invalid plan quota' USING ERRCODE='22023'; END IF;
 v_month:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
 INSERT INTO public.flux_monthly_run_usage_test(user_id,month_start,used)
 VALUES(p_user,v_month,0) ON CONFLICT DO NOTHING;
 UPDATE public.flux_monthly_run_usage_test SET used=used+1,updated_at=now()
 WHERE user_id=p_user AND month_start=v_month AND used<v_limit RETURNING used INTO v_used;
 IF v_used IS NULL THEN RAISE EXCEPTION 'Monthly execution limit exceeded' USING ERRCODE='23514'; END IF;
END $fn$;
REVOKE ALL ON FUNCTION public.flux_reserve_monthly_run_test(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flux_reserve_monthly_run_test(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.flux_count_monthly_ledger_test()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NEW.action='workflow_run' AND NEW.delta=-1 THEN
  PERFORM public.flux_reserve_monthly_run_test(NEW.user_id);
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.flux_count_monthly_ledger_test() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS flux_ledger_monthly_run_quota_test ON public.flux_credit_ledger;
CREATE TRIGGER flux_ledger_monthly_run_quota_test BEFORE INSERT ON public.flux_credit_ledger
FOR EACH ROW EXECUTE FUNCTION public.flux_count_monthly_ledger_test();

CREATE OR REPLACE FUNCTION public.flux_count_scheduled_run_test()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF NEW.status='running' AND NEW.result->>'source'='schedule_test' THEN
  PERFORM public.flux_reserve_monthly_run_test(NEW.owner_id);
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.flux_count_scheduled_run_test() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS flux_schedule_monthly_run_quota_test ON public.automation_runs;
CREATE TRIGGER flux_schedule_monthly_run_quota_test BEFORE INSERT ON public.automation_runs
FOR EACH ROW EXECUTE FUNCTION public.flux_count_scheduled_run_test();
COMMIT;