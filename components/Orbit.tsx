"use client";

import { useState } from "react";
import { OrbitProvider, useOrbit } from "./OrbitStore";
import { FlowCtx, type Flow, type View } from "./flow";
import { Shell } from "./Shell";
import { HomeScreen } from "./screens/Home";
import { PeopleScreen } from "./screens/People";
import { StakeholderScreen } from "./screens/Stakeholder";
import { AddStakeholderScreen } from "./screens/AddStakeholder";
import { EditStakeholderScreen } from "./screens/EditStakeholder";
import { MeetingsScreen } from "./screens/Meetings";
import { MeetingScreen } from "./screens/MeetingDetail";
import { EditMeetingScreen } from "./screens/EditMeeting";
import { MeetingPrintScreen } from "./screens/MeetingPrint";
import { CaptureScreen } from "./screens/Capture";
import { ReviewScreen } from "./screens/Review";
import { SearchScreen } from "./screens/Search";
import { WeeklyReportScreen } from "./screens/WeeklyReport";
import { ImportScheduleScreen } from "./screens/ImportSchedule";
import { ScheduleReviewScreen } from "./screens/ScheduleReview";
import { Spinner } from "./bits";
import { allOpenCommitments, commitmentLabel, matchSchedule, normalizeAttendeeName, openCommitmentsDigest, todayISO, uid } from "@/lib/utils";
import type {
  Extraction, ExtractedScheduleItem, Meeting, PendingMeetingReview, ReviewCommitmentSuggestion,
  ReviewModel, ReviewPerson, ScheduleReviewItem, Stakeholder,
} from "@/lib/types";

function buildReview(
  ex: Extraction,
  knownNames: Set<string>,
  date: string,
  transcript: string,
  meetings: Meeting[],
  stakeholders: Stakeholder[]
): ReviewModel {
  const names = new Set<string>();
  ex.stakeholders?.forEach((p) => p.name && names.add(p.name));
  ex.expectations?.forEach((x) => x.stakeholder && names.add(x.stakeholder));
  ex.concerns?.forEach((x) => x.stakeholder && names.add(x.stakeholder));
  ex.commitments?.forEach((x) => {
    if (x.owner && x.owner !== "me") names.add(x.owner);
    if (x.owedTo && x.owedTo !== "me") names.add(x.owedTo);
  });
  const people: ReviewPerson[] = [...names].filter(Boolean).map((n) => ({
    _id: uid(),
    include: true,
    name: n,
    role: ex.stakeholders?.find((s) => s.name === n)?.role ?? null,
    existing: knownNames.has(n.toLowerCase().trim()),
  }));

  // Resolve each suggestion's [id] against real open commitments — commitmentText/
  // commitmentLabel come from OUR data, never the model's own restated text, so what's shown
  // in Review is always factually accurate even though the judgment (which commitment,
  // which action) came from the LLM. Anything that doesn't resolve (a stale or invented ref)
  // is silently dropped, same defensive pattern Search's "Ask Orbit" uses for its sources.
  const open = allOpenCommitments(meetings);
  const commitmentSuggestions: ReviewCommitmentSuggestion[] = (ex.commitmentSuggestions || [])
    .map((s) => {
      const match = open.find((c) => c.id === s.commitmentRef);
      if (!match) return null;
      return {
        _id: uid(),
        include: true,
        meetingId: match.meeting.id,
        commitmentId: match.id,
        commitmentText: match.text,
        commitmentLabel: commitmentLabel(match, stakeholders),
        action: s.action,
        newDueDate: s.newDueDate ?? null,
        reason: s.reason,
      };
    })
    .filter((x): x is ReviewCommitmentSuggestion => x !== null);

  return {
    title: ex.title || "Untitled meeting",
    date,
    summary: ex.summary || "",
    topics: ex.topics || [],
    people,
    expectations: (ex.expectations || []).map((x) => ({ ...x, _id: uid(), include: true })),
    commitments: (ex.commitments || []).map((x) => ({ ...x, owedTo: x.owedTo ?? null, _id: uid(), include: true })),
    concerns: (ex.concerns || []).map((x) => ({ ...x, _id: uid(), include: true })),
    decisions: ex.decisions || [],
    actionItems: ex.actionItems || [],
    commitmentSuggestions,
    transcript,
  };
}

