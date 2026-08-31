"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as db from "@/lib/db";
import { supabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils";
import type { Meeting, PendingMeetingReview, ReviewModel, ScheduleReviewItem, Stakeholder, UpcomingMeeting } from "@/lib/types";

interface OrbitContextValue {
  ready: boolean;
  configured: boolean;
  error: string | null;
  self: { name: string };
  stakeholders: Stakeholder[];
  meetings: Meeting[];
  upcomingMeetings: UpcomingMeeting[];
  pendingMeetingReviews: PendingMeetingReview[];
  refresh: () => Promise<void>;
  addStakeholder: (s: Omit<Stakeholder, "id" | "summary">) => Promise<string>;
  saveStakeholder: (s: Stakeholder) => Promise<void>;
  deleteStakeholder: (id: string) => Promise<void>;
  commitMeeting: (review: ReviewModel) => Promise<void>;
  saveMeeting: (m: Meeting) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  toggleCommitment: (meetingId: string, commId: string) => Promise<void>;
  resolveConcern: (meetingId: string, concernId: string, resolution: "mitigated" | "no_longer_relevant") => Promise<void>;
  reopenConcern: (meetingId: string, concernId: string) => Promise<void>;
  addCommitmentUpdate: (meetingId: string, commId: string, input: { note: string; date: string; newDueDate?: string | null; markDone?: boolean }) => Promise<void>;
  setSummary: (sid: string, summary: string) => Promise<void>;
  commitSchedule: (items: ScheduleReviewItem[]) => Promise<void>;
  saveUpcomingMeetingNotes: (id: string, notes: string) => Promise<void>;
  deleteUpcomingMeeting: (id: string) => Promise<void>;
  // Removes a staged PendingMeetingReview row — used both when the owner discards one outright
  // and, after a successful commitMeeting(), to clear the staging row an accepted one leaves
  // behind (the DB operation is identical either way; only what happens before it differs).
  deletePendingMeetingReview: (id: string) => Promise<void>;
}

const Ctx = createContext<OrbitContextValue | null>(null);

export function OrbitProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [pendingMeetingReviews, setPendingMeetingReviews] = useState<PendingMeetingReview[]>([]);

  const refresh = useCallback(async () => {
    const { stakeholders, meetings, upcomingMeetings, pendingMeetingReviews } = await db.fetchAll();
    setStakeholders(stakeholders);
    setMeetings(meetings);
    setUpcomingMeetings(upcomingMeetings);
    setPendingMeetingReviews(pendingMeetingReviews);
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
      concerns: review.concerns.filter((e) => e.include).map((e) => ({ id: uid(), text: e.text, stakeholderId: resolve(e.stakeholder), source: e.source, status: "open" as const })),
      decisions: review.decisions,
      actionItems: review.actionItems,
      transcript: review.transcript || undefined,
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

  // Buries a concern (v1.17): drops it from every "currently live" surface — Today's Brief,
  // the weekly report's open concerns, relationship-health scoring — without deleting it. It
  // stays on the meeting record, still searchable, still visible there with its resolution
  // reason shown, same "open" -> "done" shape as toggleCommitment above, just with a reason
  // attached and (below) a way back.
  const resolveConcern = useCallback(async (meetingId: string, concernId: string, resolution: "mitigated" | "no_longer_relevant") => {
    let prevConcerns: Meeting["concerns"] | null = null;
    let nextConcerns: Meeting["concerns"] | null = null;
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      prevConcerns = m.concerns;
      const concerns = m.concerns.map((c) => (c.id === concernId ? { ...c, status: "resolved" as const, resolution } : c));
      nextConcerns = concerns;
      return { ...m, concerns };
    }));
    if (!nextConcerns) return;
    try {
      await db.updateMeeting(meetingId, { concerns: nextConcerns });
    } catch (e) {
      setMeetings((prev) => prev.map((m) => (m.id === meetingId && prevConcerns ? { ...m, concerns: prevConcerns } : m)));
      const msg = e instanceof Error ? e.message : "Could not save this change.";
      if (typeof window !== "undefined") window.alert(`Couldn't save: ${msg}\nYour change was not saved — please try again.`);
    }
  }, []);

  // Undoes a resolve — back to "open" everywhere, resolution reason cleared.
  const reopenConcern = useCallback(async (meetingId: string, concernId: string) => {
    let prevConcerns: Meeting["concerns"] | null = null;
    let nextConcerns: Meeting["concerns"] | null = null;
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      prevConcerns = m.concerns;
      const concerns = m.concerns.map((c) => (c.id === concernId ? { ...c, status: "open" as const, resolution: undefined } : c));
      nextConcerns = concerns;
      return { ...m, concerns };
    }));
    if (!nextConcerns) return;
    try {
      await db.updateMeeting(meetingId, { concerns: nextConcerns });
    } catch (e) {
      setMeetings((prev) => prev.map((m) => (m.id === meetingId && prevConcerns ? { ...m, concerns: prevConcerns } : m)));
      const msg = e instanceof Error ? e.message : "Could not save this change.";
      if (typeof window !== "undefined") window.alert(`Couldn't save: ${msg}\nYour change was not saved — please try again.`);
    }
  }, []);

  // Append-only progress log for a commitment, with an optional due-date revision recorded
  // alongside it (v1.8), and an optional markDone (v1.12, for suggestions accepted out of
  // Review — see Orbit.tsx's commit()) that also closes the commitment in the same write.
  // Follows toggleCommitment's optimistic-then-rollback shape, since this is a
  // data-integrity write like any other.
  const addCommitmentUpdate = useCallback(async (
    meetingId: string,
    commId: string,
    input: { note: string; date: string; newDueDate?: string | null; markDone?: boolean }
  ) => {
    let prevCommitments: Meeting["commitments"] | null = null;
    let nextCommitments: Meeting["commitments"] | null = null;
    setMeetings((prev) => prev.map((m) => {
      if (m.id !== meetingId) return m;
      prevCommitments = m.commitments;
      const commitments = m.commitments.map((cm) => {
        if (cm.id !== commId) return cm;
        const revisingDue = input.newDueDate !== undefined && input.newDueDate !== (cm.dueDate ?? null);
        const entry = {
          id: uid(),
          date: input.date,
          note: input.note,
          dueDateBefore: revisingDue ? cm.dueDate ?? null : undefined,
          dueDateAfter: revisingDue ? input.newDueDate ?? null : undefined,
          createdAt: new Date().toISOString(),
        };
        return {
          ...cm,
          updates: [...(cm.updates ?? []), entry],
          dueDate: revisingDue ? input.newDueDate ?? null : cm.dueDate,
          due: revisingDue ? null : cm.due, // the human due label is now stale once dueDate moves
          status: input.markDone ? ("done" as const) : cm.status,
        };
      });
      nextCommitments = commitments;
      return { ...m, commitments };
    }));
    if (!nextCommitments) return;
    try {
      await db.updateMeeting(meetingId, { commitments: nextCommitments });
    } catch (e) {
      setMeetings((prev) => prev.map((m) => (m.id === meetingId && prevCommitments ? { ...m, commitments: prevCommitments } : m)));
      const msg = e instanceof Error ? e.message : "Could not save this update.";
      if (typeof window !== "undefined") window.alert(`Couldn't save: ${msg}\nYour update was not saved — please try again.`);
    }
  }, []);

  const setSummary = useCallback(async (sid: string, summary: string) => {
    const stamp = new Date().toISOString();
    setStakeholders((prev) => prev.map((s) => (s.id === sid ? { ...s, summary, summaryGeneratedAt: stamp } : s)));
    await db.updateStakeholder(sid, { summary, summaryGeneratedAt: stamp });
  }, []);

  // Applies the owner's reviewed schedule-import decisions (v1.15) — nothing from
  // extractSchedule ever reaches Supabase before this runs. "new" items (and "uncertain"
  // ones resolved as "new") insert a fresh row; "updated" items (and "uncertain" ones
  // resolved as "update") patch the existing row's date/time/attendees/location only —
  // the owner's own `notes` on that record are never touched by an import.
  //
  // Every write is caught individually and rolled back on failure (same optimistic-then-
  // rollback shape as toggleCommitment/addCommitmentUpdate) rather than left to reject
  // unhandled — this surfaced as a real gap while verifying the feature against the actual
  // Supabase project before the orbit.upcoming_meetings migration had been run: the insert
  // failed, and with no catch here the owner would have been left on the Review screen with
  // no feedback at all that nothing was saved. The alert names the likely cause (the
  // migration not run yet) explicitly, since that's the one failure mode every first use of
  // this feature will hit until the owner runs it once.
  const commitSchedule = useCallback(async (items: ScheduleReviewItem[]) => {
    const toInsert: UpcomingMeeting[] = [];
    const toUpdate: { id: string; patch: Partial<UpcomingMeeting> }[] = [];
    const stamp = new Date().toISOString();

    items.filter((it) => it.include).forEach((it) => {
      const asNew = it.kind === "new" || (it.kind === "uncertain" && it.resolution === "new");
      if (asNew) {
        toInsert.push({
          id: uid(),
          title: it.extracted.title,
          date: it.extracted.date,
          startTime: it.extracted.startTime,
          endTime: it.extracted.endTime,
          attendees: it.extracted.attendees,
          location: it.extracted.location,
          notes: null,
          createdAt: stamp,
          updatedAt: stamp,
        });
      } else if (it.existing) {
        toUpdate.push({
          id: it.existing.id,
          patch: {
            date: it.extracted.date,
            startTime: it.extracted.startTime,
            endTime: it.extracted.endTime,
            attendees: it.extracted.attendees,
            location: it.extracted.location,
            updatedAt: stamp,
          },
        });
      }
    });

    let failCount = 0;

    if (toInsert.length) {
      setUpcomingMeetings((prev) => [...prev, ...toInsert].sort((a, b) => a.date.localeCompare(b.date)));
      const results = await Promise.allSettled(toInsert.map((u) => db.insertUpcomingMeeting(u)));
      const failedIds = new Set(toInsert.filter((_, i) => results[i].status === "rejected").map((u) => u.id));
      if (failedIds.size) {
        failCount += failedIds.size;
        setUpcomingMeetings((prev) => prev.filter((u) => !failedIds.has(u.id)));
      }
    }
    for (const { id, patch } of toUpdate) {
      let prev: UpcomingMeeting | undefined;
      setUpcomingMeetings((list) => list.map((u) => {
        if (u.id !== id) return u;
        prev = u;
        return { ...u, ...patch };
      }));
      try {
        await db.updateUpcomingMeeting(id, {
          date: patch.date, start_time: patch.startTime, end_time: patch.endTime,
          attendees: patch.attendees, location: patch.location, updated_at: patch.updatedAt,
        });
      } catch {
        failCount++;
        if (prev) {
          const restored = prev;
          setUpcomingMeetings((list) => list.map((u) => (u.id === id ? restored : u)));
        }
      }
    }

    if (failCount > 0 && typeof window !== "undefined") {
      window.alert(
        `Couldn't save ${failCount} meeting${failCount === 1 ? "" : "s"}.\n\n` +
        `If this is your first time importing a calendar, you likely need to run ` +
        `supabase/migrations/004_add_upcoming_meetings.sql once in the Supabase SQL editor, ` +
        `then try importing again.`
      );
    }
  }, []);

  const saveUpcomingMeetingNotes = useCallback(async (id: string, notes: string) => {
    const stamp = new Date().toISOString();
    let prevNotes: string | null | undefined;
    setUpcomingMeetings((prev) => prev.map((u) => {
      if (u.id !== id) return u;
      prevNotes = u.notes;
      return { ...u, notes, updatedAt: stamp };
    }));
    try {
      await db.updateUpcomingMeeting(id, { notes, updated_at: stamp });
    } catch (e) {
      setUpcomingMeetings((prev) => prev.map((u) => (u.id === id ? { ...u, notes: prevNotes ?? null } : u)));
      const msg = e instanceof Error ? e.message : "Could not save this note.";
      if (typeof window !== "undefined") window.alert(`Couldn't save: ${msg}\nYour note was not saved — please try again.`);
    }
  }, []);

  const deleteUpcomingMeeting = useCallback(async (id: string) => {
    setUpcomingMeetings((prev) => prev.filter((u) => u.id !== id));
    await db.deleteUpcomingMeeting(id);
  }, []);

  const deletePendingMeetingReview = useCallback(async (id: string) => {
    setPendingMeetingReviews((prev) => prev.filter((p) => p.id !== id));
    await db.deletePendingMeetingReview(id);
  }, []);

  const value: OrbitContextValue = {
    ready, configured: supabaseConfigured, error, self: { name: "Rohit" },
    stakeholders, meetings, upcomingMeetings, pendingMeetingReviews, refresh, addStakeholder, saveStakeholder, deleteStakeholder,
    commitMeeting, saveMeeting, deleteMeeting, toggleCommitment, resolveConcern, reopenConcern, addCommitmentUpdate, setSummary,
    commitSchedule, saveUpcomingMeetingNotes, deleteUpcomingMeeting, deletePendingMeetingReview,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrbit() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOrbit must be used within OrbitProvider");
  return ctx;
}
