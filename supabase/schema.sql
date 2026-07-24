-- Orbit schema (v1.4+). Run this in the Supabase SQL editor for a FRESH project setup.
-- If you already have data from before v1.3, use supabase/migrations/002_split_schemas.sql
-- first, then supabase/migrations/003_add_meeting_transcript.sql (v1.4) — this file is
-- the from-scratch reference, not a migration.
--
-- This project's Supabase instance is shared with the separate Risk Dashboard app,
-- which lives in its own `risk_dashboard` schema. Orbit uses two schemas:
--   - `shared` — tables other apps on this project (e.g. Risk Dashboard) may also read,
--     starting with `stakeholders`.
--   - `orbit`  — tables specific to Orbit only, starting with `meetings`.
--
-- Single-user V1: no auth yet. RLS is enabled with permissive policies so the
-- anon key can read/write. Protect the deployment with Vercel password protection
-- until Supabase Auth is added (see README), then swap the policies to key on auth.uid().

create schema if not exists shared;
create schema if not exists orbit;

create table if not exists shared.stakeholders (
  id           text primary key,
  user_id      text not null default 'rohit',
  name         text not null,
  title        text default '—',
  relationship text default 'Other',
  reports_to   text,
  summary      text,
  summary_generated_at timestamptz,
  created_at   timestamptz default now()
);

create table if not exists orbit.meetings (
  id           text primary key,
  user_id      text not null default 'rohit',
  title        text not null,
  date         date not null,
  summary      text,
  topics       jsonb default '[]'::jsonb,
  mentioned    jsonb default '[]'::jsonb,
  expectations jsonb default '[]'::jsonb,
  commitments  jsonb default '[]'::jsonb,
  concerns     jsonb default '[]'::jsonb,
  decisions    jsonb default '[]'::jsonb,
  action_items jsonb default '[]'::jsonb,
  transcript   text,
  created_at   timestamptz default now()
);

create index if not exists idx_stakeholders_user on shared.stakeholders (user_id);
create index if not exists idx_meetings_user_date on orbit.meetings (user_id, date desc);

alter table shared.stakeholders enable row level security;
alter table orbit.meetings enable row level security;

-- Permissive single-user policies. Replace `using (true)` / `with check (true)`
-- with `using (auth.uid()::text = user_id)` once Supabase Auth is wired up.
drop policy if exists stakeholders_all on shared.stakeholders;
create policy stakeholders_all on shared.stakeholders for all using (true) with check (true);

drop policy if exists meetings_all on orbit.meetings;
create policy meetings_all on orbit.meetings for all using (true) with check (true);

grant usage on schema shared to anon, authenticated, service_role;
grant usage on schema orbit  to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema shared to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema orbit  to anon, authenticated, service_role;
alter default privileges in schema shared
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema orbit
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- Also required (dashboard, not SQL): Project Settings → API → Data API settings →
-- "Exposed schemas" must include `shared` and `orbit`.
