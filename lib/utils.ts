import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Commitment, CommitmentUpdate, Concern, Expectation, Meeting, Relationship, Stakeholder } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RELATIONSHIPS: Relationship[] = [
  "Sponsor", "Functional lead", "My manager", "Peer", "Reports to me", "Vendor", "Future hire", "Other",
];

let _id = 1000;
export const uid = () => `id${_id++}_${Math.random().toString(36).slice(2, 7)}`;
export const SELF = "me";

// ---- dates ----
// A real bug, found via v1.14's week-gantt (see master context §10): `toISOString()` always
// converts to UTC, but `setDate()`/`getDate()`/`new Date()` operate in LOCAL time. Mixing the
// two — build/mutate a Date using local-time methods, then read it back via `toISOString()` —
// silently returns the WRONG calendar day whenever the local UTC offset is positive (true for
// India Standard Time, UTC+5:30, where this app is actually used): local midnight is still the
// previous day in UTC. `isoFromLocalDate` reads the calendar date back out using local getters
// instead, which is what "today" or "N days from today" should mean for a single-timezone,
// single-user app like this one.
function isoFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export const isoIn = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoFromLocalDate(d);
};
export const todayISO = () => isoFromLocalDate(new Date());
export const fmtDate = (s?: string | null): string | null =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;
export const fmtFull = (s?: string | null): string =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtStamp = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtToday = (): string =>
  new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
// 3-letter weekday only ("Mon") — for the week-gantt day header (v1.14), the one place so
// far that wants just the day name without a date attached.
export const fmtWeekdayShort = (s: string): string =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
export const isOverdue = (s?: string | null): boolean => bucketDue(s) === "overdue";

