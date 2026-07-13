
CREATE OR REPLACE FUNCTION app_private.is_publisher_context()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(current_setting('app.catalogue_workflow', true), '') = 'publisher';
$$;
