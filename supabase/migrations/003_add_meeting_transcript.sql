-- Orbit v1.4 — store the raw meeting transcript/notes a meeting was extracted from,
-- so it can be referenced (and edited) later from the meeting detail screen.
--
-- Additive, nullable column. Existing meetings simply have transcript = null
-- until edited; no backfill needed and nothing else changes shape.
--
-- Run this ONCE in the Supabase SQL Editor (Project -> SQL Editor -> New query).

alter table orbit.meetings add column if not exists transcript text;
