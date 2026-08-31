-- v1.16: staging table for the overnight "close out elapsed meetings" cron
-- (app/api/cron/process-elapsed-meetings). Each night, every orbit.upcoming_meetings row
-- whose date has passed is turned into one row here — extracted intelligence from the
-- owner's own prep notes, staged for review — and the source upcoming_meetings row is
-- deleted. Nothing here ever becomes a real orbit.meetings row without the owner reviewing
-- it in the app first: the cron produces a proposal, never a commit. Once the owner reviews
-- one (accepts into orbit.meetings, or discards it), its row here is deleted.
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor), same as migration 004.

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

create index if not exists idx_pending_meeting_reviews_user_date on orbit.pending_meeting_reviews (user_id, date asc);

alter table orbit.pending_meeting_reviews enable row level security;

drop policy if exists pending_meeting_reviews_all on orbit.pending_meeting_reviews;
create policy pending_meeting_reviews_all on orbit.pending_meeting_reviews for all using (true) with check (true);

grant select, insert, update, delete on orbit.pending_meeting_reviews to anon, authenticated, service_role;

-- No change needed to "Exposed schemas" in Project Settings → API — `orbit` is already
-- exposed there from the original schema.sql setup.
