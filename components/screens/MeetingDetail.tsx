"use client";

import { useState } from "react";
import { ArrowLeft, CircleDot, CheckCircle2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, SectionTitle, SourceQuote, DueLabel } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { fmtFull, stakeholderById, commitmentLabel } from "@/lib/utils";

export function MeetingScreen({ id }: { id: string }) {
  const { meetings, stakeholders, toggleCommitment } = useOrbit();
  const { go } = useFlow();
  const [showTranscript, setShowTranscript] = useState(false);
  const m = meetings.find((x) => x.id === id);
  if (!m) return <div className="py-10 text-center text-muted-foreground">Meeting not found.</div>;

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button onClick={() => go({ screen: "meetings" })}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => go({ screen: "editMeeting", id })} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
      <div className="text-2xl font-bold tracking-tight">{m.title}</div>
      <div className="mb-3.5 mt-0.5 text-[13px] text-muted-foreground/70">{fmtFull(m.date)}</div>

      <Card className="mb-[18px] bg-accent/40">
        <CardContent>
          <Eyebrow>Executive summary</Eyebrow>
          <div className="mt-2 text-[16px] leading-relaxed">{m.summary}</div>
        </CardContent>
      </Card>

      {m.topics.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Topics</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{m.topics.map((t, i) => <Badge key={i} variant="accent">{t}</Badge>)}</div>
        </div>
      )}

      {m.expectations.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Expectations</SectionTitle>
          {m.expectations.map((e) => (
            <Card key={e.id} className="mb-2.5"><CardContent>
              <div className="flex justify-between gap-2">
                <div className="font-semibold">{e.text}</div>
                {e.stakeholderId && (
                  <span className="shrink-0 text-[12px] font-medium text-muted-foreground">
                    {stakeholderById(stakeholders, e.stakeholderId)?.name}
                  </span>
                )}
              </div>
              <SourceQuote>{e.source}</SourceQuote>
            </CardContent></Card>
          ))}
        </div>
      )}

      {m.commitments.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Commitments</SectionTitle>
          {m.commitments.map((cm) => (
            <Card key={cm.id} className="mb-2.5"><CardContent className="flex items-start gap-2.5">
              <button className="mt-0.5" onClick={() => toggleCommitment(m.id, cm.id)} aria-label="Toggle done">
                {cm.status === "done" ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ring))]" /> : <CircleDot className="h-5 w-5 text-muted-foreground/60" />}
              </button>
              <div className="flex-1">
                <div className={cm.status === "done" ? "font-semibold text-muted-foreground/60 line-through" : "font-semibold"}>{cm.text}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground">{commitmentLabel(cm, stakeholders)}</span>
                  <DueLabel dueDate={cm.dueDate} due={cm.due} />
                </div>
                <SourceQuote>{cm.source}</SourceQuote>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {m.concerns.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Concerns</SectionTitle>
          {m.concerns.map((e) => (
            <Card key={e.id} className="mb-2.5"><CardContent>
              <div className="font-semibold">{e.text}</div>
              <SourceQuote>{e.source}</SourceQuote>
            </CardContent></Card>
          ))}
        </div>
      )}

      {m.decisions.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Decisions</SectionTitle>
          {m.decisions.map((d, i) => <Card key={i} className="mb-2"><CardContent className="font-semibold">{d}</CardContent></Card>)}
        </div>
      )}

      {m.mentioned.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Stakeholders mentioned</SectionTitle>
          <div className="text-[12.5px] text-muted-foreground">
            {m.mentioned.map((sid) => stakeholderById(stakeholders, sid)?.name).filter(Boolean).join(" · ")}
          </div>
        </div>
      )}

      {m.transcript && (
        <div className="mb-[18px]">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setShowTranscript((v) => !v)}
          >
            <Eyebrow>Meeting transcript</Eyebrow>
            {showTranscript ? <ChevronUp className="h-4 w-4 text-muted-foreground/70" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/70" />}
          </button>
          {showTranscript && (
            <Card className="mt-2.5"><CardContent>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{m.transcript}</div>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
