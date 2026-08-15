"use client";

import { useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Spinner } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { commitmentLabel, fmtFull, isOverdue, partyName, recurringConcernIds, stakeholderById } from "@/lib/utils";

// Client-side PDF export for a single meeting (v1.10, restructured for AI ingestion in
// v1.10.1). The layout is deliberately built for a parser as much as a human reader — it's
// meant to also work well as source material for tools like NotebookLM that turn documents
// into infographics/mind maps: an upfront numeric "at a glance" block, uniform field-labeled
// lines (Owner: X -> Owed to: Y | Status: ... | text) instead of prose sentences, a
// chronological "Key dates" timeline, and full stakeholder role/relationship data rather
// than a bare name list. Same window.print()-avoidance reasoning as the weekly report export
// (engineering reference, Design Decision #18): the app runs as an installed/standalone PWA,
// where window.print() is unreliable on iOS.
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
      doc.setProperties({
        title: m.title,
        subject: "Orbit meeting export",
        author: "Orbit",
        keywords: m.topics.join(", "),
      });

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

      // 1. At-a-glance stats — plain "Label: N" lines, not prose. Infographic tools turn
      // numbers like this directly into stat tiles/charts; reconstructing them by counting
      // bullets elsewhere in the document is exactly what this section saves a parser from
      // having to do.
      const openExpectations = m.expectations.filter((e) => e.status !== "met").length;
      const openCommitments = m.commitments.filter((c) => c.status !== "done").length;
      const overdueCommitments = m.commitments.filter((c) => c.status !== "done" && isOverdue(c.dueDate)).length;
      const doneCommitments = m.commitments.filter((c) => c.status === "done").length;
      const recurringIds = recurringConcernIds(meetings, m.id);
      addTitle("At a glance", 13, 18);
      addBody(`Open commitments: ${openCommitments}${overdueCommitments ? ` (${overdueCommitments} overdue)` : ""}`);
      if (doneCommitments) addBody(`Completed commitments: ${doneCommitments}`);
      addBody(`Open expectations: ${openExpectations}`);
      addBody(`Concerns raised: ${m.concerns.length}${recurringIds.size ? ` (${recurringIds.size} recurring)` : ""}`);
      addBody(`Decisions recorded: ${m.decisions.length}`);
      addBody(`Action items: ${m.actionItems.length}`);

      if (m.summary) {
        y += 10;
        addTitle("Executive summary", 13, 18);
        addBody(m.summary);
      }

      addSection("Topics", m.topics);

      // 2 & 3. Uniform field-labeled lines instead of prose sentences — every expectation/
      // commitment/concern follows the same "Field: value | Field: value | text" shape, so a
      // parser can treat each bullet as a row rather than having to extract meaning from a
      // sentence.
      addSection(
        "Expectations",
        m.expectations.map((e) => {
          const who = e.stakeholderId ? stakeholderById(stakeholders, e.stakeholderId)?.name ?? "Unspecified" : "Unspecified";
          return `Stakeholder: ${who} | Status: ${e.status === "met" ? "Met" : "Open"} | ${e.text}`;
        })
      );

      addSection(
        "Commitments",
        m.commitments.map((c) => {
          const due = c.dueDate ? fmtFull(c.dueDate) : c.due || "None";
          return `Owner: ${partyName(stakeholders, c.ownerId)} → Owed to: ${partyName(stakeholders, c.owedToId)} | Status: ${c.status === "done" ? "Done" : "Open"} | Due: ${due} | ${c.text}`;
        })
      );

      addSection(
        "Concerns",
        m.concerns.map((c) => {
          const who = c.stakeholderId ? stakeholderById(stakeholders, c.stakeholderId)?.name ?? "Unspecified" : "Unspecified";
          return `Stakeholder: ${who} | Recurring: ${recurringIds.has(c.id) ? "Yes" : "No"} | ${c.text}`;
        })
      );

      addSection("Decisions", m.decisions);
      addSection("Action items", m.actionItems);

      // 4. A dedicated chronological timeline of every dated commitment — ready-made
      // material for a timeline-style infographic, rather than dates scattered through the
      // Commitments section above.
      const timeline = m.commitments
        .filter((c) => c.dueDate)
        .slice()
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
        .map((c) => `${fmtFull(c.dueDate)} — ${c.text} (${commitmentLabel(c, stakeholders)}, ${c.status === "done" ? "done" : "open"})`);
      addSection("Key dates", timeline);

      // 2. Full stakeholder rows (name/title/relationship), not just a bare name list — real
      // fields for a relationship or org-chart diagram instead of unstructured text.
      const mentionedStakeholders = m.mentioned
        .map((sid) => stakeholderById(stakeholders, sid))
        .filter((s): s is NonNullable<typeof s> => !!s);
      addSection(
        "Stakeholders",
        mentionedStakeholders.map((s) => `${s.name} — ${s.title || "—"} — ${s.relationship}`)
      );

      if (includeTranscript && m.transcript) {
        doc.addPage();
        y = margin;
        addTitle("Transcript", 15, 22);
        addBody(m.transcript, 10);
      }

      // 6. Page numbers + a footer stamp on every page.
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(140);
        doc.text(`Orbit meeting export · ${fmtFull(m.date)}`, margin, doc.internal.pageSize.getHeight() - 24);
        doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 24, { align: "right" });
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
        Builds a structured PDF of this meeting — an at-a-glance stats summary, topics, expectations,
        commitments, concerns, decisions, action items, a dated timeline, and full stakeholder details —
        ready to save, share, or feed into tools like NotebookLM.
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
