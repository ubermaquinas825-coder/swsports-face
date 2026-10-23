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
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
SQL
for migration in drizzle/migrations/*.sql; do
  docker exec --interactive "$container" psql --username postgres --no-psqlrc --single-transaction --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 < "$migration"
done
docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 < src/test/financial-transitions.sql

docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 < src/test/financial-recovery-access.sql

# A real second session holds the row without updating it. Lease predicates must
# be evaluated after acquiring ownership, never before an unbounded lock wait.
revision=$(docker exec "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 -c "INSERT INTO public.shipping_orders (id,payment_link_id) VALUES ('90000000-0000-4000-8000-000000000001','lock-test'); SELECT public.claim_appmax_check_v2('90000000-0000-4000-8000-000000000001');")
docker exec "$container" psql --username postgres --no-psqlrc --quiet --set ON_ERROR_STOP=1 -c "BEGIN; SET application_name='financial-lock-test'; SELECT id FROM public.shipping_orders WHERE id='90000000-0000-4000-8000-000000000001' FOR UPDATE; SELECT pg_sleep(4); COMMIT;" >/dev/null &
locker=$!
locked=false
for attempt in {1..20}; do
  if [ "$(docker exec "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align -c "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='financial-lock-test' AND wait_event='PgSleep');")" = t ]; then
    locked=true
    break
  fi
  sleep 0.1
done
if [ "$locked" != true ]; then exit 1; fi
docker exec --interactive "$container" psql --username postgres --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 --set revision="$revision" <<'SQL'
SET statement_timeout = '500ms';
SET ROLE service_role;
SELECT 1 / CASE WHEN public.claim_appmax_check_v2('90000000-0000-4000-8000-000000000001') IS NULL THEN 1 ELSE 0 END;
SELECT 1 / CASE WHEN public.renew_appmax_check('90000000-0000-4000-8000-000000000001', :'revision') IS NULL THEN 1 ELSE 0 END;
SELECT 1 / CASE WHEN NOT public.defer_appmax_check('90000000-0000-4000-8000-000000000001', :'revision') THEN 1 ELSE 0 END;
SELECT 1 / CASE WHEN NOT public.commit_appmax_check('90000000-0000-4000-8000-000000000001', :'revision', NULL, NULL, 'pendente', false) THEN 1 ELSE 0 END;
SQL
wait "$locker"
printf '%s\n' 'PASS: four lease operations refuse a row locked by a real second session within 500ms'
