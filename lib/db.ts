import { supabase } from "./supabase/client";
import { seedData } from "./seed";
import type { Commitment, Extraction, Meeting, PendingMeetingReview, Stakeholder, UpcomingMeeting } from "./types";
import { SELF } from "./utils";

const USER = "rohit"; // single-user V1; becomes auth.uid() when auth is added

// ---- row <-> domain mapping ----
type StakeholderRow = {
  id: string; name: string; title: string | null; relationship: string | null;
  reports_to: string | null; summary: string | null; summary_generated_at: string | null;
};
type MeetingRow = {
  id: string; title: string; date: string; summary: string | null;
  topics: unknown; mentioned: unknown; expectations: unknown; commitments: unknown;
  concerns: unknown; decisions: unknown; action_items: unknown; transcript: string | null;
};
type UpcomingMeetingRow = {
  id: string; title: string; date: string; start_time: string | null; end_time: string | null;
  attendees: unknown; location: string | null; notes: string | null;
  created_at: string; updated_at: string;
};
type PendingMeetingReviewRow = {
  id: string; source_upcoming_meeting_id: string | null; title: string; date: string;
  start_time: string | null; end_time: string | null; attendees: unknown; location: string | null;
  notes: string | null; extraction: unknown; created_at: string;
};

// `shared` schema holds tables also read by other apps on this Supabase project
// (currently just Risk Dashboard, in its own `risk_dashboard` schema).
// `orbit` schema holds tables specific to this app.
const stakeholdersTable = () => supabase.schema("shared").from("stakeholders");
const meetingsTable = () => supabase.schema("orbit").from("meetings");
const upcomingMeetingsTable = () => supabase.schema("orbit").from("upcoming_meetings");
const pendingMeetingReviewsTable = () => supabase.schema("orbit").from("pending_meeting_reviews");

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

// Supabase-js returns { error } instead of throwing. Writes were being silently dropped
// (e.g. by an RLS policy) with no signal, so the UI updated optimistically and then reverted
// on next refresh because nothing had actually landed in Postgres. This makes failures loud.
function check(op: string, error: { message: string } | null) {
  if (error) {
    console.error(`[orbit/db] ${op} failed:`, error.message);
    throw new Error(`${op} failed: ${error.message}`);
  }
}

// Additive (v1.8): older commitments simply have no `updates`; absent = [] on read, never a
// destructive backfill.
const normUpdates = (raw: unknown): Commitment["updates"] => (Array.isArray(raw) ? (raw as Commitment["updates"]) : []);

// Migrate legacy commitments ({owedByMe, stakeholderId}) to directional ({ownerId, owedToId}).
function normCommitment(raw: Record<string, unknown>): Commitment {
  if ("ownerId" in raw || "owedToId" in raw) {
    return {
      id: String(raw.id), text: String(raw.text ?? ""),
      ownerId: (raw.ownerId as string | null) ?? null,
      owedToId: (raw.owedToId as string | null) ?? null,
      due: (raw.due as string | null) ?? null,
      dueDate: (raw.dueDate as string | null) ?? null,
      source: raw.source as string | undefined,
      status: (raw.status as "open" | "done") ?? "open",
      updates: normUpdates(raw.updates),
    };
  }
  const owedByMe = Boolean(raw.owedByMe);
  const other = (raw.stakeholderId as string | null) ?? null;
  return {
    id: String(raw.id), text: String(raw.text ?? ""),
    ownerId: owedByMe ? SELF : other,
    owedToId: owedByMe ? other : SELF,
    due: (raw.due as string | null) ?? null,
    dueDate: (raw.dueDate as string | null) ?? null,
    source: raw.source as string | undefined,
    status: (raw.status as "open" | "done") ?? "open",
    updates: normUpdates(raw.updates),
  };
}

