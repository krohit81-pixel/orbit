"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { supabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils";
import type { Meeting, ReviewModel, Stakeholder } from "@/lib/types";

interface OrbitContextValue {
  ready: boolean;
  configured: boolean;
  error: string | null;
  self: { name: string };
  stakeholders: Stakeholder[];
  meetings: Meeting[];
  refresh: () => Promise<void>;
  addStakeholder: (s: Omit<Stakeholder, "id" | "summary">) => Promise<string>;
  commitMeeting: (review: ReviewModel) => Promise<void>;
  toggleCommitment: (meetingId: string, commId: string) => Promise<void>;
  setSummary: (sid: string, summary: string) => Promise<void>;
}

const Ctx = createContext<OrbitContextValue | null>(null);

export function OrbitProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const refresh = useCallback(async () => {
    const { stakeholders, meetings } = await db.fetchAll();
    setStakeholders(stakeholders);
    setMeetings(meetings);
  }, []);

  useEffect(() => {
    (async () => {
      if (!supabaseConfigured) { setReady(true); return; }
      try {
        await db.seedIfEmpty();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reach Supabase.");
      } finally {
        setReady(true);
      }
    })();
  }, [refresh]);

  const addStakeholder = useCallback(async (s: Omit<Stakeholder, "id" | "summary">) => {
    const rec: Stakeholder = { ...s, id: uid(), summary: "Added manually. Intelligence will build as you log meetings with them." };
    setStakeholders((prev) => [...prev, rec]);
    await db.insertStakeholder(rec);
    return rec.id;
  }, []);

  const commitMeeting = useCallback(async (review: ReviewModel) => {
    const map: Record<string, string> = {};
    stakeholders.forEach((s) => { map[s.name.toLowerCase().trim()] = s.id; });
    const newStakeholders: Stakeholder[] = [];
    review.people.filter((p) => p.include && !map[p.name.toLowerCase().trim()]).forEach((p) => {
      const id = uid();
      newStakeholders.push({ id, name: p.name, title: p.role || "—", relationship: "Other", reportsTo: null, summary: "Intelligence is still building — based on one interaction." });
      map[p.name.toLowerCase().trim()] = id;
    });
    const resolve = (n?: string | null) => (n ? map[n.toLowerCase().trim()] || null : null);

    const meeting: Meeting = {
      id: uid(),
      title: review.title,
      date: new Date().toISOString().slice(0, 10),
      summary: review.summary,
      topics: review.topics,
      mentioned: review.people.filter((p) => p.include).map((p) => resolve(p.name)).filter((x): x is string => !!x),
      expectations: review.expectations.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, stakeholderId: resolve(e.stakeholder), source: e.source, status: "open" as const })),
      commitments: review.commitments.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, owedByMe: e.owner === "me", stakeholderId: resolve(e.stakeholder || (e.owner !== "me" ? e.owner : null)), due: e.due, dueDate: e.dueDate ?? null, source: e.source, status: "open" as const })),
      concerns: review.concerns.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, stakeholderId: resolve(e.stakeholder), source: e.source })),
      decisions: review.decisions,
      actionItems: review.actionItems,
    };

    setStakeholders((prev) => [...prev, ...newStakeholders]);
    setMeetings((prev) => [meeting, ...prev]);
    await db.insertStakeholders(newStakeholders);
    await db.insertMeeting(meeting);
  }, [stakeholders]);

  const toggleCommitment = useCallback(async (meetingId: string, commId: string) => {
    let nextCommitments: Meeting["commitments"] | null = null;
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      const commitments = m.commitments.map((cm) => cm.id === commId ? { ...cm, status: (cm.status === "done" ? "open" : "done") as "open" | "done" } : cm);
      nextCommitments = commitments;
      return { ...m, commitments };
    }));
    if (nextCommitments) await db.updateMeeting(meetingId, { commitments: nextCommitments });
  }, []);

  const setSummary = useCallback(async (sid: string, summary: string) => {
    setStakeholders((prev) => prev.map((s) => (s.id === sid ? { ...s, summary } : s)));
    await db.updateStakeholder(sid, { summary });
  }, []);

  const value: OrbitContextValue = {
    ready, configured: supabaseConfigured, error, self: { name: "Rohit" },
    stakeholders, meetings, refresh, addStakeholder, commitMeeting, toggleCommitment, setSummary,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrbit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}
