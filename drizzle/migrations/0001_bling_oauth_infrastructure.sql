CREATE TABLE public.bling_oauth_states (
 state_hash text PRIMARY KEY,
 browser_hash text NOT NULL,
 user_id uuid NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bling_oauth_states TO service_role;
ALTER TABLE public.bling_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.bling_connections (
 id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
 encrypted_tokens text NOT NULL,
 authorized_by uuid NOT NULL,
 authorized_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 refreshed_at timestamptz,
 refresh_lock_until timestamptz,
 revision uuid NOT NULL DEFAULT gen_random_uuid(),
 last_error text
);
GRANT ALL ON public.bling_connections TO service_role;
ALTER TABLE public.bling_connections ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_bling_oauth_state(p_state_hash text, p_browser_hash text)
RETURNS TABLE(user_id uuid) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 DELETE FROM public.bling_oauth_states s
 WHERE s.state_hash = p_state_hash AND s.browser_hash = p_browser_hash AND s.expires_at > now()
 RETURNING s.user_id;
$$;
REVOKE ALL ON FUNCTION public.consume_bling_oauth_state(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_bling_oauth_state(text, text) TO service_role;
COMMENT ON TABLE public.bling_connections IS 'Server-only AES-GCM encrypted Bling OAuth credentials; never expose tokens through administrative status reads.';