REVOKE ALL ON public.bling_connections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.bling_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bling_connections TO service_role;
GRANT ALL ON public.bling_oauth_states TO service_role;