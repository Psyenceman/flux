-- TEST ONLY: skip exhausted users without starving other scheduled jobs.
BEGIN;
CREATE OR REPLACE FUNCTION public.flux_claim_scheduled_test(p_limit integer DEFAULT 5)
RETURNS TABLE(run_id uuid, automation_id uuid, owner_id uuid, graph jsonb, attempt integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE item record; rid uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service role required'; END IF;
 FOR item IN
  SELECT s.automation_id,a.owner_id,a.action_config,s.attempts,s.active_run_id
  FROM public.flux_schedule_state s
  JOIN public.automations a ON a.id=s.automation_id
  JOIN public.profiles profile ON profile.id=a.owner_id
  LEFT JOIN public.flux_user_plans up ON up.user_id=a.owner_id
  JOIN public.flux_plan_catalog plan ON plan.plan_id=coalesce(up.plan_id,'free')
  LEFT JOIN public.flux_monthly_run_usage_test usage ON usage.user_id=a.owner_id
   AND usage.month_start=date_trunc('month',now() AT TIME ZONE 'UTC')::date
  WHERE a.enabled=true AND a.trigger_type='schedule' AND s.next_run_at<=now()
   AND (s.locked_until IS NULL OR s.locked_until<now())
   AND (a.trigger_config->>'interval_minutes') ~ '^[0-9]{1,4}$'
   AND (a.trigger_config->>'interval_minutes')::integer BETWEEN 5 AND 1440
   AND (profile.role='super_admin' OR coalesce(usage.used,0)<plan.max_monthly_runs)
  ORDER BY s.next_run_at FOR UPDATE OF s SKIP LOCKED
  LIMIT least(greatest(p_limit,1),5)
 LOOP
  -- Each job is isolated: a concurrent quota race cannot abort other claims.
  BEGIN
   IF item.active_run_id IS NOT NULL THEN
    UPDATE public.automation_runs SET status='failed',finished_at=now(),
     error_message='Execution lease expired; retry scheduled'
     WHERE id=item.active_run_id AND status='running';
   END IF;
   INSERT INTO public.automation_runs(owner_id,automation_id,status,started_at,result)
    VALUES(item.owner_id,item.automation_id,'running',now(),'{"source":"schedule_test"}'::jsonb)
    RETURNING id INTO rid;
   UPDATE public.flux_schedule_state SET locked_until=now()+interval '3 minutes',
    active_run_id=rid,attempts=item.attempts+1,updated_at=now()
    WHERE flux_schedule_state.automation_id=item.automation_id;
   run_id:=rid;automation_id:=item.automation_id;owner_id:=item.owner_id;
   graph:=item.action_config->'graph';attempt:=item.attempts+1;RETURN NEXT;
  EXCEPTION WHEN check_violation THEN
   -- Quota reached between selection and insertion: skip this job, continue.
   NULL;
  END;
 END LOOP;
END $fn$;
COMMIT;