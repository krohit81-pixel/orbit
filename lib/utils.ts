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
export const SELF = "me";

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
export const fmtStamp = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
export const fmtToday = (): string =>
  new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
export const isOverdue = (s?: string | null): boolean => bucketDue(s) === "overdue";

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
// The other party from the user's perspective (for grouping); null if third-party.
export function otherParty(c: Commitment): string | null {
  if (c.ownerId === SELF) return c.owedToId && c.owedToId !== SELF ? c.owedToId : null;
  if (c.owedToId === SELF) return c.ownerId && c.ownerId !== SELF ? c.ownerId : null;
  return c.ownerId ?? c.owedToId ?? null;
}
export const involvesMe = (c: Commitment) => c.ownerId === SELF || c.owedToId === SELF;

export interface OpenCommitment extends Commitment { meeting: Meeting }
function collectCommitments(meetings: Meeting[], predicate: (c: Commitment) => boolean): OpenCommitment[] {
  const out: OpenCommitment[] = [];
  meetings.forEach((m) => m.commitments.forEach((c) => { if (c.status !== "done" && predicate(c)) out.push({ ...c, meeting: m }); }));
  return out;
}
export const myOpenCommitments = (meetings: Meeting[]) => collectCommitments(meetings, (c) => c.ownerId === SELF);
export const owedToMe = (meetings: Meeting[]) => collectCommitments(meetings, (c) => c.owedToId === SELF && c.ownerId !== SELF);
export const openCommitmentsInvolvingMe = (meetings: Meeting[]) => collectCommitments(meetings, involvesMe);

function mentions(m: Meeting, sid: string): boolean {
  return (
    m.mentioned.includes(sid) ||
    m.expectations.some((e) => e.stakeholderId === sid) ||
    m.concerns.some((e) => e.stakeholderId === sid) ||
    m.commitments.some((e) => e.ownerId === sid || e.owedToId === sid)
  );
}

export interface WithMeeting<T> { item: T; meeting: Meeting }
export interface Intel {
  cares: string[];
  exps: { e: Expectation; meeting: Meeting }[];
  cons: { c: Concern; meeting: Meeting }[];
  youOwe: OpenCommitment[];
  owesYou: OpenCommitment[];
  interactions: Meeting[];
}
export function intel(meetings: Meeting[], sid: string): Intel {
  const cares = new Set<string>();
  const exps: { e: Expectation; meeting: Meeting }[] = [];
  const cons: { c: Concern; meeting: Meeting }[] = [];
  const youOwe: OpenCommitment[] = [];
  const owesYou: OpenCommitment[] = [];
  const interactions: Meeting[] = [];
  meetings.forEach((m) => {
    if (mentions(m, sid)) {
      m.topics.forEach((t) => cares.add(t));
      interactions.push(m);
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
  return { cares: [...cares], exps, cons, youOwe, owesYou, interactions };
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
    const freshConcerns: Concern[] = [];
    const recurringConcerns: Concern[] = [];
    con.forEach((cn) => {
      const prior = seenConcerns.find((s) => similar(s, cn.text));
      (prior ? recurringConcerns : freshConcerns).push(cn);
      seenConcerns.push(cn.text);
    });
    const newTopics = m.topics.filter((t) => !seenTopics.has(t));
    m.topics.forEach((t) => seenTopics.add(t));
    return { meeting: m, first: i === 0, expectations, freshConcerns, recurringConcerns, youCommitted, theyCommitted, newTopics };
  });
  return steps.reverse();
}
