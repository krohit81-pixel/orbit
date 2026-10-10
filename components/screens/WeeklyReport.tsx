"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, FileDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Panel, PanelEmpty, Spinner } from "@/components/bits";
import { ActionRow } from "@/components/ActionRow";
import { WatchRow } from "@/components/WatchRow";
import type { HueKey } from "@/lib/hues";
import { useOrbit } from "@/components/OrbitStore";
import {
  commitmentLabel, fmtFull, fmtWeekRange, startOfWeek, addDaysISO, todayISO, sanitizeForPdf, weeklyReportData,
} from "@/lib/utils";
import type { WeeklyReport } from "@/lib/types";

export function WeeklyReportScreen() {
  const { meetings, stakeholders } = useOrbit();
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

      addTitle("Orbit — Weekly recap", 18, 26);
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

  const summaryPanel = (title: string, items: string[] | undefined, hue: HueKey) => (
    <Panel hue={hue} title={<><Sparkles className="h-3.5 w-3.5 text-accent-foreground" /> {title}</>}>
      {items === undefined ? <PanelEmpty>Tap “Write summary” to draft this section.</PanelEmpty>
        : items.length === 0 ? <PanelEmpty>Nothing to report.</PanelEmpty>
        : <ul className="flex list-disc flex-col gap-1.5 pb-3.5 pl-[34px] pr-4">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>}
    </Panel>
  );

  // Weekly recap (v2.0 layout of the v1.13 report): "Pending" and "Raised this week" render
  // live from real data; only the two summary sections come from the model, on request.
  return (
    <div className="max-w-[760px]">
      <PageHead
        eyebrow="Weekly recap"
        title={weekLabel}
        right={<>
          <Button variant="secondary" size="sm" onClick={generate} disabled={busy}>
            {busy ? <><Spinner className="h-3.5 w-3.5" /> Writing…</> : <><Sparkles className="h-3.5 w-3.5" /> {report ? "Rewrite" : "Write"} summary</>}
          </Button>
          <Button variant="secondary" size="sm" onClick={exportPdf} disabled={!report || exporting} title={report ? undefined : "Write the summary first"}>
            {exporting ? <Spinner className="h-3.5 w-3.5" /> : <FileDown className="h-3.5 w-3.5" />} PDF
          </Button>
        </>}
      />
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
        <button onClick={() => shiftWeek(-7)} aria-label="Previous week" className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-[13px] text-muted-foreground">{data.meetings.length} meeting{data.meetings.length === 1 ? "" : "s"} logged this week</span>
        <button onClick={() => shiftWeek(7)} aria-label="Next week" disabled={isCurrentWeek} className="rounded-md p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
      </div>
      {err && <div className="mb-3 text-[13px] text-warm">{err}</div>}
      <div className="flex flex-col gap-4">
        {summaryPanel("Achieved", report?.achieved, "green")}
        <Panel hue="orange" title="Pending" count={data.pending.length}>
          {data.pending.length ? data.pending.map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} />) : <PanelEmpty>Nothing overdue or due in the next 7 days.</PanelEmpty>}
        </Panel>
        <Panel hue="violet" title={<><Eye className="h-3.5 w-3.5" /> Raised this week</>} count={data.openConcerns.length}>
          {data.openConcerns.length ? data.openConcerns.map(({ concern, meeting, recurring }) => <WatchRow key={concern.id} concern={concern} meeting={meeting} recurring={recurring} />)
            : <PanelEmpty>No new concerns this week.</PanelEmpty>}
        </Panel>
        {summaryPanel("Focus next week", report?.focusForFuture, "blue")}
      </div>
    </div>
  );
}