function toStakeholder(r: StakeholderRow): Stakeholder {
  return {
    id: r.id,
    name: r.name,
    title: r.title ?? "—",
    relationship: (r.relationship as Stakeholder["relationship"]) ?? "Other",
    reportsTo: r.reports_to,
    summary: r.summary ?? undefined,
    summaryGeneratedAt: r.summary_generated_at,
  };
}
function toMeeting(r: MeetingRow): Meeting {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    summary: r.summary ?? "",
    topics: arr<string>(r.topics),
    mentioned: arr<string>(r.mentioned),
    expectations: arr<Meeting["expectations"][number]>(r.expectations),
    commitments: arr<Record<string, unknown>>(r.commitments).map(normCommitment),
    concerns: arr<Meeting["concerns"][number]>(r.concerns),
    decisions: arr<string>(r.decisions),
    actionItems: arr<string>(r.action_items),
    transcript: r.transcript ?? undefined,
  };
}
function stakeholderRow(s: Stakeholder) {
  return { id: s.id, user_id: USER, name: s.name, title: s.title, relationship: s.relationship, reports_to: s.reportsTo, summary: s.summary ?? null, summary_generated_at: s.summaryGeneratedAt ?? null };
}
function meetingRow(m: Meeting) {
  return {
    id: m.id, user_id: USER, title: m.title, date: m.date, summary: m.summary,
    topics: m.topics, mentioned: m.mentioned, expectations: m.expectations,
    commitments: m.commitments, concerns: m.concerns, decisions: m.decisions, action_items: m.actionItems,
    transcript: m.transcript ?? null,
  };
}
function toUpcomingMeeting(r: UpcomingMeetingRow): UpcomingMeeting {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    attendees: arr<string>(r.attendees),
    location: r.location,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function upcomingMeetingRow(u: UpcomingMeeting) {
  return {
    id: u.id, user_id: USER, title: u.title, date: u.date,
    start_time: u.startTime, end_time: u.endTime, attendees: u.attendees,
    location: u.location, notes: u.notes, updated_at: u.updatedAt,
  };
}
function toPendingMeetingReview(r: PendingMeetingReviewRow): PendingMeetingReview {
  return {
    id: r.id,
    sourceUpcomingMeetingId: r.source_upcoming_meeting_id,
    title: r.title,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    attendees: arr<string>(r.attendees),
    location: r.location,
    notes: r.notes,
    extraction: (r.extraction ?? {}) as Extraction,
    createdAt: r.created_at,
  };
}
function pendingMeetingReviewRow(p: PendingMeetingReview) {
  return {
    id: p.id, user_id: USER, source_upcoming_meeting_id: p.sourceUpcomingMeetingId,
    title: p.title, date: p.date, start_time: p.startTime, end_time: p.endTime,
    attendees: p.attendees, location: p.location, notes: p.notes,
    extraction: p.extraction, created_at: p.createdAt,
  };
}

// ---- reads ----
export async function fetchAll(): Promise<{
  stakeholders: Stakeholder[]; meetings: Meeting[]; upcomingMeetings: UpcomingMeeting[]; pendingMeetingReviews: PendingMeetingReview[];
}> {
  const [{ data: s }, { data: m }, { data: u }, { data: p }] = await Promise.all([
    stakeholdersTable().select("*").eq("user_id", USER),
    meetingsTable().select("*").eq("user_id", USER).order("date", { ascending: false }),
    upcomingMeetingsTable().select("*").eq("user_id", USER).order("date", { ascending: true }),
    pendingMeetingReviewsTable().select("*").eq("user_id", USER).order("date", { ascending: true }),
  ]);
  return {
    stakeholders: (s as StakeholderRow[] | null ?? []).map(toStakeholder),
    meetings: (m as MeetingRow[] | null ?? []).map(toMeeting),
    upcomingMeetings: (u as UpcomingMeetingRow[] | null ?? []).map(toUpcomingMeeting),
    pendingMeetingReviews: (p as PendingMeetingReviewRow[] | null ?? []).map(toPendingMeetingReview),
  };
}

export async function seedIfEmpty(): Promise<void> {
  const { count } = await stakeholdersTable().select("id", { count: "exact", head: true }).eq("user_id", USER);
  if (count && count > 0) return;
  const { stakeholders, meetings } = seedData();
  check("seed stakeholders", (await stakeholdersTable().insert(stakeholders.map(stakeholderRow))).error);
  check("seed meetings", (await meetingsTable().insert(meetings.map(meetingRow))).error);
}

// ---- writes ----
export async function insertStakeholder(s: Stakeholder) {
  check("insertStakeholder", (await stakeholdersTable().insert(stakeholderRow(s))).error);
}
export async function insertStakeholders(list: Stakeholder[]) {
  if (list.length) check("insertStakeholders", (await stakeholdersTable().insert(list.map(stakeholderRow))).error);
}
export async function insertMeeting(m: Meeting) {
  check("insertMeeting", (await meetingsTable().insert(meetingRow(m))).error);
}
export async function updateMeeting(id: string, patch: Partial<ReturnType<typeof meetingRow>>) {
  check("updateMeeting", (await meetingsTable().update(patch).eq("id", id).eq("user_id", USER)).error);
}
export async function saveMeeting(m: Meeting) {
  const { id, ...rest } = meetingRow(m);
  check("saveMeeting", (await meetingsTable().update(rest).eq("id", id).eq("user_id", USER)).error);
}
export async function deleteMeeting(id: string) {
  check("deleteMeeting", (await meetingsTable().delete().eq("id", id).eq("user_id", USER)).error);
}

export async function insertUpcomingMeeting(u: UpcomingMeeting) {
  check("insertUpcomingMeeting", (await upcomingMeetingsTable().insert(upcomingMeetingRow(u))).error);
}
export async function updateUpcomingMeeting(id: string, patch: Partial<ReturnType<typeof upcomingMeetingRow>>) {
  check("updateUpcomingMeeting", (await upcomingMeetingsTable().update(patch).eq("id", id).eq("user_id", USER)).error);
}
export async function deleteUpcomingMeeting(id: string) {
  check("deleteUpcomingMeeting", (await upcomingMeetingsTable().delete().eq("id", id).eq("user_id", USER)).error);
}

// Elapsed (date < cutoff) upcoming meetings — used by the overnight
// process-elapsed-meetings cron, not by the normal client UI.
export async function fetchElapsedUpcomingMeetings(cutoffISO: string): Promise<UpcomingMeeting[]> {
  const { data, error } = await upcomingMeetingsTable().select("*").eq("user_id", USER).lt("date", cutoffISO);
  check("fetchElapsedUpcomingMeetings", error);
  return (data as UpcomingMeetingRow[] | null ?? []).map(toUpcomingMeeting);
}

export async function insertPendingMeetingReview(p: PendingMeetingReview) {
  check("insertPendingMeetingReview", (await pendingMeetingReviewsTable().insert(pendingMeetingReviewRow(p))).error);
}
export async function deletePendingMeetingReview(id: string) {
  check("deletePendingMeetingReview", (await pendingMeetingReviewsTable().delete().eq("id", id).eq("user_id", USER)).error);
}

export async function updateStakeholder(
  id: string,
  patch: { name?: string; title?: string; relationship?: string; reportsTo?: string | null; summary?: string; summaryGeneratedAt?: string | null }
) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.relationship !== undefined) row.relationship = patch.relationship;
  if (patch.reportsTo !== undefined) row.reports_to = patch.reportsTo;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.summaryGeneratedAt !== undefined) row.summary_generated_at = patch.summaryGeneratedAt;
  check("updateStakeholder", (await stakeholdersTable().update(row).eq("id", id).eq("user_id", USER)).error);
}
export async function deleteStakeholder(id: string) {
  check("deleteStakeholder", (await stakeholdersTable().delete().eq("id", id).eq("user_id", USER)).error);
}
