-- Security hardening identified during the deploy audit.
-- rls_auto_enable() is an event-trigger helper and is not an application RPC.
-- Keep ownership/SECURITY DEFINER unchanged; only remove unnecessary invocation grants.
-- This migration is intentionally NOT applied automatically by this change set.
-- Some clean/local PostgreSQL test databases do not contain Supabase-managed helper
-- functions or roles, so this migration must safely no-op in those environments.

DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC';

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated';
  END IF;
END
$$;
