
CREATE OR REPLACE FUNCTION public.finder_product_detail(_store uuid, _item uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_row public.stores%ROWTYPE;
  _pub public.catalogue_publications%ROWTYPE;
  _cv public.catalogue_versions%ROWTYPE;
  _item_row public.catalogue_version_items%ROWTYPE;
BEGIN
  SELECT * INTO _store_row FROM public.stores WHERE id = _store AND status = 'active';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','store_not_found');
  END IF;

  SELECT * INTO _pub FROM public.catalogue_publications
   WHERE store_id = _store AND superseded_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','no_active_publication');
  END IF;

  SELECT * INTO _cv FROM public.catalogue_versions
   WHERE id = _pub.catalogue_version_id
     AND organisation_id = _store_row.organisation_id
     AND frozen_at IS NOT NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','unavailable',
      'unavailable_reason','catalogue_version_not_frozen');
  END IF;

  SELECT * INTO _item_row FROM public.catalogue_version_items cvi
   WHERE cvi.id = _item
     AND cvi.catalogue_version_id = _cv.id
     AND cvi.store_id = _store
     AND cvi.available_for_display;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'generated_at', now(),
    'catalogue_version', jsonb_build_object(
      'id', _cv.id,
      'version_number', _cv.version_number,
      'frozen_at', _cv.frozen_at,
      'published_at', _pub.published_at,
      'publication_id', _pub.id),
    'item', to_jsonb(_item_row));
END;
$$;
