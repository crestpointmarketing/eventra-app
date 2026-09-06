BEGIN;
-- The baseline already contained this column, so ADD COLUMN IF NOT EXISTS did
-- not assign a default to it. Attribute every new activity to its real caller.
ALTER TABLE public.lead_activities ALTER COLUMN created_by SET DEFAULT auth.uid();
COMMIT;