// `iso` is a plain calendar date with no timezone of its own — done entirely in UTC (parse as
// UTC midnight, mutate with the UTC setter, serialize via toISOString, which is UTC) so the
// round-trip can't drift a day the way mixing local-time parsing with UTC serialization did
// (see the note above todayISO/isoIn — the same bug class, fixed the same way: pick one
// timezone and never cross it mid-function).
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
// Monday-start business week containing the given date.
export function startOfWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDaysISO(iso, diffToMonday);
}
export function weekRange(startISO: string): { start: string; end: string } {
  return { start: startISO, end: addDaysISO(startISO, 6) };
}
export function fmtWeekRange(startISO: string): string {
  const { end } = weekRange(startISO);
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sFmt = s.toLocaleDateString("en-GB", { day: "2-digit", month: sameMonth ? undefined : "short" });
  const eFmt = e.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${sFmt} – ${eFmt}`;
}

export type DueBucket = "overdue" | "week" | "upcoming" | "undated";
export function bucketDue(s?: string | null): DueBucket {
  if (!s) return "undated";
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(s + "T00:00:00").getTime() - t.getTime()) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "week";
  return "upcoming";
}
// Urgency ordering for bucketDue() results — most pressing first. Shared by todaysBriefData
// (open commitments involving me) and weeklyReportData's "pending" list (v1.13) so both
// surfaces sort urgency identically instead of each inventing its own order.
const DUE_RANK: Record<DueBucket, number> = { overdue: 0, week: 1, upcoming: 2, undated: 3 };
function sortByUrgency<T extends { dueDate?: string | null }>(items: T[]): T[] {
  return items.slice().sort((a, b) => {
    const r = DUE_RANK[bucketDue(a.dueDate)] - DUE_RANK[bucketDue(b.dueDate)];
    return r !== 0 ? r : (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}

// Urgency bucket + short status word for the dashboard's open-commitments strip (v1.11).
// Deliberately separate from bucketDue()/DueBucket above (which drive DueLabel and the
// commitments-by-stakeholder sort and use a 7-day "week" window) — the strip wants a
// tighter 3-day amber cutoff, and keeping it a distinct function means that doesn't ripple
// into sorting or DueLabel elsewhere.
export type TileBucket = "overdue" | "soon" | "later" | "undated";
export function dueTileInfo(s?: string | null): { bucket: TileBucket; label: string } {
  if (!s) return { bucket: "undated", label: "No date" };
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(s + "T00:00:00").getTime() - t.getTime()) / 86400000);
  if (days < 0) return { bucket: "overdue", label: "Overdue" };
  if (days === 0) return { bucket: "soon", label: "Due today" };
  if (days === 1) return { bucket: "soon", label: "Due tmrw" };
  if (days <= 3) return { bucket: "soon", label: `${days} days` };
  return { bucket: "later", label: fmtDate(s) ?? "" };
}

// ---- text / search ----
export const norm = (s?: string): string => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function matchesQuery(query: string, text?: string): boolean {
  const toks = norm(query).split(" ").filter(Boolean);
  if (toks.length === 0) return false;
  const hay = norm(text);
  return toks.every((t) => hay.includes(t));
}
// Common function words that are >3 characters (so the old length-only filter let them
// through) but carry no topical meaning — "with", "which", "than", "into" — the exact words
// that were making unrelated concerns look "similar" in a text-heavy corpus. Excluding these
// was necessary once real data showed matches like shared words [which, with, reporting].
const STOPWORDS = new Set([
  "this", "that", "than", "with", "into", "which", "will", "from", "have", "been", "were",
  "they", "their", "them", "some", "such", "only", "also", "more", "most", "both", "each",
  "when", "where", "while", "about", "after", "before", "during", "under", "over", "against",
  "between", "through", "without", "within", "upon", "until", "unless", "because", "although",
  "however", "therefore", "since", "given", "rather", "other", "another", "these", "those",
  "what", "whom", "whose", "being", "doing", "having", "would", "could", "should", "might",
  "must", "shall", "cannot", "does", "done", "very", "just", "then", "there", "here", "still",
  "yet", "even", "much", "many", "less", "least", "every", "either", "neither", "across",
  "around", "among",
]);
function contentWords(s: string): Set<string> {
  return new Set(norm(s).split(" ").filter((w) => w.length > 3 && !STOPWORDS.has(w)));
}
// v1.9.1 fixes, both found by testing against real data rather than synthetic cases:
// (1) both sides are now deduplicated distinct-word sets — previously `tb` was a raw,
//     non-deduped array, so a word repeated twice within one text counted as two separate
//     pieces of "shared vocabulary" evidence, clearing the threshold with no real overlap
//     behind it; (2) stopwords are excluded (see STOPWORDS above) and the main threshold
//     raised 2->3 shared *content* words — in a corpus this concentrated on one ongoing
//     initiative, two matching words are almost always just "risk" and "Pune" showing up
//     everywhere, not two concerns actually restating the same thing.
function similar(a: string, b: string): boolean {
  const ta = contentWords(a);
  const tb = contentWords(b);
  const shared = [...tb].filter((w) => ta.has(w)).length;
  return shared >= 3 || (shared >= 1 && tb.size <= 3);
}

// ---- selectors ----
export const stakeholderById = (stakeholders: Stakeholder[], id: string | null) =>
  stakeholders.find((s) => s.id === id);

export function partyName(stakeholders: Stakeholder[], id: string | null): string {
  if (id === SELF) return "You";
  if (!id) return "someone";
  return stakeholderById(stakeholders, id)?.name ?? "someone";
}

// Directional label, e.g. "You owe Jo", "Tim owes you", "David owes Priya"
export function commitmentLabel(c: Commitment, stakeholders: Stakeholder[]): string {
  const owner = partyName(stakeholders, c.ownerId);
  const owed = partyName(stakeholders, c.owedToId);
  if (c.ownerId === SELF) return c.owedToId ? `You owe ${owed}` : "You owe";
  if (c.owedToId === SELF) return `${owner} owes you`;
  return c.owedToId ? `${owner} owes ${owed}` : `${owner} committed`;
}
// Compact counterparty for the dashboard strip's tiles (v1.11) — just a direction + name,
// no "You owe"/"owes you" phrasing (CommitmentStrip renders the direction as a small arrow
// icon instead, so the name gets more of the tile's limited width). Every commitment reaching
// this has already passed openCommitmentsInvolvingMe, so ownerId or owedToId is always SELF —
// "self" covers the one remaining edge case, "You owe" with no counterparty specified.
export function tileCounterparty(c: Commitment, stakeholders: Stakeholder[]): { name: string; direction: "out" | "in" | "self" } {
  if (c.ownerId === SELF) {
    if (!c.owedToId || c.owedToId === SELF) return { name: "You", direction: "self" };
    return { name: partyName(stakeholders, c.owedToId), direction: "out" };
  }
  return { name: partyName(stakeholders, c.ownerId), direction: "in" };
}
// The other party from the user's perspective (for grouping); null if third-party.
export function otherParty(c: Commitment): string | null {
  if (c.ownerId === SELF) return c.owedToId && c.owedToId !== SELF ? c.owedToId : null;
  if (c.owedToId === SELF) return c.ownerId && c.ownerId !== SELF ? c.ownerId : null;
  return c.ownerId ?? c.owedToId ?? null;
}
export const involvesMe = (c: Commitment) => c.ownerId === SELF || c.owedToId === SELF;

// Newest-first log of progress notes / due-date revisions for a commitment (v1.8). Pure
// read-side helper — writes go through OrbitStore.addCommitmentUpdate.
export function commitmentUpdates(c: Commitment): CommitmentUpdate[] {
  return (c.updates ?? []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export interface OpenCommitment extends Commitment { meeting: Meeting }
function collectCommitments(meetings: Meeting[], predicate: (c: Commitment) => boolean): OpenCommitment[] {
  const out: OpenCommitment[] = [];
  meetings.forEach((m) => m.commitments.forEach((c) => { if (c.status !== "done" && predicate(c)) out.push({ ...c, meeting: m }); }));
  return out;
}
export const myOpenCommitments = (meetings: Meeting[]) => collectCommitments(meetings, (c) => c.ownerId === SELF);
export const owedToMe = (meetings: Meeting[]) => collectCommitments(meetings, (c) => c.owedToId === SELF && c.ownerId !== SELF);
export const openCommitmentsInvolvingMe = (meetings: Meeting[]) => collectCommitments(meetings, involvesMe);
// Every open commitment, regardless of who it's between — unlike the three above, not
// filtered to ones involving "me". Feeds openCommitmentsDigest below: a new meeting might
// close or progress a commitment between two other parties just as easily as one of mine.
export const allOpenCommitments = (meetings: Meeting[]) => collectCommitments(meetings, () => true);

// Compact, [id]-tagged digest of currently open commitments, fed to the "extract" LLM task
// (v1.12) alongside a new meeting's transcript so it can suggest which ones this meeting
// closes, revises the due date on, or otherwise progresses — same "[id] tag so the UI can
// re-resolve it against real data, never trust the model's own restated text" pattern as
// assistantDigest. Sorted soonest-due first (undated last) and capped — this is prompt
// input, not a report, so it should stay bounded even as history grows.
export function openCommitmentsDigest(meetings: Meeting[], stakeholders: Stakeholder[], cap = 40): string {
  const open = allOpenCommitments(meetings)
    .slice()
    .sort((a, b) => (a.dueDate || "9999-99-99").localeCompare(b.dueDate || "9999-99-99"));
  return open
    .slice(0, cap)
    .map((c) => `[${c.id}] ${commitmentLabel(c, stakeholders)}: ${c.text}${c.dueDate ? ` (due ${fmtFull(c.dueDate)})` : c.due ? ` (due ${c.due})` : " (no due date)"}`)
    .join("\n");
}

// ---- week gantt (v1.14) ----
// Deterministic "shape of the week" timeline for Home's dashboard — a rolling 7-day window
// starting today, one row per open commitment due (or overdue) within it, each row's bar
// spanning from the meeting it was raised in to its due date. Both endpoints are real,
// already-tracked dates (Commitment has no separate "start date" field, so the meeting that
// produced it stands in for one) — nothing invented, same provenance spirit as every other
// derived view in the app. No LLM involved; read-only, click-through to the source meeting,
// same interaction as CommitmentStrip's tiles right above it on Home.
export interface WeekGanttRow {
  commitment: OpenCommitment;
  startCol: number; // 0-6, index into `days` — the meeting date, clamped into the window
  endCol: number; // 0-6, index into `days` — the due date, clamped into the window; overdue
                  // commitments clamp to column 0 ("today") rather than a past date off-grid
  bucket: TileBucket; // color, from dueTileInfo() — the exact tokens CommitmentStrip uses
}
export interface WeekGanttData {
  days: string[]; // 7 ISO dates, today first
  rows: WeekGanttRow[]; // most urgent first
}
export function weekGanttData(meetings: Meeting[]): WeekGanttData {
  const start = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  const startMs = new Date(start + "T00:00:00").getTime();
  const dayIndexFrom = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - startMs) / 86400000);

  // Reuses bucketDue's existing 7-day "week" window as the inclusion filter, rather than
  // inventing a new one (see Design Decision #39 on the weekly report's near-identical
  // choice) — an open commitment belongs on this timeline if it's overdue or due within the
  // next 7 days. Undated commitments have no due date to place on a timeline, so they're
  // excluded here (still fully visible elsewhere on Home and every Stakeholder screen).
  const candidates = openCommitmentsInvolvingMe(meetings).filter((c) => {
    if (!c.dueDate) return false;
    const b = bucketDue(c.dueDate);
    return b === "overdue" || b === "week";
  });

  const rows: WeekGanttRow[] = sortByUrgency(candidates).map((commitment) => {
    const endCol = commitment.dueDate! < start ? 0 : Math.min(6, Math.max(0, dayIndexFrom(commitment.dueDate!)));
    const startCol = Math.min(Math.max(0, dayIndexFrom(commitment.meeting.date)), endCol);
    const { bucket } = dueTileInfo(commitment.dueDate);
    return { commitment, startCol, endCol, bucket };
  });

  return { days, rows };
}

// ---- pdf export ----
// jsPDF's built-in fonts (helvetica/times/courier) only support the WinAnsi/CP1252 byte
// range. Most "smart" punctuation (em/en dash, curly quotes, ellipsis) is actually in that
// range and renders fine — but arrows, checkmarks, and emoji are not. Feeding one of those in
// doesn't just render as a wrong glyph: it corrupts jsPDF's width/kerning calculation for the
// whole string it's in (originally found via the "Commitments" section's "→" separator,
// v1.10.2). Applied to every string that reaches jsPDF, including free-form text this app
// doesn't control (transcripts, summaries, extracted concern/commitment text). Shared by
// MeetingPrint.tsx and WeeklyReport.tsx (v1.13) rather than defined once per screen.
export function sanitizeForPdf(text: string): string {
  return text
    .replace(/[→⇒➔➜▶]/g, "->")
    .replace(/[←⇐]/g, "<-")
    .replace(/[↔⇔]/g, "<->")
    .replace(/[✔✓☑]/g, "[x]")
    .replace(/[✗✘☒]/g, "[ ]")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ""); // emoji / dingbats — no WinAnsi mapping at all
}

// ---- weekly report ----
// Deterministic data assembly for a Monday-start week; the LLM only turns part of this into
// prose (see the "weeklyReport" task in app/api/llm/route.ts) — the facts themselves
// (which meetings, what topics, what's done, what's due, what's pending, what's concerning)
// are computed here, not by the model. As of v1.13, "pending" and "openConcerns" are rendered
// directly from this data with no LLM involvement at all — same "deterministic facts, never
// restated by the model" pattern Today's Brief's concerns already use (see master context §5).
export interface WeeklyReportData {
  start: string;
  end: string;
  meetings: Meeting[];
  topics: string[];
  decisions: string[];
  actionItems: string[];
  completed: Commitment[];
  upcoming: OpenCommitment[]; // my own commitments due the following week
  pending: OpenCommitment[]; // v1.13: every currently open commitment involving me, most urgent first — the running backlog, not just this week's
  openConcerns: BriefConcern[]; // v1.13: concerns raised within this specific week, recurring-first — same recurrence algorithm as todaysBriefData/recurringConcernIds
}
export function weeklyReportData(meetings: Meeting[], startISO: string): WeeklyReportData {
  const { start, end } = weekRange(startISO);
  const inWeek = meetings.filter((m) => m.date >= start && m.date <= end).slice().sort((a, b) => a.date.localeCompare(b.date));
  const topics = new Set<string>();
  const decisions: string[] = [];
  const actionItems: string[] = [];
  const completed: Commitment[] = [];
  inWeek.forEach((m) => {
    m.topics.forEach((t) => topics.add(t));
    decisions.push(...m.decisions);
    actionItems.push(...m.actionItems);
    m.commitments.forEach((c) => { if (c.status === "done") completed.push(c); });
  });
  const nextWeekEnd = addDaysISO(end, 7);
  const upcoming = myOpenCommitments(meetings).filter((c) => c.dueDate && c.dueDate > end && c.dueDate <= nextWeekEnd);

  // v1.13: overdue or due within the coming week — not the entire open backlog, which can
  // span months or years and would defeat the "few words" brief a status report needs.
  // Longer-horizon and undated commitments stay visible on Home/Stakeholder; this list is
  // near-term accountability, not the full ledger. Reuses bucketDue's existing 7-day "week"
  // window rather than inventing a third urgency bucket (see Design Decision #32).
  const pending = sortByUrgency(
    openCommitmentsInvolvingMe(meetings).filter((c) => {
      const b = bucketDue(c.dueDate);
      return b === "overdue" || b === "week";
    })
  );

  // v1.13: concerns raised specifically within this week, recurring-first — same walk-the-
  // full-history-ascending recurrence algorithm as todaysBriefData (v1.9.1's fix: check each
  // meeting's concerns against `seen` before adding that meeting's own concerns to it, so a
  // meeting never gets flagged against itself), just filtered to this week's date range
  // instead of a rolling window.
  const asc = meetings.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const seenConcernTexts: string[] = [];
  const openConcerns: BriefConcern[] = [];
  asc.forEach((m) => {
    const thisMeetingsTexts: string[] = [];
    m.concerns.forEach((c) => {
      const recurring = seenConcernTexts.some((s) => similar(s, c.text));
      if (m.date >= start && m.date <= end) openConcerns.push({ concern: c, meeting: m, recurring });
      thisMeetingsTexts.push(c.text);
    });
    seenConcernTexts.push(...thisMeetingsTexts);
  });
  openConcerns.sort((a, b) => {
    if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
    return (b.meeting.date || "").localeCompare(a.meeting.date || "");
  });

  return { start, end, meetings: inWeek, topics: [...topics], decisions, actionItems, completed, upcoming, pending, openConcerns };
}

// Which of one specific meeting's own concerns are recurring (i.e. similar() to a concern
// raised in a strictly earlier meeting) — same corrected algorithm as todaysBriefData/
// trajectory (v1.9.1: only ever compared against earlier meetings, never against concerns
// within the same meeting), just scoped to a single target meeting instead of a time window
// or a stakeholder. Used by the meeting PDF export's "at a glance" stats.
export function recurringConcernIds(meetings: Meeting[], meetingId: string): Set<string> {
  const asc = meetings.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const seen: string[] = [];
  const recurringIds = new Set<string>();
  for (const m of asc) {
    const thisTexts: string[] = [];
    m.concerns.forEach((c) => {
      const recurring = seen.some((s) => similar(s, c.text));
      if (m.id === meetingId && recurring) recurringIds.add(c.id); // only count the target meeting's own concerns
      thisTexts.push(c.text);
    });
    seen.push(...thisTexts);
    if (m.id === meetingId) break; // nothing after the target meeting can matter
  }
  return recurringIds;
}

// ---- today's brief ----
// Deterministic data assembly for Home's "Today's Brief" section; the LLM (the
// "todaysBrief" task in app/api/llm/route.ts) only turns this into ranked prose — same
// "code for facts, model for judgment" split as weeklyReportData/weeklyReport. Today the
// only source is meetings/transcripts; a future calendar feed (Atlas/Outlook/Teams) would
// plug in here as additional facts, not change the split.
export interface BriefConcern { concern: Concern; meeting: Meeting; recurring: boolean }
export interface TodaysBriefData {
  commitments: OpenCommitment[]; // open, involving me, most urgent first
  concerns: BriefConcern[]; // raised within the window, recurring first then most recent
  expectations: { e: Expectation; meeting: Meeting }[]; // open, from meetings within the window
  recentMeetings: Meeting[]; // within the window, for narrative context
}
export function todaysBriefData(meetings: Meeting[], windowDays = 30): TodaysBriefData {
  const commitments = sortByUrgency(openCommitmentsInvolvingMe(meetings));

  const cutoff = addDaysISO(todayISO(), -windowDays);
  const recentMeetings = meetings
    .filter((m) => m.date >= cutoff)
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Walk chronologically to detect recurrence (same heuristic as trajectory()), but only
  // surface concerns raised within the window.
  //
  // v1.9.1 fix: a meeting's own concerns are checked against `seen` BEFORE any of that same
  // meeting's concerns are added to it — never against each other. The previous version
  // pushed each concern into `seen` immediately after checking it, so the 2nd, 3rd, ... nth
  // concern in one meeting was being compared against the 1st, 2nd, ... concern from that
  // *same* meeting and could get flagged "raised again" on its very first-ever mention,
  // purely because two unrelated concerns from one meeting happened to share a couple of
  // words (e.g. both mentioning "Pune").
  const asc = meetings.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const seen: string[] = [];
  const concerns: BriefConcern[] = [];
  asc.forEach((m) => {
    const thisMeetingsTexts: string[] = [];
    m.concerns.forEach((c) => {
      const recurring = seen.some((s) => similar(s, c.text));
      if (m.date >= cutoff) concerns.push({ concern: c, meeting: m, recurring });
      thisMeetingsTexts.push(c.text);
    });
    seen.push(...thisMeetingsTexts);
  });
  // Recurring concerns first (the more persistent signal), then most recent within each group.
  concerns.sort((a, b) => {
    if (a.recurring !== b.recurring) return a.recurring ? -1 : 1;
    return (b.meeting.date || "").localeCompare(a.meeting.date || "");
  });

  const expectations: { e: Expectation; meeting: Meeting }[] = [];
  recentMeetings.forEach((m) => {
    m.expectations.forEach((e) => { if (e.status !== "met") expectations.push({ e, meeting: m }); });
  });

  return { commitments, concerns, expectations, recentMeetings: recentMeetings.slice(0, 8) };
}

function mentions(m: Meeting, sid: string): boolean {
  return (
    m.mentioned.includes(sid) ||
    m.expectations.some((e) => e.stakeholderId === sid) ||
    m.concerns.some((e) => e.stakeholderId === sid) ||
    m.commitments.some((e) => e.ownerId === sid || e.owedToId === sid)
  );
}
// A meeting only counts as a genuine interaction with sid if something is specifically
// attributed to them there (an expectation, concern, or commitment) — not merely that their
// name appears in the meeting's `mentioned` list, which also catches third parties who came
// up in conversation but were never actually part of it (e.g. "Sridhar mentioned that Mohit
// leads Credit Risk IT" — Mohit is mentioned, but Rohit never interacted with him directly).
function directHit(m: Meeting, sid: string): boolean {
  return (
    m.expectations.some((e) => e.stakeholderId === sid) ||
    m.concerns.some((c) => c.stakeholderId === sid) ||
    m.commitments.some((c) => c.ownerId === sid || c.owedToId === sid)
  );
}

export interface WithMeeting<T> { item: T; meeting: Meeting }
export interface Intel {
  cares: string[];
  exps: { e: Expectation; meeting: Meeting }[];
  cons: { c: Concern; meeting: Meeting }[];
  youOwe: OpenCommitment[];
  owesYou: OpenCommitment[];
  interactions: Meeting[]; // genuine interactions only (see directHit) — drives "last interaction" / star rating
  mentionedIn: Meeting[]; // superset: every meeting that references sid at all, direct or not
}
export function intel(meetings: Meeting[], sid: string): Intel {
  const cares = new Set<string>();
  const exps: { e: Expectation; meeting: Meeting }[] = [];
  const cons: { c: Concern; meeting: Meeting }[] = [];
  const youOwe: OpenCommitment[] = [];
  const owesYou: OpenCommitment[] = [];
  const interactions: Meeting[] = [];
  const mentionedIn: Meeting[] = [];
  meetings.forEach((m) => {
    if (mentions(m, sid)) {
      m.topics.forEach((t) => cares.add(t));
      mentionedIn.push(m);
      if (directHit(m, sid)) interactions.push(m);
    }
    m.expectations.forEach((e) => { if (e.stakeholderId === sid && e.status !== "met") exps.push({ e, meeting: m }); });
    m.concerns.forEach((c) => { if (c.stakeholderId === sid) cons.push({ c, meeting: m }); });
    m.commitments.forEach((c) => {
      if (c.status === "done") return;
      if (c.ownerId === SELF && c.owedToId === sid) youOwe.push({ ...c, meeting: m });
      if (c.ownerId === sid && c.owedToId === SELF) owesYou.push({ ...c, meeting: m });
    });
  });
  interactions.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  mentionedIn.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return { cares: [...cares], exps, cons, youOwe, owesYou, interactions, mentionedIn };
}

export interface TrajectoryStep {
  meeting: Meeting;
  first: boolean;
  expectations: Expectation[];
  freshConcerns: Concern[];
  recurringConcerns: Concern[];
  youCommitted: Commitment[];
  theyCommitted: Commitment[];
  newTopics: string[];
}
// ordered evolution of a relationship with per-interaction deltas (newest first)
export function trajectory(meetings: Meeting[], sid: string): TrajectoryStep[] {
  const asc = meetings.filter((m) => mentions(m, sid)).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const seenConcerns: string[] = [];
  const seenTopics = new Set<string>();
  const steps: TrajectoryStep[] = asc.map((m, i) => {
    const expectations = m.expectations.filter((e) => e.stakeholderId === sid);
    const con = m.concerns.filter((e) => e.stakeholderId === sid);
    const youCommitted = m.commitments.filter((c) => c.ownerId === SELF && c.owedToId === sid);
    const theyCommitted = m.commitments.filter((c) => c.ownerId === sid);
    // v1.9.1 fix: checked against concerns seen in EARLIER meetings only — concerns raised
    // together in this same meeting no longer get compared against each other (see the
    // matching fix + longer explanation in todaysBriefData above).
    const freshConcerns: Concern[] = [];
    const recurringConcerns: Concern[] = [];
    const thisStepsTexts: string[] = [];
    con.forEach((cn) => {
      const prior = seenConcerns.some((s) => similar(s, cn.text));
      (prior ? recurringConcerns : freshConcerns).push(cn);
      thisStepsTexts.push(cn.text);
    });
    seenConcerns.push(...thisStepsTexts);
    const newTopics = m.topics.filter((t) => !seenTopics.has(t));
    m.topics.forEach((t) => seenTopics.add(t));
    return { meeting: m, first: i === 0, expectations, freshConcerns, recurringConcerns, youCommitted, theyCommitted, newTopics };
  });
  return steps.reverse();
}

// ---- relationship intelligence (v1.7) ----
// Deterministic "Relationship Health" heuristic — a transparent point system built from real
// signals already computed elsewhere (intel/trajectory) plus a small dedicated scan for
// follow-through, never an opaque LLM-judged score. Consistent with the "pattern detection
// over existing extracted data, never false-precision scores" guidance in the engineering
// reference §7 risk-intelligence note: this surfaces the same kind of signal (recurrence,
// staleness, unmet commitments — and, as of the momentum pass, resolved ones too) as a
// small, explainable number rather than a fabricated risk model.
//
// Every category is capped at +/-2 stars (a flat +1 for recent engagement is the one
// exception) so no single signal can dominate the score on its own:
//   - overdue commitments (either direction)         -1 each, max -2
//   - recurring concerns                              -1 each, max -2
//   - staleness since last interaction                -1 past 45 days, -2 past 90
//   - completed commitments (either direction)        +1 each, max +2  [momentum]
//   - met expectations                                +1 each, max +2  [momentum]
//   - interacted within the last 14 days               flat +1         [momentum]
//
// `stars` is null — not a number, not even a low one — when there has been zero direct
// interaction (it.interactions is empty): someone who only ever came up in *someone else's*
// meeting has no relationship to score yet, and every input to this formula is derived from
// attributed items, which by construction can't exist without a direct interaction either.
// Showing a confident-looking 5-star default there was the actual bug being fixed.
export interface RelationshipHealth {
  stars: number | null; // 1-5, or null = not enough signal (no direct interaction yet)
  overdueCount: number;
  recurringConcernCount: number;
  daysSinceLastInteraction: number | null;
  completedCount: number; // commitments between you and them that closed out
  metExpectationCount: number; // expectations of them that were actually met
  recentlyEngaged: boolean; // interacted within the last 14 days
}
export function relationshipHealth(meetings: Meeting[], sid: string): RelationshipHealth {
  const it = intel(meetings, sid);
  if (it.interactions.length === 0) {
    return {
      stars: null, overdueCount: 0, recurringConcernCount: 0, daysSinceLastInteraction: null,
      completedCount: 0, metExpectationCount: 0, recentlyEngaged: false,
    };
  }
  const steps = trajectory(meetings, sid);
  const overdueCount = [...it.youOwe, ...it.owesYou].filter((c) => isOverdue(c.dueDate)).length;
  const recurringConcernCount = steps.reduce((sum, st) => sum + st.recurringConcerns.length, 0);
  const lastDate = it.interactions[0]?.date ?? null;
  const daysSinceLastInteraction = lastDate
    ? Math.round((Date.now() - new Date(lastDate + "T00:00:00").getTime()) / 86400000)
    : null;
  const recentlyEngaged = daysSinceLastInteraction !== null && daysSinceLastInteraction <= 14;

  // Positive momentum: intel() only surfaces what's still OPEN, so closed-out commitments
  // and met expectations need their own pass over the raw meetings.
  let completedCount = 0;
  let metExpectationCount = 0;
  meetings.forEach((m) => {
    m.commitments.forEach((c) => {
      const withMe = (c.ownerId === SELF && c.owedToId === sid) || (c.ownerId === sid && c.owedToId === SELF);
      if (withMe && c.status === "done") completedCount++;
    });
    m.expectations.forEach((e) => {
      if (e.stakeholderId === sid && e.status === "met") metExpectationCount++;
    });
  });

  let stars = 5;
  stars -= Math.min(2, overdueCount);
  stars -= Math.min(2, recurringConcernCount);
  if (daysSinceLastInteraction !== null) {
    if (daysSinceLastInteraction > 90) stars -= 2;
    else if (daysSinceLastInteraction > 45) stars -= 1;
  }
  stars += Math.min(2, completedCount);
  stars += Math.min(2, metExpectationCount);
  if (recentlyEngaged) stars += 1;
  stars = Math.max(1, Math.min(5, stars));

  return { stars, overdueCount, recurringConcernCount, daysSinceLastInteraction, completedCount, metExpectationCount, recentlyEngaged };
}

// The single most pressing thing the user is waiting on this person for: the soonest-due
// (overdue sorts first) open commitment they owe, falling back to their most recently
// raised open expectation. Null if nothing's outstanding.
export interface WaitingOn { text: string; meeting: Meeting; kind: "commitment" | "expectation" }
export function waitingOn(meetings: Meeting[], sid: string): WaitingOn | null {
  const it = intel(meetings, sid);
  if (it.owesYou.length) {
    const c = it.owesYou.slice().sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];
    return { text: c.text, meeting: c.meeting, kind: "commitment" };
  }
  if (it.exps.length) {
    const { e, meeting } = it.exps.slice().sort((a, b) => (b.meeting.date || "").localeCompare(a.meeting.date || ""))[0];
    return { text: e.text, meeting, kind: "expectation" };
  }
  return null;
}

// ---- ask assistant (v1.9) ----
// Deterministic digest of EVERY meeting's structured extraction (unlike weeklyReportData/
// todaysBriefData, this isn't time-windowed — a "last meeting with X" question needs the
// full history) — the LLM only answers from this, never invents facts. Each meeting is
// tagged with its real id so the model can cite sources the UI can re-resolve and link back
// to (see AssistantSource in lib/types). Same "in-memory everything" scale limit as the rest
// of the app (engineering reference §11) — fine at current volume; would need pagination or
// summarization before this gets unwieldy at very large meeting counts.
export function assistantDigest(meetings: Meeting[], stakeholders: Stakeholder[]): string {
  const sorted = meetings.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const lines: string[] = [];
  sorted.forEach((m) => {
    lines.push(`[${m.id}] ${fmtFull(m.date)} — ${m.title}`);
    if (m.summary) lines.push(`Summary: ${m.summary}`);
    if (m.topics.length) lines.push(`Topics: ${m.topics.join(", ")}`);
    m.expectations.forEach((e) => lines.push(`Expectation (${partyName(stakeholders, e.stakeholderId)}, ${e.status}): ${e.text}`));
    m.commitments.forEach((c) => lines.push(`Commitment (${commitmentLabel(c, stakeholders)}, ${c.status}${c.dueDate ? `, due ${fmtFull(c.dueDate)}` : ""}): ${c.text}`));
    m.concerns.forEach((c) => lines.push(`Concern (${partyName(stakeholders, c.stakeholderId)}): ${c.text}`));
    if (m.decisions.length) lines.push(`Decisions: ${m.decisions.join("; ")}`);
    if (m.actionItems.length) lines.push(`Action items: ${m.actionItems.join("; ")}`);
    lines.push("");
  });
  return lines.join("\n");
}
