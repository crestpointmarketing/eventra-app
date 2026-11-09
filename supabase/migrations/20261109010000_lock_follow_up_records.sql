BEGIN;

-- Legacy table from the original import. No application code reads it, but the
-- baseline granted anon and authenticated full access with RLS disabled, so the
-- public API key could read and change it. Lock it to the service role.
ALTER TABLE public.follow_up_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.follow_up_records FROM anon, authenticated;

COMMIT;
