-- Orbit v1.3 — split single `public` schema into `shared` (cross-app) and `orbit`
-- (Orbit-only) schemas, on the SAME Supabase project also used by Risk Dashboard
-- (which lives in its own `risk_dashboard` schema).
--
-- Run this ONCE in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe for existing data: `alter table ... set schema ...` is a metadata-only move —
-- it does NOT copy or touch rows, indexes, or RLS policies. Your existing
-- stakeholders/meetings records, and the existing `stakeholders_all` / `meetings_all`
-- RLS policies, all move with the table intact.
--
-- BEFORE running: note your current row counts so you can sanity-check after.
--   select count(*) from public.stakeholders;
--   select count(*) from public.meetings;

-- 1. Create the two new schemas.
create schema if not exists shared;
create schema if not exists orbit;

-- 2. Move existing tables into their new home. Data, indexes, RLS policies, and
--    triggers all travel with the table — nothing is recreated or copied.
alter table if exists public.stakeholders set schema shared;
alter table if exists public.meetings set schema orbit;

-- 3. Grant schema usage + table access to the roles Supabase uses for API requests.
--    `anon` = your app's NEXT_PUBLIC_SUPABASE_ANON_KEY. `authenticated` = logged-in
--    users (not used yet in Orbit's single-user V1, granted for when auth is added).
--    `service_role` = full-bypass key for server-side/admin use.
grant usage on schema shared to anon, authenticated, service_role;
grant usage on schema orbit  to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema shared to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema orbit  to anon, authenticated, service_role;

-- 4. Make sure any FUTURE tables you add to these schemas also get access
--    automatically, without needing to re-run grants each time.
alter default privileges in schema shared
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema orbit
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- 5. Verify. Row counts should match what you noted before running this script,
--    and both policies should still be listed.
select 'shared.stakeholders' as table_name, count(*) from shared.stakeholders
union all
select 'orbit.meetings', count(*) from orbit.meetings;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('shared', 'orbit');

-- 6. MANUAL STEP — cannot be done from SQL:
--    Go to Project Settings → API → Data API settings → "Exposed schemas"
--    and add `shared` and `orbit` to the list (comma-separated alongside
--    whatever's already there, e.g. `public,shared,orbit`). Without this,
--    PostgREST (what supabase-js talks to) will 404 on these tables even
--    though the grants above are correct — exposure is a separate, additive
--    allowlist Supabase keeps at the API gateway level, not in Postgres.
