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
  saveStakeholder: (s: Stakeholder) => Promise<void>;
  deleteStakeholder: (id: string) => Promise<void>;
  commitMeeting: (review: ReviewModel) => Promise<void>;
  saveMeeting: (m: Meeting) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
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
    const resolveParty = (n?: string | null) => (n === "me" ? "me" : resolve(n));

    const meeting: Meeting = {
      id: uid(),
      title: review.title,
      date: review.date || new Date().toISOString().slice(0, 10),
      summary: review.summary,
      topics: review.topics,
      mentioned: review.people.filter((p) => p.include).map((p) => resolve(p.name)).filter((x): x is string => !!x),
      expectations: review.expectations.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, stakeholderId: resolve(e.stakeholder), source: e.source, status: "open" as const })),
      commitments: review.commitments.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, ownerId: resolveParty(e.owner), owedToId: resolveParty(e.owedTo), due: e.due, dueDate: e.dueDate ?? null, source: e.source, status: "open" as const })),
      concerns: review.concerns.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, stakeholderId: resolve(e.stakeholder), source: e.source })),
      decisions: review.decisions,
      actionItems: review.actionItems,
    };

    setStakeholders((prev) => [...prev, ...newStakeholders]);
    setMeetings((prev) => [meeting, ...prev]);
    await db.insertStakeholders(newStakeholders);
    await db.insertMeeting(meeting);
  }, [stakeholders]);

  const saveStakeholder = useCallback(async (s: Stakeholder) => {
    setStakeholders((prev) => prev.map((x) => (x.id === s.id ? s : x)));
    await db.updateStakeholder(s.id, {
      name: s.name, title: s.title, relationship: s.relationship, reportsTo: s.reportsTo, summary: s.summary,
    });
  }, []);

  // detach-and-keep: remove the stakeholder, but leave their meetings intact with references cleared
  const deleteStakeholder = useCallback(async (id: string) => {
    const touched: Meeting[] = [];
    setMeetings((prev) =>
      prev.map((m) => {
        const refs =
          m.mentioned.includes(id) ||
          m.expectations.some((e) => e.stakeholderId === id) ||
          m.commitments.some((e) => e.ownerId === id || e.owedToId === id) ||
          m.concerns.some((e) => e.stakeholderId === id);
        if (!refs) return m;
        const next: Meeting = {
          ...m,
          mentioned: m.mentioned.filter((x) => x !== id),
          expectations: m.expectations.map((e) => (e.stakeholderId === id ? { ...e, stakeholderId: null } : e)),
          commitments: m.commitments.map((e) => ({
            ...e,
            ownerId: e.ownerId === id ? null : e.ownerId,
            owedToId: e.owedToId === id ? null : e.owedToId,
          })),
          concerns: m.concerns.map((e) => (e.stakeholderId === id ? { ...e, stakeholderId: null } : e)),
        };
        touched.push(next);
        return next;
      })
    );
    setStakeholders((prev) => prev.filter((s) => s.id !== id));
    await Promise.all(touched.map((m) => db.saveMeeting(m)));
    await db.deleteStakeholder(id);
  }, []);

  const saveMeeting = useCallback(async (m: Meeting) => {
    setMeetings((prev) => prev.map((x) => (x.id === m.id ? m : x)).sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    await db.saveMeeting(m);
  }, []);

  const deleteMeeting = useCallback(async (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    await db.deleteMeeting(id);
  }, []);

  const toggleCommitment = useCallback(async (meetingId: string, commId: string) => {
    let prevCommitments: Meeting["commitments"] | null = null;
    let nextCommitments: Meeting["commitments"] | null = null;
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      prevCommitments = m.commitments;
      const commitments = m.commitments.map((cm) => cm.id === commId ? { ...cm, status: (cm.status === "done" ? "open" : "done") as "open" | "done" } : cm);
      nextCommitments = commitments;
      return { ...m, commitments };
    }));
    if (!nextCommitments) return;
    try {
      await db.updateMeeting(meetingId, { commitments: nextCommitments });
    } catch (e) {
      // DB write failed (e.g. RLS policy) — roll back the optimistic toggle so the UI
      // doesn't show a "done" state that never actually saved.
      setMeetings((prev) => prev.map((m) => (m.id === meetingId && prevCommitments ? { ...m, commitments: prevCommitments } : m)));
      const msg = e instanceof Error ? e.message : "Could not save this change.";
      if (typeof window !== "undefined") window.alert(`Couldn't save: ${msg}\nYour change was not saved — please try again.`);
    }
  }, []);

  const setSummary = useCallback(async (sid: string, summary: string) => {
    const stamp = new Date().toISOString();
    setStakeholders((prev) => prev.map((s) => (s.id === sid ? { ...s, summary, summaryGeneratedAt: stamp } : s)));
    await db.updateStakeholder(sid, { summary, summaryGeneratedAt: stamp });
  }, []);

  const value: OrbitContextValue = {
    ready, configured: supabaseConfigured, error, self: { name: "Rohit" },
    stakeholders, meetings, refresh, addStakeholder, saveStakeholder, deleteStakeholder,
    commitMeeting, saveMeeting, deleteMeeting, toggleCommitment, setSummary,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrbit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}
