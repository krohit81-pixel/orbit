-- v1.15: new table for scheduled/future meetings imported from a photo of the owner's
-- Outlook calendar. A deliberately separate, lighter entity from orbit.meetings — no
-- transcript, no extracted intelligence, just what's on the calendar plus the owner's own
-- prep notes. Lives in the `orbit` schema alongside meetings (Orbit-only, not shared with
-- Risk Dashboard).
--
-- This is the first new table since v1.4 — every feature since then fit additively into
-- existing tables' JSONB columns; this one is a genuinely new entity that doesn't belong on
-- Meeting or Stakeholder. Run this once in the Supabase SQL editor (Project → SQL Editor).

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

create index if not exists idx_upcoming_meetings_user_date on orbit.upcoming_meetings (user_id, date asc);

alter table orbit.upcoming_meetings enable row level security;

drop policy if exists upcoming_meetings_all on orbit.upcoming_meetings;
create policy upcoming_meetings_all on orbit.upcoming_meetings for all using (true) with check (true);

grant select, insert, update, delete on orbit.upcoming_meetings to anon, authenticated, service_role;

-- No change needed to "Exposed schemas" in Project Settings → API — `orbit` is already
-- exposed there from the original schema.sql setup.
