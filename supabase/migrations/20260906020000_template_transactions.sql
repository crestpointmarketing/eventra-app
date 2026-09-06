BEGIN;
ALTER FUNCTION public.rpc_duplicate_email_template(uuid,text) RENAME TO internal_duplicate_email_template;
REVOKE ALL ON FUNCTION public.internal_duplicate_email_template(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.rpc_duplicate_email_template(p_template_id uuid,p_new_name text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 RETURN public.internal_duplicate_email_template(p_template_id,p_new_name);
END $$;
REVOKE ALL ON FUNCTION public.rpc_duplicate_email_template(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rpc_duplicate_email_template(uuid,text) TO authenticated;
CREATE FUNCTION public.save_email_template(payload jsonb) RETURNS public.email_templates
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE saved public.email_templates; previous public.email_templates; data jsonb; item jsonb; v_template_id uuid;
BEGIN
 IF NOT public.is_eventra_member() THEN RAISE EXCEPTION 'Membership required' USING ERRCODE='42501'; END IF;
 IF payload ? 'id' THEN
   SELECT * INTO previous FROM public.email_templates WHERE id=(payload->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR previous.created_by IS DISTINCT FROM auth.uid() OR previous.is_system THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
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
REVOKE ALL ON FUNCTION public.save_email_template(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_email_template(jsonb) TO authenticated;
COMMIT;
