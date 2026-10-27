-- Security hardening identified during the deploy audit.
-- rls_auto_enable() is an event-trigger helper and is not an application RPC.
-- Keep ownership/SECURITY DEFINER unchanged; only remove unnecessary invocation grants.
-- This migration is intentionally NOT applied automatically by this change set.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
