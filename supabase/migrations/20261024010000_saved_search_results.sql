BEGIN;

-- Search results a member bookmarked from Discover. The result snapshot keeps the
-- evidence that was shown; importing still goes through import_event_search.
CREATE TABLE public.saved_search_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.event_search_jobs(id) ON DELETE CASCADE,
    result_id text NOT NULL CHECK (length(result_id) BETWEEN 1 AND 100),
    result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object' AND pg_column_size(result) <= 262144),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, job_id, result_id)
);
CREATE INDEX saved_search_results_user ON public.saved_search_results(user_id, created_at DESC);
ALTER TABLE public.saved_search_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.saved_search_results FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_search_results TO authenticated;
GRANT ALL ON public.saved_search_results TO service_role;
CREATE POLICY saved_search_own_read ON public.saved_search_results FOR SELECT TO authenticated
    USING (user_id = auth.uid() AND public.is_eventra_member());
CREATE POLICY saved_search_own_insert ON public.saved_search_results FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND public.is_eventra_member()
        AND EXISTS (
            SELECT 1 FROM public.event_search_jobs j
            WHERE j.id = job_id AND j.user_id = auth.uid()
        )
    );
CREATE POLICY saved_search_own_delete ON public.saved_search_results FOR DELETE TO authenticated
    USING (user_id = auth.uid() AND public.is_eventra_member());

COMMIT;
