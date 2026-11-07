-- TEST ONLY: enforce per-owner total/active automation quotas on writes.
-- Super Admin is exempt. Unassigned users use the Free plan.
BEGIN;
CREATE OR REPLACE FUNCTION public.flux_enforce_automation_plan_limits_test()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_role text; v_total_limit integer; v_active_limit integer; v_total integer; v_active integer;
BEGIN
 IF NEW.owner_id IS NULL THEN RAISE EXCEPTION 'Missing owner' USING ERRCODE='23502'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.owner_id::text, 6416));
 SELECT role INTO v_role FROM public.profiles WHERE id=NEW.owner_id;
 IF v_role IS NULL THEN RAISE EXCEPTION 'Owner profile not found' USING ERRCODE='23503'; END IF;
 IF v_role='super_admin' THEN RETURN NEW; END IF;
 SELECT c.max_automations,c.max_active_automations
 INTO v_total_limit,v_active_limit
 FROM public.flux_plan_catalog c
 LEFT JOIN public.flux_user_plans up ON up.plan_id=c.plan_id AND up.user_id=NEW.owner_id
 WHERE c.plan_id=coalesce((SELECT plan_id FROM public.flux_user_plans WHERE user_id=NEW.owner_id),'free');
 IF v_total_limit IS NULL OR v_active_limit IS NULL THEN
  RAISE EXCEPTION 'Plan not configured' USING ERRCODE='22023';
 END IF;
 SELECT count(*),count(*) FILTER (WHERE enabled)
 INTO v_total,v_active FROM public.automations
 WHERE owner_id=NEW.owner_id AND id IS DISTINCT FROM NEW.id;
 IF v_total+1>v_total_limit THEN RAISE EXCEPTION 'Plan automation limit exceeded' USING ERRCODE='23514'; END IF;
 IF v_active+(CASE WHEN NEW.enabled THEN 1 ELSE 0 END)>v_active_limit
 THEN RAISE EXCEPTION 'Plan active automation limit exceeded' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.flux_enforce_automation_plan_limits_test() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS flux_automations_plan_limits_test ON public.automations;
CREATE TRIGGER flux_automations_plan_limits_test
BEFORE INSERT OR UPDATE OF owner_id,enabled ON public.automations
FOR EACH ROW EXECUTE FUNCTION public.flux_enforce_automation_plan_limits_test();
COMMIT;
