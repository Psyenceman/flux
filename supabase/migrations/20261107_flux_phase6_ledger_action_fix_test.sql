-- Flux Studio TEST only. Extend existing ledger action constraint without dropping prior actions.
BEGIN;
ALTER TABLE public.flux_credit_ledger
 DROP CONSTRAINT IF EXISTS flux_credit_ledger_action_check;
ALTER TABLE public.flux_credit_ledger
 ADD CONSTRAINT flux_credit_ledger_action_check
 CHECK (action IN ('workflow_test','workflow_run','grant','admin_adjustment'));
COMMIT;
