BEGIN;

-- One existing Eventra team. New signups never become members automatically.
CREATE TABLE public.eventra_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.eventra_members(user_id)
SELECT DISTINCT u.id FROM auth.users u JOIN (
  SELECT owner_id AS id FROM public.events UNION SELECT owner_id FROM public.leads
  UNION SELECT assigned_to FROM public.tasks UNION SELECT uploaded_by FROM public.assets
  UNION SELECT user_id FROM public.task_collaborators
) existing ON existing.id=u.id ON CONFLICT DO NOTHING;
ALTER TABLE public.eventra_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventra_members FROM anon, authenticated;
GRANT SELECT ON public.eventra_members TO authenticated;
CREATE POLICY member_self ON public.eventra_members FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.is_eventra_member() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.eventra_members WHERE user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_eventra_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_eventra_member() TO authenticated;

ALTER TABLE public.leads ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;
-- Existing links expire in 30 days; new links use cryptographic randomness.
UPDATE public.events SET share_expires_at=now()+interval '30 days' WHERE share_token IS NOT NULL AND share_expires_at IS NULL;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- Remove permissive legacy policies first; PostgreSQL ORs permissive policies.
DO $$ DECLARE p record; t text; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public'
 AND tablename=ANY(ARRAY['events','leads','tasks','assets','event_assets','meetings','users','event_comments','task_checklist_items','task_collaborators','event_discovery_queue','lead_activities']) LOOP
   EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['events','leads','tasks','assets','event_assets','meetings','users','event_comments','task_checklist_items','task_collaborators','event_discovery_queue','lead_activities'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
   EXECUTE format('CREATE POLICY team_read ON public.%I FOR SELECT TO authenticated USING (public.is_eventra_member())',t);
 END LOOP;
END $$;

-- RLS allows team edits. Ownership and destructive field changes are guarded below.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['events','leads','tasks','assets','event_assets','meetings','event_discovery_queue','task_checklist_items','task_collaborators'] LOOP
   EXECUTE format('CREATE POLICY team_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_eventra_member())',t);
   EXECUTE format('CREATE POLICY team_update ON public.%I FOR UPDATE TO authenticated USING (public.is_eventra_member()) WITH CHECK (public.is_eventra_member())',t);
 END LOOP;
END $$;
CREATE POLICY owner_delete ON public.events FOR DELETE TO authenticated USING(public.is_eventra_member() AND owner_id=auth.uid());
CREATE POLICY owner_delete ON public.leads FOR DELETE TO authenticated USING(public.is_eventra_member() AND owner_id=auth.uid());
CREATE POLICY owner_delete ON public.tasks FOR DELETE TO authenticated USING(public.is_eventra_member() AND (assigned_to=auth.uid() OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND e.owner_id=auth.uid())));
CREATE POLICY owner_delete ON public.assets FOR DELETE TO authenticated USING(public.is_eventra_member() AND uploaded_by=auth.uid());
CREATE POLICY owner_delete ON public.event_assets FOR DELETE TO authenticated USING(public.is_eventra_member() AND uploaded_by=auth.uid());
CREATE POLICY owner_delete ON public.meetings FOR DELETE TO authenticated USING(public.is_eventra_member() AND EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND e.owner_id=auth.uid()));
CREATE POLICY self_update ON public.users FOR UPDATE TO authenticated USING(public.is_eventra_member() AND id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY comment_insert ON public.event_comments FOR INSERT TO authenticated WITH CHECK(public.is_eventra_member() AND author_email=auth.email());
CREATE POLICY comment_delete ON public.event_comments FOR DELETE TO authenticated USING(public.is_eventra_member() AND author_email=auth.email());
CREATE POLICY activity_insert ON public.lead_activities FOR INSERT TO authenticated WITH CHECK(public.is_eventra_member() AND created_by=auth.uid());
CREATE POLICY activity_delete ON public.lead_activities FOR DELETE TO authenticated USING(public.is_eventra_member() AND EXISTS(SELECT 1 FROM public.leads l WHERE l.id=lead_id AND l.owner_id=auth.uid()));
CREATE POLICY checklist_delete ON public.task_checklist_items FOR DELETE TO authenticated USING(public.is_eventra_member() AND EXISTS(SELECT 1 FROM public.tasks t JOIN public.events e ON e.id=t.event_id WHERE t.id=task_id AND (t.assigned_to=auth.uid() OR e.owner_id=auth.uid())));
CREATE POLICY collaborator_delete ON public.task_collaborators FOR DELETE TO authenticated USING(public.is_eventra_member() AND EXISTS(SELECT 1 FROM public.tasks t JOIN public.events e ON e.id=t.event_id WHERE t.id=task_id AND (t.assigned_to=auth.uid() OR e.owner_id=auth.uid())));

-- Prevent team members from taking ownership and then deleting others' records.
CREATE FUNCTION public.protect_eventra_ownership() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE before_row jsonb; after_row jsonb:=to_jsonb(NEW); owner_key text; owner uuid;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 owner_key:=CASE WHEN TG_TABLE_NAME IN ('assets','event_assets') THEN 'uploaded_by' WHEN TG_TABLE_NAME='tasks' THEN 'assigned_to' ELSE 'owner_id' END;
 IF TG_OP='INSERT' THEN
   IF TG_TABLE_NAME IN ('events','leads','assets','event_assets') AND (after_row->>owner_key)::uuid IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Owner must be current user' USING ERRCODE='42501'; END IF;
   RETURN NEW;
 END IF;
 before_row:=to_jsonb(OLD); owner:=(before_row->>owner_key)::uuid;
 IF TG_TABLE_NAME='tasks' THEN SELECT e.owner_id INTO owner FROM public.events e WHERE e.id=OLD.event_id; END IF;
 IF owner IS DISTINCT FROM auth.uid() AND (
    before_row->owner_key IS DISTINCT FROM after_row->owner_key OR
    (before_row->'event_id' IS DISTINCT FROM after_row->'event_id' AND NOT (after_row->>'event_id' IS NULL AND EXISTS(SELECT 1 FROM public.events e WHERE e.id=(before_row->>'event_id')::uuid AND e.owner_id=auth.uid()))) OR
    before_row->'deleted_at' IS DISTINCT FROM after_row->'deleted_at' OR
    before_row->'share_token' IS DISTINCT FROM after_row->'share_token' OR
    before_row->'share_expires_at' IS DISTINCT FROM after_row->'share_expires_at' OR
    before_row->'file_url' IS DISTINCT FROM after_row->'file_url'
 ) THEN RAISE EXCEPTION 'Owner permission required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['events','leads','tasks','assets','event_assets'] LOOP
 EXECUTE format('CREATE TRIGGER protect_ownership BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.protect_eventra_ownership()',t);
 END LOOP;
END $$;

-- Restrictive membership requirement also applies to existing per-user tables.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['company_intelligence','email_templates','email_template_subjects','email_template_blocks','email_template_ctas'] LOOP
 EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
 EXECUTE format('CREATE POLICY require_member ON public.%I AS RESTRICTIVE TO authenticated USING(public.is_eventra_member()) WITH CHECK(public.is_eventra_member())',t);
 END LOOP;
END $$;
-- Templates may be read across the team, while existing owner-only writes remain.
CREATE POLICY team_templates ON public.email_templates FOR SELECT TO authenticated USING(public.is_eventra_member() AND deleted_at IS NULL);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['email_template_subjects','email_template_blocks','email_template_ctas'] LOOP
 EXECUTE format('CREATE POLICY team_template_read ON public.%I FOR SELECT TO authenticated USING(public.is_eventra_member() AND EXISTS(SELECT 1 FROM public.email_templates e WHERE e.id=template_id AND e.deleted_at IS NULL))',t);
 END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.rpc_duplicate_email_template(uuid,text) FROM PUBLIC,anon;

CREATE TABLE public.ai_usage (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 feature text NOT NULL, model text NOT NULL, prompt_tokens integer NOT NULL DEFAULT 0,
 completion_tokens integer NOT NULL DEFAULT 0, total_tokens integer NOT NULL DEFAULT 0,
 estimated_cost numeric NOT NULL DEFAULT 0, request_data jsonb NOT NULL DEFAULT '{}', response_time_ms integer,
 status text NOT NULL, error_message text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ai_insights (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 entity_type text NOT NULL, entity_id uuid NOT NULL, insight_type text NOT NULL,
 content jsonb NOT NULL, confidence numeric, metadata jsonb NOT NULL DEFAULT '{}',
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_usage(user_id,created_at);
CREATE INDEX ON public.ai_insights(entity_type,entity_id,insight_type,created_at DESC);
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage, public.ai_insights FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.ai_usage,public.ai_insights TO authenticated;
CREATE POLICY usage_read ON public.ai_usage FOR SELECT TO authenticated USING(public.is_eventra_member() AND user_id=auth.uid());
CREATE POLICY usage_insert ON public.ai_usage FOR INSERT TO authenticated WITH CHECK(public.is_eventra_member() AND user_id=auth.uid());
CREATE POLICY insights_read ON public.ai_insights FOR SELECT TO authenticated USING(public.is_eventra_member());
CREATE POLICY insights_insert ON public.ai_insights FOR INSERT TO authenticated WITH CHECK(public.is_eventra_member() AND user_id=auth.uid());

CREATE TABLE public.ai_request_limits(user_id uuid PRIMARY KEY REFERENCES auth.users(id), minute_at timestamptz NOT NULL, minute_count int NOT NULL, day_at date NOT NULL, day_count int NOT NULL);
ALTER TABLE public.ai_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_request_limits FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.consume_ai_request() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed boolean;
BEGIN
 IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.ai_request_limits VALUES(auth.uid(),date_trunc('minute',now()),1,(now() AT TIME ZONE 'UTC')::date,1)
 ON CONFLICT(user_id) DO UPDATE SET
 minute_count=CASE WHEN ai_request_limits.minute_at=excluded.minute_at THEN ai_request_limits.minute_count+1 ELSE 1 END,
 day_count=CASE WHEN ai_request_limits.day_at=excluded.day_at THEN ai_request_limits.day_count+1 ELSE 1 END,
 minute_at=excluded.minute_at, day_at=excluded.day_at
 WHERE (ai_request_limits.minute_at<>excluded.minute_at OR ai_request_limits.minute_count<20)
 AND (ai_request_limits.day_at<>excluded.day_at OR ai_request_limits.day_count<500)
 RETURNING true INTO allowed;
 RETURN coalesce(allowed,false);
END $$;
REVOKE ALL ON FUNCTION public.consume_ai_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_request() TO authenticated;

CREATE FUNCTION public.delete_events_atomic(event_ids uuid[]) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE matched integer; task_ids uuid[];
BEGIN
 IF NOT public.is_eventra_member() OR coalesce(cardinality(event_ids),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.events WHERE id=ANY(event_ids) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO matched FROM public.events WHERE id=ANY(event_ids) AND owner_id=auth.uid();
 IF matched<>(SELECT count(DISTINCT x) FROM unnest(event_ids) x) THEN RAISE EXCEPTION 'Only owners may delete events' USING ERRCODE='42501'; END IF;
 SELECT array_agg(id) INTO task_ids FROM public.tasks WHERE event_id=ANY(event_ids);
 -- Trigger permits owner-authorized unlinking in this transaction via original event owner.
 UPDATE public.assets SET task_id=NULL WHERE task_id=ANY(task_ids);
 UPDATE public.assets SET event_id=NULL WHERE event_id=ANY(event_ids);
 UPDATE public.leads SET event_id=NULL WHERE event_id=ANY(event_ids);
 DELETE FROM public.task_checklist_items WHERE task_id=ANY(task_ids);
 DELETE FROM public.task_collaborators WHERE task_id=ANY(task_ids);
 DELETE FROM public.event_comments WHERE event_id=ANY(event_ids);
 DELETE FROM public.tasks WHERE id=ANY(task_ids);
 UPDATE public.event_discovery_queue SET existing_event_id=NULL WHERE existing_event_id=ANY(event_ids);
 DELETE FROM public.events WHERE id=ANY(event_ids);
 RETURN matched;
END $$;
REVOKE ALL ON FUNCTION public.delete_events_atomic(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_events_atomic(uuid[]) TO authenticated;

CREATE FUNCTION public.get_shared_event(token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('name',name,'status',status,'start_date',start_date,'end_date',end_date,
 'location',location,'website_url',website_url,'description',description,'focus_area',focus_area,
 'target_audience',target_audience,'expected_attendees',expected_attendees,'discovery_priority',discovery_priority,'engagement_type',engagement_type)
 FROM public.events WHERE share_token=token AND length(token)>=20 AND share_expires_at>now() AND deleted_at IS NULL LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_shared_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_event(text) TO anon,authenticated;

CREATE FUNCTION public.mark_lead_sent(lead_id uuid, subject text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 UPDATE public.leads SET last_contacted_at=now() WHERE id=lead_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Lead not accessible'; END IF;
 INSERT INTO public.lead_activities(lead_id,activity_type,activity_data,created_by) VALUES(lead_id,'email_sent',jsonb_build_object('subject',subject,'sent_via','manual'),auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.mark_lead_sent(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_lead_sent(uuid,text) TO authenticated;

-- Private files: team reads, uploader-only writes/deletes. Unrelated buckets unaffected.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
 AND (coalesce(qual,'')||coalesce(with_check,'')) LIKE '%event-assets%' LOOP
 EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
 END LOOP;
END $$;
UPDATE storage.buckets SET public=false,file_size_limit=26214400,
 allowed_mime_types=ARRAY['application/pdf','image/png','image/jpeg','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','video/mp4'] WHERE id='event-assets';
CREATE POLICY eventra_files_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='event-assets' AND public.is_eventra_member());
CREATE POLICY eventra_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='event-assets' AND public.is_eventra_member() AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY eventra_files_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='event-assets' AND public.is_eventra_member() AND (storage.foldername(name))[1]=auth.uid()::text) WITH CHECK(bucket_id='event-assets' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE POLICY eventra_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='event-assets' AND public.is_eventra_member() AND (storage.foldername(name))[1]=auth.uid()::text);
COMMIT;