const SAMPLE_EXTRACTION: Extraction = {
  title: "AI Governance & Hiring Review",
  summary: "Maya set governance as the board-facing priority and pushed back on prior slips; hiring roadmap follows. Quality-over-speed agreed on senior hires.",
  topics: ["AI governance", "Hiring", "Board readiness"],
  stakeholders: [{ name: "Maya Chen", role: "Group CRO" }, { name: "David Okafor", role: "Head of Platform" }, { name: "Priya Nair", role: "Head of Talent" }, { name: "Kenji", role: null }],
  expectations: [{ text: "AI governance proposal finalised before quarter-end", stakeholder: "Maya Chen", source: "I need the governance proposal finalised" }],
  commitments: [
    { text: "Deliver AI governance proposal", owner: "me", owedTo: "Maya Chen", due: "By the 30th", dueDate: todayISO(), source: "by the 30th" },
    { text: "Share updated hiring roadmap", owner: "me", owedTo: "David Okafor", due: "Next week", dueDate: todayISO(), source: "I'll share the hiring roadmap" },
    { text: "Send the board scrutiny brief", owner: "Maya Chen", owedTo: "me", due: null, dueDate: null, source: "I'll get you the brief" },
  ],
  concerns: [
    { text: "Governance clarity keeps slipping", stakeholder: "Maya Chen", source: "that can't happen again" },
    { text: "Speed must not compromise hire quality", stakeholder: "Priya Nair", source: "quality matters more than speed" },
  ],
  decisions: ["Governance proposal prioritised first, hiring roadmap second"],
  actionItems: ["Loop in Kenji (Tokyo) on the board ask"],
};

