CREATE TABLE public.event_search_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    environment text NOT NULL,
    criteria jsonb NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','warnings','failed','cancelled')),
    stage text NOT NULL DEFAULT 'Understanding criteria',
    queries jsonb NOT NULL DEFAULT '[]',
    candidates jsonb NOT NULL DEFAULT '[]',
    results jsonb NOT NULL DEFAULT '[]',
    warnings jsonb NOT NULL DEFAULT '[]',
    counts jsonb NOT NULL DEFAULT '{"candidates":0,"checked":0,"strict":0,"verification":0,"excluded":0}',
    error text,
    lease_token uuid,
    lease_until timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_search_jobs_worker ON public.event_search_jobs(environment,status,lease_until);
CREATE INDEX event_search_jobs_user ON public.event_search_jobs(user_id,created_at DESC);
ALTER TABLE public.event_search_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_search_jobs FROM anon,authenticated;
GRANT SELECT ON public.event_search_jobs TO authenticated;
GRANT ALL ON public.event_search_jobs TO service_role;
CREATE POLICY search_own_member ON public.event_search_jobs FOR SELECT TO authenticated USING(user_id=auth.uid() AND public.is_eventra_member());

CREATE FUNCTION public.create_event_search(p_criteria jsonb,p_environment text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job_id uuid;
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
    IF NOT public.consume_ai_request() THEN RAISE EXCEPTION 'Search request limit reached'; END IF;
    IF EXISTS(SELECT 1 FROM event_search_jobs WHERE user_id=auth.uid() AND status IN ('queued','running')) THEN RAISE EXCEPTION 'A search is already running'; END IF;
    IF octet_length(p_criteria::text)>24000 OR length(p_environment)>200 THEN RAISE EXCEPTION 'Invalid search'; END IF;
    INSERT INTO event_search_jobs(user_id,criteria,environment) VALUES(auth.uid(),p_criteria,p_environment) RETURNING id INTO job_id;
    RETURN job_id;
END $$;
CREATE FUNCTION public.cancel_event_search(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    UPDATE event_search_jobs SET status='cancelled',lease_token=NULL,lease_until=NULL,updated_at=now()
    WHERE id=p_id AND user_id=auth.uid() AND status IN ('queued','running');
    RETURN FOUND;
END $$;
CREATE FUNCTION public.claim_event_search(p_environment text,p_id uuid DEFAULT NULL) RETURNS SETOF public.event_search_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job_id uuid;
BEGIN
    -- Stop abandoned jobs after bounded recovery; never keep billing on infinite retries.
    UPDATE event_search_jobs SET status='failed',error='Search interrupted repeatedly. Start a new search.',updated_at=now()
    WHERE environment=p_environment AND status IN ('queued','running') AND attempts>=4 AND (lease_until IS NULL OR lease_until<now());
    SELECT j.id INTO job_id FROM event_search_jobs j
    JOIN eventra_members m ON m.user_id=j.user_id
    WHERE j.environment=p_environment AND (p_id IS NULL OR j.id=p_id)
    AND j.status IN ('queued','running') AND (j.lease_until IS NULL OR j.lease_until<now()) AND j.attempts<4
    ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1;
    IF job_id IS NULL THEN RETURN; END IF;
    RETURN QUERY UPDATE event_search_jobs SET status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '6 minutes',attempts=attempts+1,updated_at=now()
    WHERE id=job_id RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.create_event_search(jsonb,text),public.cancel_event_search(uuid),public.claim_event_search(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_search(jsonb,text),public.cancel_event_search(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_event_search(text,uuid) TO service_role;

CREATE FUNCTION public.retry_event_search(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j event_search_jobs;
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
    IF EXISTS(SELECT 1 FROM event_search_jobs WHERE user_id=auth.uid() AND status IN ('queued','running')) THEN RAISE EXCEPTION 'A search is already running'; END IF;
    IF NOT public.consume_ai_request() THEN RAISE EXCEPTION 'Search request limit reached'; END IF;
    SELECT * INTO j FROM event_search_jobs WHERE id=p_id AND user_id=auth.uid() FOR UPDATE;
    IF NOT FOUND OR j.status NOT IN ('failed','warnings') OR j.attempts>=4 THEN RETURN false; END IF;
    UPDATE event_search_jobs SET status='queued',error=NULL,lease_token=NULL,lease_until=NULL,updated_at=now(),
      results=coalesce((SELECT jsonb_agg(r) FROM jsonb_array_elements(j.results) r WHERE r->>'category'<>'verification'),'[]')
    WHERE id=p_id;
    RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.retry_event_search(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.retry_event_search(uuid) TO authenticated;

-- An idempotent, transactional import associates the saved result with its new event/queue item.
CREATE TABLE public.event_search_imports (
    job_id uuid NOT NULL REFERENCES public.event_search_jobs(id) ON DELETE CASCADE,
    result_id text NOT NULL,
    event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
    queue_id uuid REFERENCES public.event_discovery_queue(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(job_id,result_id)
);
ALTER TABLE public.event_search_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_search_imports FROM anon,authenticated;
GRANT SELECT ON public.event_search_imports TO authenticated;
GRANT ALL ON public.event_search_imports TO service_role;
CREATE POLICY search_import_member ON public.event_search_imports FOR SELECT TO authenticated USING(public.is_eventra_member());
CREATE FUNCTION public.import_event_search(p_job uuid,p_result text,p_queue boolean,p_tasks jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j event_search_jobs; r jsonb; fields jsonb; payload jsonb; previous event_search_imports; new_id uuid; t jsonb;
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    SELECT * INTO j FROM event_search_jobs WHERE id=p_job AND user_id=auth.uid() FOR UPDATE;
    IF NOT FOUND OR j.status NOT IN ('completed','warnings') THEN RAISE EXCEPTION 'Search results unavailable'; END IF;
    SELECT * INTO previous FROM event_search_imports WHERE job_id=p_job AND result_id=p_result;
    IF FOUND THEN RETURN jsonb_build_object('eventId',previous.event_id,'queueId',previous.queue_id,'skipped',true); END IF;
    SELECT value INTO r FROM jsonb_array_elements(j.results) WHERE value->>'id'=p_result;
    IF r IS NULL OR r->>'category'='excluded' THEN RAISE EXCEPTION 'Result cannot be imported'; END IF;
    IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)>50 THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
    fields=r->'resolved';
    IF NOT p_queue AND (fields->'name'->>'status'<>'verified' OR fields->'event_type'->>'value' IS NULL) THEN RAISE EXCEPTION 'Review unknown event name or type first'; END IF;
    -- Serialize equivalent imports across different searches before checking the catalog.
    PERFORM pg_advisory_xact_lock(hashtext(coalesce(r->>'editionKey',r->>'id')));
    IF r->>'editionKey' IS NOT NULL THEN
        SELECT id INTO new_id FROM events WHERE deleted_at IS NULL AND metadata->'search'->>'editionKey'=r->>'editionKey' LIMIT 1;
        IF FOUND THEN RETURN jsonb_build_object('eventId',new_id,'skipped',true); END IF;
    END IF;
    payload=jsonb_build_object('name',coalesce(fields->'name'->>'value',r->>'name'),'event_type',fields->'event_type'->>'value',
      'start_date',CASE WHEN fields->'start_date'->>'status'='verified' THEN fields->'start_date'->>'value' END,
      'end_date',CASE WHEN fields->'end_date'->>'status'='verified' THEN fields->'end_date'->>'value' END,
      'location',concat_ws(', ',fields->'city'->>'value',fields->'state'->>'value',fields->'country'->>'value'),
      'website_url',r->>'website_url','description',fields->'description'->>'value','target_audience',fields->'audience'->>'value',
      'metadata',jsonb_build_object('search',r));
    IF p_queue THEN
        IF jsonb_array_length(p_tasks)>0 THEN RAISE EXCEPTION 'Review queue does not create tasks'; END IF;
        INSERT INTO event_discovery_queue(type,status,event_data) VALUES('NEW','PENDING',payload) RETURNING id INTO new_id;
        INSERT INTO event_search_imports(job_id,result_id,queue_id) VALUES(p_job,p_result,new_id);
        RETURN jsonb_build_object('queueId',new_id,'skipped',false);
    END IF;
    INSERT INTO events(name,event_type,start_date,end_date,location,website_url,description,target_audience,metadata,owner_id,source,status)
    VALUES(payload->>'name',payload->>'event_type',(payload->>'start_date')::date,(payload->>'end_date')::date,payload->>'location',payload->>'website_url',payload->>'description',payload->>'target_audience',payload->'metadata',auth.uid(),'ai_discovered','upcoming') RETURNING id INTO new_id;
    FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
        INSERT INTO tasks(event_id,title,description,priority,due_date,status,payment_status)
        VALUES(new_id,t->>'title',t->>'description',t->>'priority',(t->>'due_date')::date,'pending',t->>'payment_status');
    END LOOP;
    INSERT INTO event_search_imports(job_id,result_id,event_id) VALUES(p_job,p_result,new_id);
    RETURN jsonb_build_object('eventId',new_id,'skipped',false,'tasksCreated',jsonb_array_length(p_tasks));
END $$;
REVOKE ALL ON FUNCTION public.import_event_search(uuid,text,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_event_search(uuid,text,boolean,jsonb) TO authenticated;

ALTER TABLE public.event_discovery_queue ADD COLUMN imported_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;
CREATE FUNCTION public.approve_discovery_item(p_id uuid,p_payload jsonb,p_tasks jsonb DEFAULT '[]') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q event_discovery_queue; v_event_id uuid; t jsonb;
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    SELECT * INTO q FROM event_discovery_queue WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Queue item unavailable'; END IF;
    IF q.status='APPROVED' THEN RETURN q.imported_event_id; END IF;
    IF q.status<>'PENDING' THEN RAISE EXCEPTION 'Queue item not pending'; END IF;
    IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)>50 OR octet_length(p_payload::text)>200000 THEN RAISE EXCEPTION 'Invalid import'; END IF;
    INSERT INTO events(name,event_type,start_date,end_date,location,website_url,description,target_audience,expected_attendees,focus_area,metadata,owner_id,source,status)
    VALUES(p_payload->>'name',p_payload->>'event_type',(p_payload->>'start_date')::date,(p_payload->>'end_date')::date,p_payload->>'location',p_payload->>'website_url',p_payload->>'description',p_payload->>'target_audience',(p_payload->>'expected_attendees')::integer,p_payload->>'focus_area',coalesce(p_payload->'metadata','{}'),auth.uid(),'ai_discovered','upcoming') RETURNING id INTO v_event_id;
    FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
        INSERT INTO tasks(event_id,title,description,priority,due_date,status,payment_status)
        VALUES(v_event_id,t->>'title',t->>'description',t->>'priority',(t->>'due_date')::date,'pending',t->>'payment_status');
    END LOOP;
    UPDATE event_discovery_queue SET status='APPROVED',reviewed_at=now(),reviewed_by=auth.uid(),imported_event_id=v_event_id WHERE id=p_id;
    UPDATE event_search_imports SET event_id=v_event_id WHERE queue_id=p_id;
    RETURN v_event_id;
END $$;
REVOKE ALL ON FUNCTION public.approve_discovery_item(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_discovery_item(uuid,jsonb,jsonb) TO authenticated;
