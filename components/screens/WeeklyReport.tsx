"use client";

import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DueLabel, Eyebrow, SectionTitle, Spinner, vibrantCard } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  cn, commitmentLabel, fmtFull, fmtWeekRange, startOfWeek, addDaysISO, todayISO, sanitizeForPdf, weeklyReportData,
} from "@/lib/utils";
import type { WeeklyReport } from "@/lib/types";

export function WeeklyReportScreen() {
  const { meetings, stakeholders } = useOrbit();
  const { go } = useFlow();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [exporting, setExporting] = useState(false);

  const data = weeklyReportData(meetings, weekStart);
  const weekLabel = fmtWeekRange(weekStart);
  const isCurrentWeek = weekStart >= startOfWeek(todayISO());

  const shiftWeek = (deltaDays: number) => {
    setWeekStart((w) => addDaysISO(w, deltaDays));
    setReport(null);
    setErr("");
  };

  const generate = async () => {
    setErr("");
    setBusy(true);
    setReport(null);
    try {
      const lines: string[] = [`Week: ${weekLabel}`];
      if (data.meetings.length === 0) {
        lines.push("No meetings were logged this week.");
      } else {
        lines.push(`Meetings held (${data.meetings.length}):`);
        data.meetings.forEach((m) => lines.push(`- ${fmtFull(m.date)}: ${m.title} — ${m.summary}`));
      }
      if (data.topics.length) lines.push(`Topics raised: ${data.topics.join(", ")}`);
      if (data.decisions.length) lines.push(`Decisions: ${data.decisions.join("; ")}`);
      if (data.actionItems.length) lines.push(`Action items: ${data.actionItems.join("; ")}`);
      if (data.completed.length) {
        lines.push(`Commitments completed this week: ${data.completed.map((c) => `${c.text} (${commitmentLabel(c, stakeholders)})`).join("; ")}`);
      }
      if (data.upcoming.length) {
        lines.push(`Commitments you owe, due the following week: ${data.upcoming.map((c) => `${c.text} (${commitmentLabel(c, stakeholders)}${c.dueDate ? `, due ${fmtFull(c.dueDate)}` : ""})`).join("; ")}`);
      }
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "weeklyReport", weekLabel, digest: lines.join("\n") }),
      });
      const json = await res.json();
      if (!res.ok || !json.report) throw new Error(json.error || "Couldn't generate the report.");
      setReport(json.report as WeeklyReport);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't generate the report.");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageBottom = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      const addTitle = (text: string, size: number, gap: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(size);
        doc.text(sanitizeForPdf(text), margin, y);
        y += gap;
      };
      const addBody = (text: string, size = 11) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(sanitizeForPdf(text), width) as string[];
        lines.forEach((line) => {
          if (y > pageBottom) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += size * 1.4;
        });
      };
      const addSection = (heading: string, items: string[]) => {
        if (!items.length) return;
        y += 10;
        addTitle(heading, 13, 18);
        items.forEach((it) => addBody(`•  ${it}`));
      };
      const addSubheading = (text: string) => addBody(text, 11.5);

      addTitle("Orbit — Weekly status report", 18, 26);
      addBody(weekLabel);

      addSection("What was achieved", report.achieved);

      // Pending commitments + open concerns are rendered straight from real data, never
      // through the LLM — same "deterministic facts, nothing to restate" pattern Today's
      // Brief's concerns already use (see master context §5).
      y += 10;
      addTitle("What was pending / open concerns", 13, 18);
      addSubheading(data.pending.length ? "Pending commitments:" : "Pending commitments: none open.");
      data.pending.forEach((c) => {
        const due = c.dueDate ? `, due ${fmtFull(c.dueDate)}` : c.due ? `, due ${c.due}` : "";
        addBody(`•  ${c.text} (${commitmentLabel(c, stakeholders)}${due})`);
      });
      y += 4;
      addSubheading(data.openConcerns.length ? "Open concerns:" : "Open concerns: none raised this week.");
      data.openConcerns.forEach(({ concern, meeting, recurring }) => {
        addBody(`•  ${concern.text}${recurring ? " — raised again" : ""} (${meeting.title})`);
      });

      addSection("Focus for future", report.focusForFuture);

      doc.save(`orbit-weekly-report-${data.start}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3">
        <button onClick={() => go({ screen: "home" })} aria-label="Back to app"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Weekly report</div>
      </div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
        A few-words status update for the week: what was achieved, what&apos;s pending or concerning, and what&apos;s next — generated from your logged meetings.
      </p>

      <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5">
        <button onClick={() => shiftWeek(-7)} aria-label="Previous week"><ChevronLeft className="h-5 w-5 text-muted-foreground/70" /></button>
        <div className="text-[13.5px] font-semibold">{weekLabel}</div>
        <button onClick={() => shiftWeek(7)} aria-label="Next week" disabled={isCurrentWeek} className="disabled:opacity-30">
          <ChevronRight className="h-5 w-5 text-muted-foreground/70" />
        </button>
      </div>

      <div className="mb-4 text-[13px] text-muted-foreground">
        {data.meetings.length} meeting{data.meetings.length === 1 ? "" : "s"} logged this week.
      </div>

      <Button className="w-full" onClick={generate} disabled={busy}>
        {busy ? <Spinner className="text-primary-foreground" /> : <Sparkles className="h-[18px] w-[18px]" />}
        {busy ? "Generating…" : "Generate report"}
      </Button>

      {err && <div className="mt-2.5 text-[13px] text-warm">{err}</div>}

      {report && (
        <>
          {report.achieved.length > 0 && (
            <div className="mb-4 mt-4">
              <SectionTitle>What was achieved</SectionTitle>
              {report.achieved.map((t, i) => (
                <Card key={i} className={cn(vibrantCard, "mb-2")}><CardContent className="text-[13.5px]">{t}</CardContent></Card>
              ))}
            </div>
          )}

          <div className="mb-4">
            <SectionTitle>What was pending / open concerns</SectionTitle>
            <Eyebrow>Pending commitments</Eyebrow>
            {data.pending.length === 0 ? (
              <div className="mb-2 mt-1.5 text-[13px] text-muted-foreground">Nothing open right now.</div>
            ) : (
              <div className="mt-1.5">
                {data.pending.map((c) => (
                  <Card
                    key={c.id}
                    onClick={() => go({ screen: "meeting", id: c.meeting.id })}
                    className={cn(vibrantCard, "mb-2 cursor-pointer")}
                  ><CardContent>
                    <DueLabel dueDate={c.dueDate} due={c.due} done={c.status === "done"} className="mb-1 block" />
                    <div className="text-[13.5px] font-medium leading-snug">{c.text}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/70">{commitmentLabel(c, stakeholders)}</div>
                  </CardContent></Card>
                ))}
              </div>
            )}

            <Eyebrow>Open concerns</Eyebrow>
            {data.openConcerns.length === 0 ? (
              <div className="mt-1.5 text-[13px] text-muted-foreground">Nothing flagged this week.</div>
            ) : (
              <div className="mt-1.5">
                {data.openConcerns.map(({ concern, meeting, recurring }) => (
                  <Card
                    key={concern.id}
                    onClick={() => go({ screen: "meeting", id: meeting.id })}
                    className={cn(vibrantCard, "mb-2 cursor-pointer")}
                  ><CardContent>
                    <div className="text-[13.5px] font-medium leading-snug">{concern.text}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {recurring && <span className="text-[11.5px] font-semibold text-warm">Raised again</span>}
                      <span className="text-[11px] text-muted-foreground/70">{meeting.title} · {fmtFull(meeting.date)}</span>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>

          {report.focusForFuture.length > 0 && (
            <div className="mb-4">
              <SectionTitle>Focus for future</SectionTitle>
              {report.focusForFuture.map((t, i) => (
                <Card key={i} className={cn(vibrantCard, "mb-2")}><CardContent className="text-[13.5px]">{t}</CardContent></Card>
              ))}
            </div>
          )}

          <Button variant="secondary" className="mt-2 w-full" onClick={exportPdf} disabled={exporting}>
            {exporting ? <Spinner /> : <FileDown className="h-[18px] w-[18px]" />}
            {exporting ? "Preparing PDF…" : "View / save PDF"}
          </Button>
        </>
      )}
    </div>
  );
}
