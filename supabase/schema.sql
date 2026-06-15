-- Orbit V1 schema. Run this in the Supabase SQL editor.
-- Single-user V1: no auth yet. RLS is enabled with permissive policies so the
-- anon key can read/write. Protect the deployment with Vercel password protection
-- until Supabase Auth is added (see README), then swap the policies to key on auth.uid().

create table if not exists stakeholders (
  id           text primary key,
  user_id      text not null default 'rohit',
  name         text not null,
  title        text default '—',
  relationship text default 'Other',
  reports_to   text,
  summary      text,
  created_at   timestamptz default now()
);

create table if not exists meetings (
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
  created_at   timestamptz default now()
);

create index if not exists idx_stakeholders_user on stakeholders (user_id);
create index if not exists idx_meetings_user_date on meetings (user_id, date desc);

alter table stakeholders enable row level security;
alter table meetings enable row level security;

-- Permissive single-user policies. Replace `using (true)` / `with check (true)`
-- with `using (auth.uid()::text = user_id)` once Supabase Auth is wired up.
drop policy if exists stakeholders_all on stakeholders;
create policy stakeholders_all on stakeholders for all using (true) with check (true);

drop policy if exists meetings_all on meetings;
create policy meetings_all on meetings for all using (true) with check (true);