function Inner() {
  const store = useOrbit();
  const [view, setView] = useState<View>({ screen: "home" });
  const [draft, setDraft] = useState("");
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [review, setReview] = useState<ReviewModel | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleErr, setScheduleErr] = useState("");
  const [scheduleReview, setScheduleReview] = useState<ScheduleReviewItem[] | null>(null);
  const [scheduleUnchangedCount, setScheduleUnchangedCount] = useState(0);
  const [scheduleSkippedPastCount, setScheduleSkippedPastCount] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<PendingMeetingReview[]>([]);
  const [pendingIndex, setPendingIndex] = useState(0);

  const knownNames = () => new Set(store.stakeholders.map((s) => s.name.toLowerCase().trim()));

  const buildPendingReview = (item: PendingMeetingReview): ReviewModel =>
    buildReview(item.extraction, knownNames(), item.date, item.notes || "", store.meetings, store.stakeholders);

  // Opens the overnight close-out queue (v1.16) — a snapshot of store.pendingMeetingReviews
  // taken once, so items don't shift under the owner mid-review if a refresh lands while
  // they're stepping through it.
  const openPendingReviews = () => {
    const queue = store.pendingMeetingReviews;
    if (queue.length === 0) return;
    setPendingQueue(queue);
    setPendingIndex(0);
    setReview(buildPendingReview(queue[0]));
    setView({ screen: "pendingReviews" });
  };

  const advancePendingQueue = () => {
    const next = pendingIndex + 1;
    if (next < pendingQueue.length) {
      setPendingIndex(next);
      setReview(buildPendingReview(pendingQueue[next]));
    } else {
      setReview(null);
      setPendingQueue([]);
      setPendingIndex(0);
      setView({ screen: "meetings" });
    }
  };

  // Discards the current queue item without adding it to Meetings — e.g. a note that turns
  // out to mean the meeting didn't actually happen. Same "review before commit" spirit as
  // rejecting anything else in a review screen; this just skips the whole item rather than
  // one field within it.
  const skipPendingReview = async () => {
    const current = pendingQueue[pendingIndex];
    if (current) await store.deletePendingMeetingReview(current.id);
    advancePendingQueue();
  };

  const runExtraction = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task: "extract",
          transcript: draft,
          known: store.stakeholders.map((s) => s.name).join(", "),
          today: todayISO(),
          meetingDate,
          openCommitments: openCommitmentsDigest(store.meetings, store.stakeholders),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.extraction) throw new Error(data.error || "Extraction failed.");
      setReview(buildReview(data.extraction, knownNames(), meetingDate, draft, store.meetings, store.stakeholders));
      setView({ screen: "review" });
    } catch (e) {
      setErr((e instanceof Error ? e.message : "Extraction failed.") + " You can load the sample result to continue.");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = () => {
    setReview(buildReview(SAMPLE_EXTRACTION, knownNames(), meetingDate, draft, store.meetings, store.stakeholders));
    setView({ screen: "review" });
  };

  const commit = async () => {
    if (!review) return;
    // Overnight close-out queue (v1.16): same commitMeeting() as a live capture, just
    // followed by clearing the staging row and advancing to the next queued item instead of
    // resetting the transcript draft and returning to Meetings outright.
    if (view.screen === "pendingReviews") {
      await store.commitMeeting(review);
      const current = pendingQueue[pendingIndex];
      if (current) await store.deletePendingMeetingReview(current.id);
      advancePendingQueue();
      return;
    }
    await store.commitMeeting(review);
    // Apply accepted commitment-update suggestions against the EXISTING meetings/commitments
    // they refer to — separate from the new meeting just committed above. Each rides the
    // ordinary addCommitmentUpdate path (audit-trail entry + optional close/date-revision),
    // so it shows up in that commitment's normal update timeline, not as anything special.
    // Sequential and best-effort: addCommitmentUpdate already rolls back and alerts on its
    // own failure, so one bad write doesn't block the rest.
    for (const s of review.commitmentSuggestions.filter((x) => x.include)) {
      await store.addCommitmentUpdate(s.meetingId, s.commitmentId, {
        note: s.reason,
        date: meetingDate,
        newDueDate: s.action === "revise_date" ? s.newDueDate ?? null : undefined,
        markDone: s.action === "close",
      });
    }
    setReview(null);
    setDraft("");
    setMeetingDate(todayISO());
    setView({ screen: "meetings" });
  };

  // Vision-based schedule import (v1.15). extractSchedule only reads the photo — it never
  // sees store.upcomingMeetings — so all "is this already recorded / has it changed" judgment
  // happens here, deterministically, via matchSchedule(). See that function's own comment for
  // the exact matching rules (recurring-meeting-safe: same title on a different date needs a
  // single unambiguous candidate before it's even offered as a possible reschedule).
  const runScheduleExtraction = async (imageBase64: string, mediaType: string) => {
    setScheduleErr("");
    setScheduleBusy(true);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "extractSchedule", imageBase64, mediaType, today: todayISO() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read the calendar photo.");
      // The model is asked to flip Outlook's "Last, First" display order to "First Last", but
      // verifying against a real photo showed it doesn't reliably do that — normalizeAttendeeName()
      // does it deterministically instead (pure text transform, no judgment involved).
      const extracted = ((data.meetings || []) as ExtractedScheduleItem[]).map((m) => ({
        ...m,
        attendees: m.attendees.map(normalizeAttendeeName),
      }));
      const { items, unchangedCount, skippedPastCount } = matchSchedule(extracted, store.upcomingMeetings);
      setScheduleReview(items);
      setScheduleUnchangedCount(unchangedCount);
      setScheduleSkippedPastCount(skippedPastCount);
      setView({ screen: "scheduleReview" });
    } catch (e) {
      setScheduleErr(e instanceof Error ? e.message : "Couldn't read the calendar photo.");
    } finally {
      setScheduleBusy(false);
    }
  };

  const commitSchedule = async () => {
    if (!scheduleReview) return;
    await store.commitSchedule(scheduleReview);
    setScheduleReview(null);
    setScheduleUnchangedCount(0);
    setScheduleSkippedPastCount(0);
    setView({ screen: "meetings" });
  };

  const flow: Flow = {
    view, go: setView, draft, setDraft, meetingDate, setMeetingDate, busy, err, review, setReview, runExtraction, loadSample, commit,
    scheduleBusy, scheduleErr, scheduleReview, scheduleUnchangedCount, scheduleSkippedPastCount,
    setScheduleReview: (items) => setScheduleReview(items),
    runScheduleExtraction, commitSchedule,
    pendingQueue, pendingIndex, openPendingReviews, skipPendingReview,
  };

  let body: React.ReactNode;
  switch (view.screen) {
    case "home": body = <HomeScreen />; break;
    case "people": body = <PeopleScreen />; break;
    case "stakeholder": body = <StakeholderScreen id={view.id} />; break;
    case "editStakeholder": body = <EditStakeholderScreen id={view.id} />; break;
    case "addStakeholder": body = <AddStakeholderScreen />; break;
    case "meetings": body = <MeetingsScreen />; break;
    case "meeting": body = <MeetingScreen id={view.id} />; break;
    case "editMeeting": body = <EditMeetingScreen id={view.id} />; break;
    case "meetingPrint": body = <MeetingPrintScreen id={view.id} />; break;
    case "capture": body = <CaptureScreen />; break;
    case "review": body = <ReviewScreen />; break;
    case "search": body = <SearchScreen />; break;
    case "weeklyReport": body = <WeeklyReportScreen />; break;
    case "importSchedule": body = <ImportScheduleScreen />; break;
    case "scheduleReview": body = <ScheduleReviewScreen />; break;
    case "pendingReviews": body = <ReviewScreen />; break;
    default: body = <HomeScreen />;
  }

  if (!store.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="h-5 w-5" /> Loading Orbit…
      </div>
    );
  }
  if (!store.configured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8 text-sm leading-relaxed text-muted-foreground">
        <div className="mb-2 text-lg font-bold text-foreground">Orbit needs Supabase</div>
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>), run <code>supabase/schema.sql</code> in your project, and reload.
      </div>
    );
  }
  if (store.error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8 text-sm leading-relaxed text-warm">
        <div className="mb-2 text-lg font-bold">Couldn&apos;t reach Supabase</div>
        {store.error}
      </div>
    );
  }

  return (
    <FlowCtx.Provider value={flow}>
      <Shell>{body}</Shell>
    </FlowCtx.Provider>
  );
}

export default function Orbit() {
  return (
    <OrbitProvider>
      <Inner />
    </OrbitProvider>
  );
}
