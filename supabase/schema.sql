-- Orbit schema (v1.4+, upcoming_meetings added v1.15, pending_meeting_reviews added v1.16).
-- Run this in the Supabase SQL editor for a FRESH project setup. If you already have data
-- from before v1.3, use supabase/migrations/002_split_schemas.sql first, then
-- 003_add_meeting_transcript.sql (v1.4), then 004_add_upcoming_meetings.sql (v1.15), then
-- 005_add_pending_meeting_reviews.sql (v1.16) — this file is the from-scratch reference, not
-- a migration.
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

-- Scheduled/future meetings imported from a calendar photo (v1.15) — deliberately separate
-- from orbit.meetings: no transcript, no extracted intelligence, just what's on the calendar
-- plus the owner's own prep notes. See migrations/004_add_upcoming_meetings.sql for the
-- reasoning; this table definition matches it exactly.
create table if not exists orbit.upcoming_meetings (
  id           text primary key,
  user_id      text not null default 'rohit',
  title        text not null,
  date         date not null,
  start_time   text,
  end_time     text,
  attendees    jsonb default '[]'::jsonb,
  location     text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Staging table for the overnight "close out elapsed meetings" cron (v1.16) — turns each
-- upcoming_meetings row into one of these once its date passes, extracting whatever
-- intelligence the owner's own prep notes contain, and deletes the source row. Nothing here
-- reaches orbit.meetings without the owner reviewing it in the app first; see
-- migrations/005_add_pending_meeting_reviews.sql for the reasoning.
create table if not exists orbit.pending_meeting_reviews (
  id                          text primary key,
  user_id                     text not null default 'rohit',
  source_upcoming_meeting_id  text,
  title                       text not null,
  date                        date not null,
  start_time                  text,
  end_time                    text,
  attendees                   jsonb default '[]'::jsonb,
  location                    text,
  notes                       text,
  extraction                  jsonb not null default '{}'::jsonb,
  created_at                  timestamptz default now()
);

create index if not exists idx_stakeholders_user on shared.stakeholders (user_id);
create index if not exists idx_meetings_user_date on orbit.meetings (user_id, date desc);
create index if not exists idx_upcoming_meetings_user_date on orbit.upcoming_meetings (user_id, date asc);
create index if not exists idx_pending_meeting_reviews_user_date on orbit.pending_meeting_reviews (user_id, date asc);

alter table shared.stakeholders enable row level security;
alter table orbit.meetings enable row level security;
alter table orbit.upcoming_meetings enable row level security;
alter table orbit.pending_meeting_reviews enable row level security;

-- Permissive single-user policies. Replace `using (true)` / `with check (true)`
-- with `using (auth.uid()::text = user_id)` once Supabase Auth is wired up.
drop policy if exists stakeholders_all on shared.stakeholders;
create policy stakeholders_all on shared.stakeholders for all using (true) with check (true);

drop policy if exists meetings_all on orbit.meetings;
create policy meetings_all on orbit.meetings for all using (true) with check (true);

drop policy if exists upcoming_meetings_all on orbit.upcoming_meetings;
create policy upcoming_meetings_all on orbit.upcoming_meetings for all using (true) with check (true);

drop policy if exists pending_meeting_reviews_all on orbit.pending_meeting_reviews;
create policy pending_meeting_reviews_all on orbit.pending_meeting_reviews for all using (true) with check (true);

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
