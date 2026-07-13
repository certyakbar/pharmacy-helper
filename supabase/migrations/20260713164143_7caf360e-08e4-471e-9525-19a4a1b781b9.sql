
ALTER FUNCTION app_private.is_recovery_context() SET search_path = public;
ALTER FUNCTION app_private.handover_pepper() SET search_path = public;
ALTER FUNCTION app_private.normalise_handover_code(text) SET search_path = public;
ALTER FUNCTION app_private.handover_hmac(text) SET search_path = public, extensions;
ALTER FUNCTION app_private.enforce_catalogue_import_workflow() SET search_path = public;
ALTER FUNCTION app_private.enforce_kiosk_tenant() SET search_path = public;
ALTER FUNCTION app_private.enforce_catalogue_import_tenant() SET search_path = public;
ALTER FUNCTION app_private.enforce_customer_session_tenant() SET search_path = public;
ALTER FUNCTION app_private.enforce_audit_tenant() SET search_path = public;
ALTER FUNCTION app_private.enforce_handover_tenant() SET search_path = public;
ALTER FUNCTION app_private.enforce_shortlist_tenant() SET search_path = public;
