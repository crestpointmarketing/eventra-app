CREATE OR REPLACE FUNCTION public.approve_discovery_item(p_id uuid,p_payload jsonb,p_tasks jsonb DEFAULT '[]') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE q event_discovery_queue; v_event_id uuid; t jsonb;
BEGIN
    IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required'; END IF;
    SELECT * INTO q FROM event_discovery_queue WHERE id=p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Queue item unavailable'; END IF;
    IF q.status='APPROVED' THEN RETURN q.imported_event_id; END IF;
    IF q.status<>'PENDING' THEN RAISE EXCEPTION 'Queue item not pending'; END IF;
    IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)>50 OR octet_length(p_payload::text)>200000 THEN RAISE EXCEPTION 'Invalid import'; END IF;
    IF p_payload->'metadata'->'search'->>'editionKey' IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(p_payload->'metadata'->'search'->>'editionKey'));
        SELECT id INTO v_event_id FROM events WHERE deleted_at IS NULL AND metadata->'search'->>'editionKey'=p_payload->'metadata'->'search'->>'editionKey' LIMIT 1;
        IF FOUND THEN
            UPDATE event_discovery_queue SET status='APPROVED',reviewed_at=now(),reviewed_by=auth.uid(),imported_event_id=v_event_id WHERE id=p_id;
            UPDATE event_search_imports SET event_id=v_event_id WHERE queue_id=p_id;
            RETURN v_event_id;
        END IF;
    END IF;
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
