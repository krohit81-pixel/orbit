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
export interface TodaysBrief {
  priorities: string[];
  risks: string[];
}

export interface ReviewItem { _id: string; include: boolean; [k: string]: unknown }
export interface ReviewPerson extends ReviewItem { name: string; role?: string | null; existing: boolean }
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
  transcript?: string; // the raw pasted text this review was extracted from
}
