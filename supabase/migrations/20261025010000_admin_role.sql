BEGIN;

-- Administrators may add, change and delete any team record. Roles are still
-- granted outside the application: no member can change their own role.
ALTER TABLE public.eventra_members ADD COLUMN role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin'));
CREATE FUNCTION public.is_eventra_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.eventra_members WHERE user_id=auth.uid() AND role='admin');
$$;
REVOKE ALL ON FUNCTION public.is_eventra_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_eventra_admin() TO authenticated;

DROP POLICY owner_delete ON public.events;
CREATE POLICY owner_delete ON public.events FOR DELETE TO authenticated USING(public.is_eventra_member() AND (owner_id=auth.uid() OR public.is_eventra_admin()));
DROP POLICY owner_delete ON public.leads;
CREATE POLICY owner_delete ON public.leads FOR DELETE TO authenticated USING(public.is_eventra_member() AND (owner_id=auth.uid() OR public.is_eventra_admin()));
DROP POLICY owner_delete ON public.tasks;
CREATE POLICY owner_delete ON public.tasks FOR DELETE TO authenticated USING(public.is_eventra_member() AND (public.is_eventra_admin() OR assigned_to=auth.uid() OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND e.owner_id=auth.uid())));
DROP POLICY owner_delete ON public.assets;
CREATE POLICY owner_delete ON public.assets FOR DELETE TO authenticated USING(public.is_eventra_member() AND (uploaded_by=auth.uid() OR public.is_eventra_admin()));
DROP POLICY owner_delete ON public.event_assets;
CREATE POLICY owner_delete ON public.event_assets FOR DELETE TO authenticated USING(public.is_eventra_member() AND (uploaded_by=auth.uid() OR public.is_eventra_admin()));
DROP POLICY owner_delete ON public.meetings;
CREATE POLICY owner_delete ON public.meetings FOR DELETE TO authenticated USING(public.is_eventra_member() AND (public.is_eventra_admin() OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=event_id AND e.owner_id=auth.uid())));
DROP POLICY comment_delete ON public.event_comments;
CREATE POLICY comment_delete ON public.event_comments FOR DELETE TO authenticated USING(public.is_eventra_member() AND (author_email=auth.email() OR public.is_eventra_admin()));
DROP POLICY activity_delete ON public.lead_activities;
CREATE POLICY activity_delete ON public.lead_activities FOR DELETE TO authenticated USING(public.is_eventra_member() AND (public.is_eventra_admin() OR EXISTS(SELECT 1 FROM public.leads l WHERE l.id=lead_id AND l.owner_id=auth.uid())));
DROP POLICY checklist_delete ON public.task_checklist_items;
CREATE POLICY checklist_delete ON public.task_checklist_items FOR DELETE TO authenticated USING(public.is_eventra_member() AND (public.is_eventra_admin() OR EXISTS(SELECT 1 FROM public.tasks t JOIN public.events e ON e.id=t.event_id WHERE t.id=task_id AND (t.assigned_to=auth.uid() OR e.owner_id=auth.uid()))));
DROP POLICY collaborator_delete ON public.task_collaborators;
CREATE POLICY collaborator_delete ON public.task_collaborators FOR DELETE TO authenticated USING(public.is_eventra_member() AND (public.is_eventra_admin() OR EXISTS(SELECT 1 FROM public.tasks t JOIN public.events e ON e.id=t.event_id WHERE t.id=task_id AND (t.assigned_to=auth.uid() OR e.owner_id=auth.uid()))));

-- Files: administrators may replace or remove any team file.
DROP POLICY eventra_files_update ON storage.objects;
CREATE POLICY eventra_files_update ON storage.objects FOR UPDATE TO authenticated USING(bucket_id='event-assets' AND public.is_eventra_member() AND ((storage.foldername(name))[1]=auth.uid()::text OR public.is_eventra_admin())) WITH CHECK(bucket_id='event-assets' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.is_eventra_admin()));
DROP POLICY eventra_files_delete ON storage.objects;
CREATE POLICY eventra_files_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='event-assets' AND public.is_eventra_member() AND ((storage.foldername(name))[1]=auth.uid()::text OR public.is_eventra_admin()));

-- Email templates, including system templates.
CREATE POLICY admin_update ON public.email_templates FOR UPDATE TO authenticated USING(public.is_eventra_admin()) WITH CHECK(public.is_eventra_admin());
CREATE POLICY admin_write ON public.email_template_subjects TO authenticated USING(public.is_eventra_admin()) WITH CHECK(public.is_eventra_admin());
CREATE POLICY admin_write ON public.email_template_blocks TO authenticated USING(public.is_eventra_admin()) WITH CHECK(public.is_eventra_admin());
CREATE POLICY admin_write ON public.email_template_ctas TO authenticated USING(public.is_eventra_admin()) WITH CHECK(public.is_eventra_admin());

-- Ownership checks skip administrators; everyone else keeps the existing rules.
CREATE OR REPLACE FUNCTION public.protect_eventra_ownership() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE before_row jsonb; after_row jsonb:=to_jsonb(NEW); owner_key text; owner uuid;
BEGIN
 IF auth.uid() IS NULL OR public.is_eventra_admin() THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.delete_events_atomic(event_ids uuid[]) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE matched integer; task_ids uuid[];
