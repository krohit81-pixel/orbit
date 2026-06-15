import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Commitment, Concern, Expectation, Meeting, Relationship, Stakeholder } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RELATIONSHIPS: Relationship[] = [
  "Sponsor", "Functional lead", "My manager", "Peer", "Reports to me", "Vendor", "Future hire", "Other",
];

let _id = 1000;
export const uid = () => `id${_id++}_${Math.random().toString(36).slice(2, 7)}`;

// ---- dates ----
export const isoIn = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const fmtDate = (s?: string | null): string | null =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;
export const fmtFull = (s?: string | null): string =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

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

// ---- text / search ----
export const norm = (s?: string): string => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function matchesQuery(query: string, text?: string): boolean {
  const toks = norm(query).split(" ").filter(Boolean);
  if (toks.length === 0) return false;
  const hay = norm(text);
  return toks.every((t) => hay.includes(t));
}
function similar(a: string, b: string): boolean {
  const ta = new Set(norm(a).split(" ").filter((w) => w.length > 3));
  const tb = norm(b).split(" ").filter((w) => w.length > 3);
  const shared = tb.filter((w) => ta.has(w)).length;
  return shared >= 2 || (shared >= 1 && tb.length <= 3);
}

// ---- selectors ----
export const stakeholderById = (stakeholders: Stakeholder[], id: string | null) =>
  stakeholders.find((s) => s.id === id);

export interface OpenCommitment extends Commitment { meeting: Meeting }
export function myOpenCommitments(meetings: Meeting[]): OpenCommitment[] {
  const out: OpenCommitment[] = [];
  meetings.forEach((m) =>
    m.commitments.forEach((cm) => {
      if (cm.owedByMe && cm.status !== "done") out.push({ ...cm, meeting: m });
    })
  );
  return out;
}

function mentions(m: Meeting, sid: string): boolean {
  return (
    m.mentioned.includes(sid) ||
    m.expectations.some((e) => e.stakeholderId === sid) ||
    m.concerns.some((e) => e.stakeholderId === sid) ||
    m.commitments.some((e) => e.stakeholderId === sid)
  );
}

export interface Intel {
  cares: string[];
  exps: Expectation[];
  cons: Concern[];
  comms: (Commitment & { meeting: Meeting })[];
  interactions: Meeting[];
}
export function intel(meetings: Meeting[], sid: string): Intel {
  const cares = new Set<string>();
  const exps: Expectation[] = [];
  const cons: Concern[] = [];
  const comms: (Commitment & { meeting: Meeting })[] = [];
  const interactions: Meeting[] = [];
  meetings.forEach((m) => {
    if (mentions(m, sid)) {
      m.topics.forEach((t) => cares.add(t));
      interactions.push(m);
    }
    m.expectations.forEach((e) => { if (e.stakeholderId === sid && e.status !== "met") exps.push(e); });
    m.concerns.forEach((e) => { if (e.stakeholderId === sid) cons.push(e); });
    m.commitments.forEach((e) => { if (e.stakeholderId === sid && e.owedByMe && e.status !== "done") comms.push({ ...e, meeting: m }); });
  });
  interactions.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return { cares: [...cares], exps, cons, comms, interactions };
}

export interface TrajectoryStep {
  meeting: Meeting;
  first: boolean;
  expectations: Expectation[];
  freshConcerns: Concern[];
  recurringConcerns: Concern[];
  commitments: Commitment[];
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
    const commitments = m.commitments.filter((e) => e.stakeholderId === sid && e.owedByMe);
    const freshConcerns: Concern[] = [];
    const recurringConcerns: Concern[] = [];
    con.forEach((cn) => {
      const prior = seenConcerns.find((s) => similar(s, cn.text));
      (prior ? recurringConcerns : freshConcerns).push(cn);
      seenConcerns.push(cn.text);
    });
    const newTopics = m.topics.filter((t) => !seenTopics.has(t));
    m.topics.forEach((t) => seenTopics.add(t));
    return { meeting: m, first: i === 0, expectations, freshConcerns, recurringConcerns, commitments, newTopics };
  });
  return steps.reverse();
}
