create table if not exists public.melhor_envio_connections (
  id boolean primary key default true check (id),
  access_token text not null,
  refresh_token text not null,
  token_type text not null default 'Bearer',
  expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  scopes text,
  environment text not null check (environment in ('sandbox','production')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.melhor_envio_connections enable row level security;
revoke all on table public.melhor_envio_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.melhor_envio_connections to service_role;

comment on table public.melhor_envio_connections is 'Server-only Melhor Envio OAuth tokens. Never expose through browser clients.';
