"use client";

import { useEffect, useState } from "react";
import { Search, ChevronRight, ChevronDown, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow, DueLabel, Spinner, vibrantCard } from "@/components/bits";
import { cn } from "@/lib/utils";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  fmtFull, intel, isOverdue, openCommitmentsInvolvingMe, otherParty, commitmentLabel,
  stakeholderById, todaysBriefData, todayISO, type OpenCommitment,
} from "@/lib/utils";
import type { TodaysBrief } from "@/lib/types";

const BRIEF_CACHE_KEY = "orbit-todays-brief";

export function HomeScreen() {
  const { self, stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const open = openCommitmentsInvolvingMe(meetings);

  // group by the other party
  const groups = new Map<string, OpenCommitment[]>();
  open.forEach((cm) => {
    const key = otherParty(cm) ?? "__unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cm);
  });
  const groupList = [...groups.entries()].sort((a, b) => {
    if (a[0] === "__unassigned") return 1;
    if (b[0] === "__unassigned") return -1;
    return (stakeholderById(stakeholders, a[0])?.name ?? "").localeCompare(stakeholderById(stakeholders, b[0])?.name ?? "");
  });
  groupList.forEach(([, items]) => items.sort((x, y) => (x.dueDate || "9999").localeCompare(y.dueDate || "9999")));

  // All groups start collapsed; the owner opens the ones they want to look at.
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => !!openKeys[key];
  const toggle = (key: string) => setOpenKeys((o) => ({ ...o, [key]: !o[key] }));

  const recent = stakeholders
    .filter((s) => meetings.slice(0, 2).some((m) => m.mentioned.includes(s.id)))
    .slice(0, 3);

  // ---- Today's Brief ----
  // Auto-generates once per calendar day (cached in localStorage) so navigating back to
  // Home doesn't re-fire the LLM; a manual refresh regenerates on demand. Nothing here is
  // persisted to Supabase — same derived-not-stored model as the weekly report.
  const [brief, setBrief] = useState<TodaysBrief | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefErr, setBriefErr] = useState("");
  const briefData = todaysBriefData(meetings);

  const generateBrief = async () => {
    setBriefErr("");
    setBriefBusy(true);
    try {
      const lines: string[] = [`Today: ${fmtFull(todayISO())}`];
      if (briefData.commitments.length) {
        lines.push("Open commitments involving Rohit (most urgent first):");
        briefData.commitments.slice(0, 12).forEach((c) => {
          const due = c.dueDate ? (isOverdue(c.dueDate) ? `overdue, was due ${fmtFull(c.dueDate)}` : `due ${fmtFull(c.dueDate)}`) : c.due || "no due date";
          lines.push(`- ${c.text} (${commitmentLabel(c, stakeholders)}, ${due})`);
        });
      } else {
        lines.push("No open commitments involving Rohit.");
      }
      if (briefData.concerns.length) {
        lines.push("Concerns raised recently:");
        briefData.concerns.slice(0, 10).forEach(({ concern, meeting }) => {
          lines.push(`- ${concern.text} (from "${meeting.title}", ${fmtFull(meeting.date)})`);
        });
      }
      if (briefData.expectations.length) {
        lines.push("Open expectations from recent meetings:");
        briefData.expectations.slice(0, 10).forEach(({ e, meeting }) => {
          lines.push(`- ${e.text} (from "${meeting.title}", ${fmtFull(meeting.date)})`);
        });
      }
      if (briefData.recentMeetings.length) {
        lines.push("Recent meetings for context:");
        briefData.recentMeetings.forEach((m) => lines.push(`- ${fmtFull(m.date)}: ${m.title} — ${m.summary}`));
      }
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "todaysBrief", digest: lines.join("\n") }),
      });
      const json = await res.json();
      if (!res.ok || !json.brief) throw new Error(json.error || "Couldn't generate today's brief.");
      const b = json.brief as TodaysBrief;
      setBrief(b);
      try {
        localStorage.setItem(BRIEF_CACHE_KEY, JSON.stringify({ date: todayISO(), brief: b }));
      } catch {
        // localStorage unavailable — brief still shows for this session, just won't be cached.
      }
    } catch (e) {
      setBriefErr(e instanceof Error ? e.message : "Couldn't generate today's brief.");
    } finally {
      setBriefBusy(false);
    }
  };

  useEffect(() => {
    if (meetings.length === 0) return; // nothing to brief about yet
    try {
      const raw = localStorage.getItem(BRIEF_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { date: string; brief: TodaysBrief };
        if (cached.date === todayISO() && cached.brief) {
          setBrief(cached.brief);
          return;
        }
      }
    } catch {
      // ignore a corrupt/unavailable cache and just regenerate
    }
    generateBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Eyebrow>Welcome back, {self.name}</Eyebrow>
      <h1 className="mb-4 mt-1 text-[26px] font-bold leading-tight tracking-tight">What needs your attention</h1>

      {meetings.length > 0 && (
        <div className={cn(vibrantCard, "mb-[18px] rounded-md bg-accent/40")}>
          <div className="flex items-center justify-between px-3.5 pt-3">
            <span className="text-[13px] font-bold tracking-tight text-foreground">Today&apos;s Brief</span>
            <button
              onClick={generateBrief}
              disabled={briefBusy}
              aria-label="Refresh today's brief"
              className="rounded-md p-1 text-muted-foreground/70 hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              {briefBusy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          </div>

          {briefErr && <div className="px-3.5 pb-3 pt-2 text-[13px] text-warm">{briefErr}</div>}

          {!brief && !briefBusy && !briefErr && (
            <div className="px-3.5 pb-3 pt-2 text-[13px] text-muted-foreground">Preparing your brief…</div>
          )}

          {brief && (
            <div className="px-3.5 pb-3.5 pt-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                <Sparkles className="h-3 w-3" /> Suggested priorities
              </div>
              {brief.priorities.length === 0 ? (
                <div className="mb-3 text-[13px] text-muted-foreground">Nothing urgent stands out.</div>
              ) : (
                <div className="mb-3 rounded-md border border-primary/20 bg-card px-3 py-2.5">
                  <ul className="space-y-1.5">
                    {brief.priorities.map((p, i) => (
                      <li key={i} className="text-[13.5px] leading-snug">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                Open commitments
              </div>
              {briefData.commitments.length === 0 ? (
                <div className="mb-3 text-[13px] text-muted-foreground">Nothing outstanding.</div>
              ) : (
                <div className="mb-3 space-y-1.5">
                  {briefData.commitments.slice(0, 5).map((cm) => (
                    <div
                      key={cm.id}
                      onClick={() => go({ screen: "meeting", id: cm.meeting.id })}
                      className="cursor-pointer rounded-md border border-primary/20 bg-card px-2.5 py-2"
                    >
                      <div className="text-[13.5px] font-medium leading-snug">{cm.text}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[11.5px] font-semibold text-primary">{commitmentLabel(cm, stakeholders)}</span>
                        <DueLabel dueDate={cm.dueDate} due={cm.due} done={cm.status === "done"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
                <AlertTriangle className="h-3 w-3" /> Potential risks &amp; concerns
              </div>
              {briefData.concerns.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">Nothing flagged right now.</div>
              ) : (
                <div className="space-y-1.5">
                  {briefData.concerns.slice(0, 5).map(({ concern, meeting, recurring }) => (
                    <div
                      key={concern.id}
                      onClick={() => go({ screen: "meeting", id: meeting.id })}
                      className="cursor-pointer rounded-md border border-primary/20 bg-card px-2.5 py-2"
                    >
                      <div className="text-[13.5px] font-medium leading-snug">{concern.text}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        {recurring && <span className="text-[11.5px] font-semibold text-warm">Raised again</span>}
                        <span className="text-[11px] text-muted-foreground/70">{meeting.title} · {fmtFull(meeting.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => go({ screen: "search" })}
        className="mb-[18px] flex w-full items-center gap-2 rounded-md bg-secondary px-3.5 py-3 text-sm text-muted-foreground"
      >
        <Search className="h-[17px] w-[17px]" /> Search topics, people, commitments…
      </button>

      <div className="mb-2.5 mt-1 flex items-baseline justify-between">
        <button onClick={() => toggle("section:recentMeetings")} className="flex items-center gap-1">
          <Eyebrow>Recent meetings</Eyebrow>
          {isOpen("section:recentMeetings") ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
        </button>
        <button onClick={() => go({ screen: "meetings" })} className="text-xs font-semibold text-primary">All</button>
      </div>
      {isOpen("section:recentMeetings") && meetings.slice(0, 3).map((m) => (
        <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className={cn(vibrantCard, "mb-2.5 cursor-pointer")}>
          <CardContent>
            <div className="font-semibold">{m.title}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground/70">{fmtFull(m.date)}</div>
            <div className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{m.summary}</div>
          </CardContent>
        </Card>
      ))}

      <button onClick={() => toggle("section:commitments")} className="mb-2.5 mt-1 flex items-center gap-1">
        <Eyebrow>Commitments by stakeholder</Eyebrow>
        {isOpen("section:commitments") ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
      </button>
      {isOpen("section:commitments") && (
        <>
          {open.length === 0 && (
            <Card className="mb-2.5"><CardContent className="text-muted-foreground/70">Nothing outstanding. Clean slate.</CardContent></Card>
          )}
          {groupList.map(([key, items]) => {
            const person = key === "__unassigned" ? null : stakeholderById(stakeholders, key);
            const openState = isOpen(key);
            return (
              <div key={key} className={cn(vibrantCard, "mb-2.5 overflow-hidden rounded-md")}>
                <button
                  className="flex w-full items-center justify-between px-3.5 py-2.5"
                  onClick={() => toggle(key)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tracking-tight text-foreground">{person ? person.name : "Unassigned"}</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{items.length}</span>
                  </span>
                  {openState ? <ChevronDown className="h-4 w-4 text-muted-foreground/60" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
                </button>
                {openState && (
                  <div className="border-t border-primary/20">
                    {items.map((cm) => (
                      <div
                        key={cm.id}
                        className="cursor-pointer border-b border-primary/20 px-3.5 py-2.5 last:border-b-0"
                        onClick={() => go({ screen: "meeting", id: cm.meeting.id })}
                      >
                        <div className="text-[14px] font-medium">{cm.text}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[11.5px] font-semibold text-primary">{commitmentLabel(cm, stakeholders)}</span>
                          <DueLabel dueDate={cm.dueDate} due={cm.due} done={cm.status === "done"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {recent.length > 0 && (
        <>
          <button onClick={() => toggle("section:recentlyUpdated")} className="mb-2.5 mt-1 flex items-center gap-1">
            <Eyebrow>Recently updated</Eyebrow>
            {isOpen("section:recentlyUpdated") ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
          </button>
          {isOpen("section:recentlyUpdated") && recent.map((s) => (
            <Card key={s.id} onClick={() => go({ screen: "stakeholder", id: s.id })} className="mb-2.5 cursor-pointer">
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-[12.5px] text-muted-foreground">{intel(meetings, s.id).exps.length} open expectation(s)</div>
                </div>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground/60" />
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
