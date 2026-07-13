
REVOKE EXECUTE ON FUNCTION public.current_staff_profile_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_membership(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_store_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_store_membership(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_staff_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_membership(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_store_role(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_store_membership(uuid, uuid) TO authenticated, service_role;
