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
import { CaptureScreen } from "./screens/Capture";
import { ReviewScreen } from "./screens/Review";
import { SearchScreen } from "./screens/Search";
import { todayISO, uid } from "@/lib/utils";
import type { Extraction, ReviewModel, ReviewPerson } from "@/lib/types";

function buildReview(ex: Extraction, knownNames: Set<string>, date: string): ReviewModel {
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

  const knownNames = () => new Set(store.stakeholders.map((s) => s.name.toLowerCase().trim()));

  const runExtraction = async () => {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "extract", transcript: draft, known: store.stakeholders.map((s) => s.name).join(", "), today: todayISO(), meetingDate }),
      });
      const data = await res.json();
      if (!res.ok || !data.extraction) throw new Error(data.error || "Extraction failed.");
      setReview(buildReview(data.extraction, knownNames(), meetingDate));
      setView({ screen: "review" });
    } catch (e) {
      setErr((e instanceof Error ? e.message : "Extraction failed.") + " You can load the sample result to continue.");
    } finally {
      setBusy(false);
    }
  };

  const loadSample = () => {
    setReview(buildReview(SAMPLE_EXTRACTION, knownNames(), meetingDate));
    setView({ screen: "review" });
  };

  const commit = async () => {
    if (!review) return;
    await store.commitMeeting(review);
    setReview(null);
    setDraft("");
    setMeetingDate(todayISO());
    setView({ screen: "meetings" });
  };

  const flow: Flow = { view, go: setView, draft, setDraft, meetingDate, setMeetingDate, busy, err, review, setReview, runExtraction, loadSample, commit };

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
    case "capture": body = <CaptureScreen />; break;
    case "review": body = <ReviewScreen />; break;
    case "search": body = <SearchScreen />; break;
    default: body = <HomeScreen />;
  }

  if (!store.ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading Orbit…</div>;
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