BEGIN
 IF NOT public.is_eventra_member() OR coalesce(cardinality(event_ids),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.events WHERE id=ANY(event_ids) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO matched FROM public.events WHERE id=ANY(event_ids) AND (owner_id=auth.uid() OR public.is_eventra_admin());
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

CREATE OR REPLACE FUNCTION public.save_email_template(payload jsonb) RETURNS public.email_templates
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE saved public.email_templates; previous public.email_templates; data jsonb; item jsonb; v_template_id uuid;
BEGIN
 IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 IF payload ? 'id' THEN
   SELECT * INTO previous FROM public.email_templates WHERE id=(payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR ((previous.created_by IS DISTINCT FROM auth.uid() OR previous.is_system) AND NOT public.is_eventra_admin()) THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
   IF (payload->>'expected_version')::int IS DISTINCT FROM previous.version THEN RAISE EXCEPTION 'Template changed. Reload before saving.' USING ERRCODE='40001'; END IF;
   data:=to_jsonb(previous)||payload;
   v_template_id:=previous.id;
 ELSE
   v_template_id:=gen_random_uuid();
   data:=jsonb_build_object('tone','professional','language','en','status','active','personas','[]'::jsonb,'forbidden_claims','[]'::jsonb)||payload;
 END IF;
 IF coalesce(length(trim(data->>'name')),0)=0 THEN RAISE EXCEPTION 'Template name is required'; END IF;
 IF payload ? 'subjects' AND jsonb_array_length(payload->'subjects')=0 THEN RAISE EXCEPTION 'At least one subject is required'; END IF;
 IF payload ? 'blocks' AND jsonb_array_length(payload->'blocks')=0 THEN RAISE EXCEPTION 'At least one block is required'; END IF;
 IF previous.id IS NULL THEN
   INSERT INTO public.email_templates(id,created_by,name,category,goal,tone,language,status,personas,max_words,forbidden_claims,notes,updated_by)
   VALUES(v_template_id,auth.uid(),data->>'name',(data->>'category')::public.email_template_category,(data->>'goal')::public.email_template_goal,
     (data->>'tone')::public.email_template_tone,(data->>'language')::public.email_template_language,(data->>'status')::public.email_template_status,
     ARRAY(SELECT jsonb_array_elements_text(data->'personas')),(data->>'max_words')::int,ARRAY(SELECT jsonb_array_elements_text(data->'forbidden_claims')),data->>'notes',auth.uid())
   RETURNING * INTO saved;
 ELSE
   UPDATE public.email_templates SET name=data->>'name',category=(data->>'category')::public.email_template_category,goal=(data->>'goal')::public.email_template_goal,
     tone=(data->>'tone')::public.email_template_tone,language=(data->>'language')::public.email_template_language,status=(data->>'status')::public.email_template_status,
     personas=ARRAY(SELECT jsonb_array_elements_text(data->'personas')),max_words=(data->>'max_words')::int,
     forbidden_claims=ARRAY(SELECT jsonb_array_elements_text(data->'forbidden_claims')),notes=data->>'notes',updated_by=auth.uid(),version=previous.version+1
   WHERE id=v_template_id RETURNING * INTO saved;
 END IF;
 IF payload ? 'subjects' THEN
   DELETE FROM public.email_template_subjects s WHERE s.template_id=v_template_id;
   FOR item IN SELECT jsonb_array_elements(payload->'subjects') LOOP
     IF coalesce(length(trim(item->>'subject')),0)=0 THEN RAISE EXCEPTION 'Subject cannot be empty'; END IF;
     INSERT INTO public.email_template_subjects(template_id,sort_order,subject,is_active) VALUES(v_template_id,coalesce((item->>'sort_order')::int,1),item->>'subject',coalesce((item->>'is_active')::boolean,true));
   END LOOP;
 END IF;
 IF payload ? 'blocks' THEN
   DELETE FROM public.email_template_blocks b WHERE b.template_id=v_template_id;
   FOR item IN SELECT jsonb_array_elements(payload->'blocks') LOOP
     INSERT INTO public.email_template_blocks(template_id,block_type,sort_order,content,allowed_vars,ai_guidance)
     VALUES(v_template_id,(item->>'block_type')::public.email_block_type,coalesce((item->>'sort_order')::int,1),coalesce(item->>'content',''),ARRAY(SELECT jsonb_array_elements_text(item->'allowed_vars')),item->>'ai_guidance');
   END LOOP;
 END IF;
 IF payload ? 'cta' THEN
   DELETE FROM public.email_template_ctas c WHERE c.template_id=v_template_id;
   item:=payload->'cta';
   INSERT INTO public.email_template_ctas(template_id,cta_type,cta_text,cta_url) VALUES(v_template_id,(item->>'cta_type')::public.email_cta_type,item->>'cta_text',item->>'cta_url');
 END IF;
 RETURN saved;
END $$;

CREATE OR REPLACE FUNCTION public.soft_delete_email_template(template_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.email_templates;
BEGIN
  IF NOT public.is_eventra_member() THEN
    RAISE EXCEPTION 'Membership required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO item FROM public.email_templates WHERE id=template_id FOR UPDATE;
  IF NOT FOUND OR ((item.created_by IS DISTINCT FROM auth.uid() OR item.is_system) AND NOT public.is_eventra_admin()) THEN
    RAISE EXCEPTION 'Only the template owner can delete it' USING ERRCODE='42501';
  END IF;
  IF item.deleted_at IS NULL THEN
    UPDATE public.email_templates SET deleted_at=now(), updated_by=auth.uid(), version=version+1
      WHERE id=template_id;
  END IF;
  RETURN true;
END $$;

COMMIT;
