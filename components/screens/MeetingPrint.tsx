"use client";

import { useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Spinner } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { commitmentLabel, fmtFull, stakeholderById } from "@/lib/utils";

// Client-side PDF export for a single meeting (v1.10) — same reasoning as the weekly
// report's export (see engineering reference, Design Decision #18): the app runs in
// display: standalone as a bookmarked/installed PWA, where window.print() is unreliable,
// especially on iOS. jsPDF is dynamically imported so it only loads when this screen's
// export button is actually used.
export function MeetingPrintScreen({ id }: { id: string }) {
  const { meetings, stakeholders } = useOrbit();
  const { go } = useFlow();
  const m = meetings.find((x) => x.id === id);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [exporting, setExporting] = useState(false);

  if (!m) return <div className="py-10 text-center text-muted-foreground">Meeting not found.</div>;

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const pageBottom = doc.internal.pageSize.getHeight() - margin;
      let y = margin;

      const ensureRoom = (needed: number) => {
        if (y + needed > pageBottom) { doc.addPage(); y = margin; }
      };
      const addTitle = (text: string, size: number, gap: number) => {
        ensureRoom(size * 1.4);
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
          ensureRoom(size * 1.4);
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

      addTitle(m.title, 18, 26);
      addBody(fmtFull(m.date));
      y += 6;

      if (m.summary) {
        addTitle("Executive summary", 13, 18);
        addBody(m.summary);
      }

      addSection("Topics", m.topics);

      addSection(
        "Expectations",
        m.expectations.map((e) => {
          const who = e.stakeholderId ? stakeholderById(stakeholders, e.stakeholderId)?.name : null;
          return `${who ? `${who}: ` : ""}${e.text}${e.status === "met" ? " (met)" : ""}`;
        })
      );

      addSection(
        "Commitments",
        m.commitments.map((c) => {
          const due = c.dueDate ? `due ${fmtFull(c.dueDate)}` : c.due || "no due date";
          return `${c.text} — ${commitmentLabel(c, stakeholders)}, ${due}${c.status === "done" ? " (done)" : ""}`;
        })
      );

      addSection(
        "Concerns",
        m.concerns.map((c) => {
          const who = c.stakeholderId ? stakeholderById(stakeholders, c.stakeholderId)?.name : null;
          return `${who ? `${who}: ` : ""}${c.text}`;
        })
      );

      addSection("Decisions", m.decisions);
      addSection("Action items", m.actionItems);

      const mentionedNames = m.mentioned.map((sid) => stakeholderById(stakeholders, sid)?.name).filter((n): n is string => !!n);
      if (mentionedNames.length) {
        y += 10;
        addTitle("Stakeholders mentioned", 13, 18);
        addBody(mentionedNames.join(", "));
      }

      if (includeTranscript && m.transcript) {
        doc.addPage();
        y = margin;
        addTitle("Transcript", 15, 22);
        addBody(m.transcript, 10);
      }

      const safeName = m.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60);
      doc.save(`orbit-meeting-${m.date}-${safeName}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3">
        <button onClick={() => go({ screen: "meeting", id })} aria-label="Back to meeting"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[22px] font-bold tracking-tight">Export meeting</div>
      </div>

      <div className="mb-5 rounded-md border border-border bg-card px-3.5 py-3">
        <Eyebrow>Meeting</Eyebrow>
        <div className="mt-1 font-semibold">{m.title}</div>
        <div className="text-[12.5px] text-muted-foreground/70">{fmtFull(m.date)}</div>
      </div>

      <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
        Builds a structured PDF of this meeting — summary, topics, expectations, commitments, concerns,
        decisions, and action items — ready to save or share.
      </p>

      <label className="mb-5 flex items-start gap-2.5 rounded-md border border-border bg-card px-3.5 py-3">
        <input
          type="checkbox"
          checked={includeTranscript}
          onChange={(e) => setIncludeTranscript(e.target.checked)}
          disabled={!m.transcript}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          <span className="block text-[13.5px] font-medium">Include full transcript</span>
          <span className="block text-[12px] text-muted-foreground/70">
            {m.transcript
              ? "Transcripts can run long — leave this unchecked for a shorter, summary-only PDF."
              : "This meeting has no saved transcript."}
          </span>
        </span>
      </label>

      <Button className="w-full" onClick={exportPdf} disabled={exporting}>
        {exporting ? <Spinner className="text-primary-foreground" /> : <FileDown className="h-[18px] w-[18px]" />}
        {exporting ? "Preparing PDF…" : "Download PDF"}
      </Button>
    </div>
  );
}
