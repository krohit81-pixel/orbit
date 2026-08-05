"use client";

import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileDown, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionTitle, Spinner, vibrantCard } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  cn, commitmentLabel, fmtFull, fmtWeekRange, startOfWeek, addDaysISO, todayISO, weeklyReportData,
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
        doc.text(text, margin, y);
        y += gap;
      };
      const addBody = (text: string, size = 11) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, width) as string[];
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

      addTitle("Orbit — Weekly report", 18, 26);
      addBody(weekLabel);
      y += 6;
      addTitle("Overview", 13, 18);
      addBody(report.overview);
      addSection("Key focus areas", report.focusAreas);
      addSection("Key accomplishments", report.accomplishments);
      addSection("Key deliverables — upcoming week", report.upcoming);

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
        What was covered this week, key focus areas, key accomplishments, and what&apos;s due next week — generated from your logged meetings.
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
          <Card className={cn(vibrantCard, "mb-4 mt-4 bg-accent/40")}><CardContent>
            <Eyebrow>Overview</Eyebrow>
            <div className="mt-2 text-[15px] leading-relaxed">{report.overview}</div>
          </CardContent></Card>

          {report.focusAreas.length > 0 && (
            <div className="mb-4">
              <SectionTitle>Key focus areas</SectionTitle>
              {report.focusAreas.map((t, i) => (
                <Card key={i} className={cn(vibrantCard, "mb-2")}><CardContent className="text-[13.5px]">{t}</CardContent></Card>
              ))}
            </div>
          )}
          {report.accomplishments.length > 0 && (
            <div className="mb-4">
              <SectionTitle>Key accomplishments</SectionTitle>
              {report.accomplishments.map((t, i) => (
                <Card key={i} className={cn(vibrantCard, "mb-2")}><CardContent className="text-[13.5px]">{t}</CardContent></Card>
              ))}
            </div>
          )}
          {report.upcoming.length > 0 && (
            <div className="mb-4">
              <SectionTitle>Key deliverables — upcoming week</SectionTitle>
              {report.upcoming.map((t, i) => (
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
