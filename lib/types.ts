export type Relationship =
  | "Sponsor"
  | "Functional lead"
  | "My manager"
  | "Peer"
  | "Reports to me"
  | "Vendor"
  | "Future hire"
  | "Other";

export interface Stakeholder {
  id: string;
  name: string;
  title: string;
  relationship: Relationship;
  reportsTo: string | null;
  summary?: string;
  summaryGeneratedAt?: string | null; // ISO timestamp of last synthesis
}

export interface Expectation {
  id: string;
  text: string;
  stakeholderId: string | null;
  source?: string;
  status: "open" | "met";
}

// A progress note logged against a commitment after the fact — "what's been done so far",
// optionally paired with a due-date revision. Additive, append-only audit trail; never
// rewrites or removes a prior entry (v1.8). See lib/utils.commitmentUpdates.
export interface CommitmentUpdate {
  id: string;
  date: string; // ISO yyyy-mm-dd — the date this update is about (defaults to today, editable)
  note: string; // free text: steps taken, blockers, progress
  dueDateBefore?: string | null; // set only when this update also revised the due date
  dueDateAfter?: string | null;
  createdAt: string; // ISO timestamp, for stable ordering when same-day updates are logged
}

// A commitment flows from an owner to a recipient ("me" is the sentinel for the user).
export interface Commitment {
  id: string;
  text: string;
  ownerId: string | null;   // "me" | stakeholderId | null (who owes)
  owedToId: string | null;  // "me" | stakeholderId | null (who it's owed to)
  due?: string | null;
  dueDate?: string | null;
  source?: string;
  status: "open" | "done";
  updates?: CommitmentUpdate[]; // progress/audit log — additive, optional (v1.8)
}

// v1.17: status/resolution are additive to the existing JSONB shape (no migration) — same
// "old records simply lack the field" backward-compat pattern as Commitment.status before it
// (see normConcern(), lib/db.ts). A resolved concern is never deleted: it's buried on the
// meeting record (still visible, still searchable) but drops out of every "what's currently
// live" surface — Today's Brief, the weekly report's open concerns, and relationship-health
// scoring — the same "open" vs "done" split Commitment already has, just for concerns.
export interface Concern {
  id: string;
  text: string;
  stakeholderId: string | null;
  source?: string;
  status: "open" | "resolved";
  resolution?: "mitigated" | "no_longer_relevant"; // only set once resolved; cleared on reopen
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  summary: string;
  topics: string[];
  mentioned: string[];
  expectations: Expectation[];
  commitments: Commitment[];
  concerns: Concern[];
  decisions: string[];
  actionItems: string[];
  transcript?: string; // raw pasted text this meeting was extracted from (v1.4+; older meetings may not have one)
}

// --- extraction / review shapes ---
export interface ExtractedPerson { name: string; role?: string | null }
// A suggestion that this NEW meeting closes, revises the due date on, or otherwise
// progresses an EXISTING open commitment from a past meeting (v1.12). "commitmentRef" is
// one of the [id]s from the openCommitmentsDigest sent in the prompt — the UI re-resolves
// it against real data and drops anything that doesn't match, same defensive pattern as
// AssistantSource. See lib/utils.openCommitmentsDigest and the "extract" LLM task.
export interface ExtractedCommitmentSuggestion {
  commitmentRef: string;
  action: "close" | "revise_date" | "progress_note";
  newDueDate?: string | null; // only meaningful for "revise_date"
  reason: string; // short, grounded in this transcript — shown to the user before they accept it
}
export interface Extraction {
  title: string;
  summary: string;
  topics: string[];
  stakeholders: ExtractedPerson[];
  expectations: { text: string; stakeholder?: string | null; source?: string }[];
  commitments: { text: string; owner: string; owedTo?: string | null; due?: string | null; dueDate?: string | null; source?: string }[];
  concerns: { text: string; stakeholder?: string | null; source?: string }[];
  decisions: string[];
  actionItems: string[];
  commitmentSuggestions?: ExtractedCommitmentSuggestion[];
}

