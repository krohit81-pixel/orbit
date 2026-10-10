"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, BarChart3, ClipboardCheck, Eye, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Panel, PanelEmpty, Spinner } from "@/components/bits";
import { ActionRow } from "@/components/ActionRow";
import { WatchRow } from "@/components/WatchRow";
import { UpcomingRow } from "@/components/UpcomingRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { hueStyle } from "@/lib/hues";
import {
  actionDir, awaitingReply, briefDigest, cn, daysFromToday, dueSoon, fmtStamp, isOverdueAction, openCommitmentsInvolvingMe,
  sortByUrgency, todayISO, todaysBriefData,
} from "@/lib/utils";
import type { TodaysBrief } from "@/lib/types";

const BRIEF_CACHE_KEY = "orbit-todays-brief";

// Today (v2.0): what you owe, what you're owed, the next meetings with prep, and what's on
// watch — one place for each, nothing repeated. Everything here is deterministic and live;
// the only model call is "Brief me", which runs only when tapped (v1.9's manual-trigger rule)
// and whose last result is kept and shown with its timestamp until you dismiss or refresh it.
export function HomeScreen() {
  const { stakeholders, meetings, upcomingMeetings, pendingMeetingReviews } = useOrbit();
  const { nav, openPendingReviews } = useFlow();

  const open = openCommitmentsInvolvingMe(meetings);
  const overdue = open.filter(isOverdueAction);
  const week = open.filter(dueSoon);
  const awaiting = open.filter(awaitingReply);
  const youOwe = sortByUrgency(open.filter((c) => actionDir(c) === "out" && (isOverdueAction(c) || dueSoon(c))));
  const owed = sortByUrgency(open.filter((c) => actionDir(c) === "in" && (isOverdueAction(c) || dueSoon(c) || awaitingReply(c))));
  const allOut = open.filter((c) => actionDir(c) === "out").length;
  const allIn = open.filter((c) => actionDir(c) === "in").length;
  const briefData = todaysBriefData(meetings);
  // Every open concern, recurring first then newest — not the brief's 30-day window, which
  // emptied Watch entirely after a few quiet weeks even with dozens of concerns still open.
  const watch = todaysBriefData(meetings, 36500).concerns;
  const next = upcomingMeetings
    .filter((u) => u.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))
    .slice(0, 3);
  const todayMeetings = upcomingMeetings.filter((u) => daysFromToday(u.date) === 0);

  // ---- Brief me ----
  const [brief, setBrief] = useState<TodaysBrief | null>(null);
  const [briefAt, setBriefAt] = useState<string | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefErr, setBriefErr] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRIEF_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { generatedAt?: string; brief: TodaysBrief };
        if (cached.brief) { setBrief(cached.brief); setBriefAt(cached.generatedAt ?? null); }
      }
    } catch {
      // ignore a corrupt/unavailable cache
    }
  }, []);

  const generateBrief = async () => {
    if (briefBusy) return;
    setBriefErr("");
    setBriefBusy(true);
    try {
      const digest = briefDigest(briefData, stakeholders, todayMeetings);
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "todaysBrief", digest }),
      });
      const json = await res.json();
      if (!res.ok || !json.brief) throw new Error(json.error || "Couldn't write the brief.");
      const stamp = new Date().toISOString();
      setBrief(json.brief as TodaysBrief);
      setBriefAt(stamp);
      try { localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({ generatedAt: stamp, brief: json.brief })); } catch { /* not cached */ }
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : "Couldn't write the brief.");
    } finally {
      setBriefBusy(false);
    }
  };
  const dismissBrief = () => {
    setBrief(null);
    setBriefErr("");
    try { localStorage.removeItem(BRIEF_CACHE_KEY); } catch { /* ignore */ }
  };

  const headline = `${overdue.length ? `${overdue.length} overdue` : "Nothing overdue"}${todayMeetings.length ? `, ${todayMeetings.length} meeting${todayMeetings.length > 1 ? "s" : ""} today` : ""}`;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const stat = "o-stat flex flex-col gap-0.5 rounded-xl border border-border bg-card px-3.5 py-3 text-left hover:border-muted-foreground/50";

  return (
    <div>
      <PageHead
        eyebrow={today}
        title={headline}
        right={<>
          <Button variant="secondary" size="sm" className="min-[700px]:hidden" onClick={() => nav({ screen: "weeklyReport" })}>
            <BarChart3 className="h-3.5 w-3.5" /> Recap
          </Button>
          <Button variant="secondary" size="sm" onClick={generateBrief} disabled={briefBusy}>
            {briefBusy ? <><Spinner className="h-3.5 w-3.5" /> Thinking…</> : <><Sparkles className="h-3.5 w-3.5" /> Brief me</>}
          </Button>
        </>}
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button className={stat} style={hueStyle("red")} onClick={() => nav({ screen: "actions", when: "overdue" })}>
          <b className={cn("text-[24px] font-bold leading-tight tabular-nums", overdue.length > 0 && "text-warm")}>{overdue.length}</b>
          <span className="text-[12.5px] text-muted-foreground">Overdue</span>
        </button>
        <button className={stat} style={hueStyle("orange")} onClick={() => nav({ screen: "actions", when: "week" })}>
          <b className="text-[24px] font-bold leading-tight tabular-nums">{week.length}</b>
          <span className="text-[12.5px] text-muted-foreground">Due in 7 days</span>
        </button>
        <button className={stat} style={hueStyle("blue")} onClick={() => nav({ screen: "actions", when: "awaiting" })}>
          <b className="text-[24px] font-bold leading-tight tabular-nums">{awaiting.length}</b>
          <span className="text-[12.5px] text-muted-foreground">Awaiting reply</span>
        </button>
        <button className={stat} style={hueStyle("violet")} onClick={() => document.getElementById("watch-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
          <b className="text-[24px] font-bold leading-tight tabular-nums">{watch.length}</b>
          <span className="text-[12.5px] text-muted-foreground">On watch</span>
        </button>
      </div>

      {pendingMeetingReviews.length > 0 && (
        <div className="o-banner mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-accent px-4 py-3">
          <ClipboardCheck className="h-[18px] w-[18px] shrink-0 text-accent-foreground" />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <b className="font-semibold">{pendingMeetingReviews.length} meeting{pendingMeetingReviews.length === 1 ? "" : "s"} from your calendar</b>{" "}
            {pendingMeetingReviews.length === 1 ? "is" : "are"} ready to add. Orbit drafted {pendingMeetingReviews.length === 1 ? "it" : "them"} from your prep notes; review before anything is saved.
          </div>
          <Button size="sm" onClick={openPendingReviews}>Review</Button>
        </div>
      )}

      {(brief || briefErr) && (
        <Panel
          className="mb-4"
          hue="pink"
          title={<span className="flex items-center gap-1.5 text-accent-foreground"><Sparkles className="h-3.5 w-3.5" /> Brief</span>}
          right={
            <span className="flex items-center gap-2">
              {briefAt && <span className="text-[12px] text-muted-foreground/70">Generated {fmtStamp(briefAt)}</span>}
              <button onClick={dismissBrief} aria-label="Dismiss brief" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><X className="h-3.5 w-3.5" /></button>
            </span>
          }
        >
          {briefErr ? <PanelEmpty><span className="text-warm">{briefErr}</span></PanelEmpty>
            : brief && brief.priorities.length === 0 ? <PanelEmpty>Nothing urgent stands out.</PanelEmpty>
            : <ol className="flex list-decimal flex-col gap-1.5 pb-3.5 pl-9 pr-4">{brief?.priorities.map((p, i) => <li key={i} className="leading-snug">{p}</li>)}</ol>}
        </Panel>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel
            hue="orange"
            title={<><ArrowUpRight className="h-3.5 w-3.5" /> You owe</>}
            count={youOwe.length}
            footer={{ label: `All ${allOut} you owe`, onClick: () => nav({ screen: "actions", dir: "out" }) }}
          >
            {youOwe.length ? youOwe.slice(0, 6).map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} directional />) : <PanelEmpty>Nothing due this week.</PanelEmpty>}
          </Panel>
          <Panel
            hue="green"
            title={<><ArrowDownLeft className="h-3.5 w-3.5" /> Owed to you</>}
            count={owed.length}
            footer={{ label: `All ${allIn} owed to you`, onClick: () => nav({ screen: "actions", dir: "in" }) }}
          >
            {owed.length ? owed.slice(0, 6).map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} directional nudge />) : <PanelEmpty>Nobody owes you anything this week.</PanelEmpty>}
          </Panel>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel hue="blue" title="Next meetings" footer={{ label: "Full schedule", onClick: () => nav({ screen: "meetings", tab: "upcoming" }) }}>
            {next.length ? next.map((u) => <UpcomingRow key={u.id} u={u} />) : <PanelEmpty>Nothing scheduled. Import a calendar photo from Capture.</PanelEmpty>}
          </Panel>
          <Panel id="watch-panel" hue="violet" title={<><Eye className="h-3.5 w-3.5" /> Watch</>} count={watch.length}>
            {watch.length ? watch.slice(0, 4).map(({ concern, meeting, recurring }) => <WatchRow key={concern.id} concern={concern} meeting={meeting} recurring={recurring} />)
              : <PanelEmpty>Nothing on watch.</PanelEmpty>}
            {watch.length > 4 && <PanelEmpty>{watch.length - 4} more open. They stay on the meetings and people they came from; resolve the ones that no longer apply.</PanelEmpty>}
          </Panel>
        </div>
      </div>
      {meetings.length === 0 && (
        <p className="mt-6 text-center text-[13px] text-muted-foreground">No meetings yet. Use Capture to add your first one.</p>
      )}
    </div>
  );
}
