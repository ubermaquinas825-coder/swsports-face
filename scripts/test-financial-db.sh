#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# A fresh local container only: no DATABASE_URL, host ports or application secrets.
# Pin the official PostgreSQL 17.6 image by digest for reproducibility.
image='postgres:17.6@sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929'
container=$(docker run --detach --network none --tmpfs /var/lib/postgresql/data:rw --env POSTGRES_HOST_AUTH_METHOD=trust "$image")
trap 'docker rm --force --volumes "$container" >/dev/null' EXIT
ready=false
for attempt in {1..30}; do
  if docker logs "$container" 2>&1 | rg 'PostgreSQL init process complete' >/dev/null && docker exec "$container" pg_isready --username postgres --dbname postgres >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then
  docker logs "$container"
  exit 1
fi

docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
SQL
for migration in drizzle/migrations/*.sql; do
  docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 < "$migration"
done
docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 < src/test/financial-transitions.sql