// Generated on demand (not persisted) — consistent with Orbit's "derived, not stored"
// intelligence model. See lib/utils.weeklyReportData + the "weeklyReport" LLM task.
// v1.13: restructured to a terse 3-section status format (achieved / pending & concerns /
// focus for future), replacing the earlier overview+focusAreas+accomplishments+upcoming
// shape. Only the two narrative sections come from the model — "pending" and "openConcerns"
// are rendered straight from WeeklyReportData (lib/utils.ts) with no LLM step at all, so
// there's nothing there for the model to restate or get wrong (see master context §5).
export interface WeeklyReport {
  achieved: string[];
  focusForFuture: string[];
}

// Generated on demand (not persisted) — Home's "Today's Brief" section. Same derived-not-
// stored model as WeeklyReport, cached client-side per calendar day (see Home.tsx) rather
// than in Supabase. See lib/utils.todaysBriefData + the "todaysBrief" LLM task. Today the
// only inputs are meetings/transcripts; a future calendar integration (Atlas/Outlook/Teams)
// is meant to feed the same digest, not change this shape.
// v1.8.1: "risks" dropped — Potential risks & concerns is now rendered directly from
// todaysBriefData().concerns (real, clickable, sourced items), not LLM prose, so the user
// can click through to the meeting a concern was raised in and judge for themselves whether
// it's resolved. Only "priorities" still needs the model's judgment.
export interface TodaysBrief {
  priorities: string[];
}

// Generated on demand (not persisted) — Search's "Ask Orbit" natural-language Q&A (v1.9).
// The LLM only cites which meetings it drew from (meetingId/title/date); the UI re-resolves
// each source against the real `meetings` array rather than trusting the model's title/date
// text, and silently drops anything that doesn't resolve — so a source link is either real
// or absent, never a plausible-looking hallucination. See lib/utils.assistantDigest + the
// "ask" LLM task.
export interface AssistantSource { meetingId: string; title: string; date: string }
export interface AssistantAnswer { answer: string; sources: AssistantSource[] }

export interface ReviewItem { _id: string; include: boolean; [k: string]: unknown }
export interface ReviewPerson extends ReviewItem { name: string; role?: string | null; existing: boolean }
// A resolved, ready-to-apply commitment suggestion (v1.12) — built in Orbit.tsx's
// buildReview() by matching the LLM's commitmentRef against real open commitments.
// commitmentText/commitmentLabel are pulled fresh from OUR data, never from the model's own
// restated text, so what's shown before commit is always factually accurate even though the
// judgment (which commitment, which action) came from the LLM.
export interface ReviewCommitmentSuggestion extends ReviewItem {
  meetingId: string; // the EXISTING meeting the target commitment lives in
  commitmentId: string;
  commitmentText: string;
  commitmentLabel: string; // e.g. "You owe Ko Saito"
  action: "close" | "revise_date" | "progress_note";
  newDueDate: string | null;
  reason: string;
}
export interface ReviewModel {
  title: string;
  date: string; // ISO yyyy-mm-dd, editable before commit
  summary: string;
  topics: string[];
  people: ReviewPerson[];
  expectations: (ReviewItem & { text: string; stakeholder?: string | null; source?: string })[];
  commitments: (ReviewItem & { text: string; owner: string; owedTo: string | null; due?: string | null; dueDate?: string | null; source?: string })[];
  concerns: (ReviewItem & { text: string; stakeholder?: string | null; source?: string })[];
  decisions: string[];
  actionItems: string[];
  commitmentSuggestions: ReviewCommitmentSuggestion[];
  transcript?: string; // the raw pasted text this review was extracted from
}

