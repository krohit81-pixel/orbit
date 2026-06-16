import { supabase } from "./supabase/client";
import { seedData } from "./seed";
import type { Meeting, Stakeholder } from "./types";

const USER = "rohit"; // single-user V1; becomes auth.uid() when auth is added

// ---- row <-> domain mapping ----
type StakeholderRow = {
  id: string; name: string; title: string | null; relationship: string | null;
  reports_to: string | null; summary: string | null; summary_generated_at: string | null;
};
type MeetingRow = {
  id: string; title: string; date: string; summary: string | null;
  topics: unknown; mentioned: unknown; expectations: unknown; commitments: unknown;
  concerns: unknown; decisions: unknown; action_items: unknown;
};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

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
    commitments: arr<Meeting["commitments"][number]>(r.commitments),
    concerns: arr<Meeting["concerns"][number]>(r.concerns),
    decisions: arr<string>(r.decisions),
    actionItems: arr<string>(r.action_items),
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
  };
}

// ---- reads ----
export async function fetchAll(): Promise<{ stakeholders: Stakeholder[]; meetings: Meeting[] }> {
  const [{ data: s }, { data: m }] = await Promise.all([
    supabase.from("stakeholders").select("*").eq("user_id", USER),
    supabase.from("meetings").select("*").eq("user_id", USER).order("date", { ascending: false }),
  ]);
  return {
    stakeholders: (s as StakeholderRow[] | null ?? []).map(toStakeholder),
    meetings: (m as MeetingRow[] | null ?? []).map(toMeeting),
  };
}

export async function seedIfEmpty(): Promise<void> {
  const { count } = await supabase.from("stakeholders").select("id", { count: "exact", head: true }).eq("user_id", USER);
  if (count && count > 0) return;
  const { stakeholders, meetings } = seedData();
  await supabase.from("stakeholders").insert(stakeholders.map(stakeholderRow));
  await supabase.from("meetings").insert(meetings.map(meetingRow));
}

// ---- writes ----
export async function insertStakeholder(s: Stakeholder) {
  await supabase.from("stakeholders").insert(stakeholderRow(s));
}
export async function insertStakeholders(list: Stakeholder[]) {
  if (list.length) await supabase.from("stakeholders").insert(list.map(stakeholderRow));
}
export async function insertMeeting(m: Meeting) {
  await supabase.from("meetings").insert(meetingRow(m));
}
export async function updateMeeting(id: string, patch: Partial<ReturnType<typeof meetingRow>>) {
  await supabase.from("meetings").update(patch).eq("id", id);
}
export async function saveMeeting(m: Meeting) {
  const { id, ...rest } = meetingRow(m);
  await supabase.from("meetings").update(rest).eq("id", id);
}
export async function deleteMeeting(id: string) {
  await supabase.from("meetings").delete().eq("id", id);
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
  await supabase.from("stakeholders").update(row).eq("id", id);
}
export async function deleteStakeholder(id: string) {
  await supabase.from("stakeholders").delete().eq("id", id);
}
