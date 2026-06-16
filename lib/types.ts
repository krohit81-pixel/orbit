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

export interface Commitment {
  id: string;
  text: string;
  owedByMe: boolean;
  stakeholderId: string | null;
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
}

// --- extraction / review shapes ---
export interface ExtractedPerson { name: string; role?: string | null }
export interface Extraction {
  title: string;
  summary: string;
  topics: string[];
  stakeholders: ExtractedPerson[];
  expectations: { text: string; stakeholder?: string | null; source?: string }[];
  commitments: { text: string; owner: string; stakeholder?: string | null; due?: string | null; dueDate?: string | null; source?: string }[];
  concerns: { text: string; stakeholder?: string | null; source?: string }[];
  decisions: string[];
  actionItems: string[];
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
  commitments: (ReviewItem & { text: string; owner: string; stakeholder?: string | null; due?: string | null; dueDate?: string | null; source?: string })[];
  concerns: (ReviewItem & { text: string; stakeholder?: string | null; source?: string })[];
  decisions: string[];
  actionItems: string[];
}
