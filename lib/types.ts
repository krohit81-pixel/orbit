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

export interface Concern {
  id: string;
  text: string;
  stakeholderId: string | null;
  source?: string;
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
export interface WeeklyReport {
  overview: string;
  focusAreas: string[];
  accomplishments: string[];
  upcoming: string[];
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