// --- upcoming (scheduled) meetings, imported from a calendar photo (v1.15) ---
// A deliberately separate, lighter entity from Meeting: no transcript, no extracted
// intelligence (topics/expectations/commitments/concerns) — just what's on the calendar,
// plus a place for the owner's own prep notes. Once its date elapses, the overnight
// process-elapsed-meetings cron (v1.16) turns it into a PendingMeetingReview below rather
// than a Meeting directly — nothing AI-derived skips human review just because a cron job,
// not a button, triggered it. Attendees are stored as raw names, not yet resolved to
// Stakeholder ids — linking them is a natural next step once this proves out, deliberately
// not built in v1.
export interface UpcomingMeeting {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  startTime: string | null; // "HH:MM", 24h
  endTime: string | null;
  attendees: string[]; // "First Last" order, as read off the calendar
  location: string | null;
  notes: string | null; // free text, owner-editable any time — same shape as Meeting.transcript
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// What the vision-based "extractSchedule" LLM task returns for ONE entry it read off the
// calendar photo. Purely descriptive — this task never sees existing UpcomingMeeting data,
// so it has no way to judge "is this the same as something I already have"; that matching
// happens afterward, deterministically, in lib/utils.matchSchedule() (same "code for facts,
// model for judgment" split as everywhere else in the app — here the "judgment" is just
// reading the image, there's no facts/judgment split within the task itself).
export interface ExtractedScheduleItem {
  title: string;
  date: string; // ISO yyyy-mm-dd, resolved from the calendar's own day-of-week/date headers
  startTime: string | null;
  endTime: string | null;
  attendees: string[];
  location: string | null;
}

// The outcome of matching one extracted item against real, already-stored UpcomingMeetings
// (matchSchedule(), lib/utils.ts). "new" and "updated" are auto-classified with reasonable
// confidence; "uncertain" is anything the deterministic matcher isn't confident enough to
// decide on its own (see matchSchedule's own comment for exactly which cases land here) —
// the review screen always surfaces these as an explicit choice, never a silent guess.
// "unchanged" matches are filtered out before the review list is built (see
// ScheduleMatchResult) rather than shown as a fourth reviewable kind — there's nothing to
// review about an entry that's already correct.
export type ScheduleMatchKind = "new" | "updated" | "uncertain";
export interface ScheduleReviewItem extends ReviewItem {
  kind: ScheduleMatchKind;
  extracted: ExtractedScheduleItem;
  // The real, current record this maps to (set for "updated" and "uncertain", null for
  // "new") — shown so a proposed time/date change is always a real before/after pulled from
  // OUR data, never the model's own restated version of what changed.
  existing: UpcomingMeeting | null;
  // Only meaningful for "uncertain": how the owner wants to resolve it once they've looked at
  // the before/after. Defaults to "update" (a same-title, different-date near-match is most
  // often a genuine reschedule) but the owner can flip it to "new" (a fresh occurrence — the
  // common case for a recurring meeting) before committing.
  resolution?: "update" | "new";
}
export interface ScheduleMatchResult {
  items: ScheduleReviewItem[]; // new + updated + uncertain, ready for the review screen
  unchangedCount: number; // already recorded, identical — silently skipped, just reported
}

// --- overnight meeting close-out (v1.16) ---
// A nightly cron (app/api/cron/process-elapsed-meetings) turns each UpcomingMeeting whose
// date has passed into one of these, extracting whatever intelligence the owner's own prep
// notes actually contain (deliberately blank/empty arrays when the notes don't say much —
// never invented to fill out the shape). Deliberately staged here rather than written
// straight to `orbit.meetings`: the "review before commit" invariant applies just as much to
// something a cron produced overnight as to something a button produced live — a human still
// has to look at it before it becomes a real Meeting. The stored `extraction` is the same
// raw shape the "extract" LLM task returns, so the existing buildReview()/commitMeeting()
// pipeline (Orbit.tsx) handles it unchanged — this is a second producer of that shape, not a
// second review/commit pathway.
export interface PendingMeetingReview {
  id: string;
  sourceUpcomingMeetingId: string | null; // the UpcomingMeeting row this was generated from (already deleted by the time this exists)
  title: string;
  date: string; // ISO yyyy-mm-dd — the meeting's own date, not the night the cron ran
  startTime: string | null;
  endTime: string | null;
  attendees: string[];
  location: string | null;
  notes: string | null; // the owner's own prep notes this was generated from — becomes Meeting.transcript on commit, same provenance role a pasted transcript plays for a live capture
  extraction: Extraction;
  createdAt: string; // ISO timestamp — when the cron generated this
}
