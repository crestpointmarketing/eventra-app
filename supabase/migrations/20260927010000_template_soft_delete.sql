BEGIN;

-- An UPDATE that makes the row invisible to SELECT policies is rejected by
-- PostgREST/RLS. Use a narrowly scoped operation without exposing deleted rows.
CREATE FUNCTION public.soft_delete_email_template(template_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.email_templates;
BEGIN
  IF NOT public.is_eventra_member() THEN
    RAISE EXCEPTION 'Membership required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO item FROM public.email_templates WHERE id=template_id FOR UPDATE;
  IF NOT FOUND OR item.created_by IS DISTINCT FROM auth.uid() OR item.is_system THEN
    RAISE EXCEPTION 'Only the template owner can delete it' USING ERRCODE='42501';
  END IF;
  IF item.deleted_at IS NULL THEN
    UPDATE public.email_templates SET deleted_at=now(), updated_by=auth.uid(), version=version+1
      WHERE id=template_id;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.soft_delete_email_template(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_email_template(uuid) TO authenticated;

COMMIT;
