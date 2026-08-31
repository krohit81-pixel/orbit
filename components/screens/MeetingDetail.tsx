"use client";

import { useState } from "react";
import { ArrowLeft, CircleDot, CheckCircle2, Pencil, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, SectionTitle, SourceQuote, DueLabel, vibrantCard, Spinner } from "@/components/bits";
import { CommitmentUpdates } from "@/components/CommitmentUpdates";
import { MeetingSnapshot } from "@/components/MeetingSnapshot";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { cn, fmtFull, stakeholderById, commitmentLabel } from "@/lib/utils";

export function MeetingScreen({ id }: { id: string }) {
  const { meetings, stakeholders, toggleCommitment, resolveConcern, reopenConcern } = useOrbit();
  const { go } = useFlow();
  const [showTranscript, setShowTranscript] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const m = meetings.find((x) => x.id === id);
  if (!m) return <div className="py-10 text-center text-muted-foreground">Meeting not found.</div>;

  const doToggle = async (commId: string) => {
    setPending((p) => new Set(p).add(commId));
    try {
      await toggleCommitment(m.id, commId);
    } finally {
      setPending((p) => { const next = new Set(p); next.delete(commId); return next; });
    }
  };

  const doResolveConcern = async (concernId: string, resolution: "mitigated" | "no_longer_relevant") => {
    setPending((p) => new Set(p).add(concernId));
    try {
      await resolveConcern(m.id, concernId, resolution);
    } finally {
      setPending((p) => { const next = new Set(p); next.delete(concernId); return next; });
    }
  };

  const doReopenConcern = async (concernId: string) => {
    setPending((p) => new Set(p).add(concernId));
    try {
      await reopenConcern(m.id, concernId);
    } finally {
      setPending((p) => { const next = new Set(p); next.delete(concernId); return next; });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button onClick={() => go({ screen: "meetings" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-4">
          <button onClick={() => go({ screen: "meetingPrint", id })} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
            <Printer className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => go({ screen: "editMeeting", id })} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{m.title}</div>
      <div className="mb-3.5 mt-0.5 text-[13px] text-muted-foreground/70">{fmtFull(m.date)}</div>

      <Card className="mb-[18px] bg-accent/40">
        <CardContent>
          <Eyebrow>Executive summary</Eyebrow>
          <div className="mt-2 text-[16px] leading-relaxed">{m.summary}</div>
          <MeetingSnapshot meeting={m} />
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
            <Card key={e.id} className={cn(vibrantCard, "mb-2.5")}><CardContent>
              {e.stakeholderId && (
                <div className="mb-1 text-[11.5px] font-semibold text-primary">
                  {stakeholderById(stakeholders, e.stakeholderId)?.name}
                </div>
              )}
              <div className="font-semibold">{e.text}</div>
              <SourceQuote>{e.source}</SourceQuote>
            </CardContent></Card>
          ))}
        </div>
      )}

      {m.commitments.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Commitments</SectionTitle>
          {m.commitments.map((cm) => (
            <Card key={cm.id} className={cn(vibrantCard, "mb-2.5")}><CardContent className="flex items-start gap-2.5">
              <button className="mt-0.5" onClick={() => doToggle(cm.id)} disabled={pending.has(cm.id)} aria-label="Toggle done">
                {pending.has(cm.id) ? (
                  <Spinner className="h-5 w-5 text-muted-foreground/60" />
                ) : cm.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ring))]" />
                ) : (
                  <CircleDot className="h-5 w-5 text-muted-foreground/60" />
                )}
              </button>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[11.5px] font-semibold text-primary">{commitmentLabel(cm, stakeholders)}</span>
                  <DueLabel dueDate={cm.dueDate} due={cm.due} done={cm.status === "done"} />
                </div>
                <div className={cm.status === "done" ? "font-semibold text-muted-foreground/60 line-through" : "font-semibold"}>{cm.text}</div>
                <SourceQuote>{cm.source}</SourceQuote>
                <CommitmentUpdates meetingId={m.id} commitment={cm} />
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {m.concerns.length > 0 && (
        <div className="mb-[18px]">
          <SectionTitle>Concerns</SectionTitle>
          {m.concerns.map((e) => {
            const resolved = e.status === "resolved";
            const busy = pending.has(e.id);
            return (
              <Card key={e.id} className={cn(vibrantCard, "mb-2.5")}><CardContent>
                <div className="flex items-start justify-between gap-2">
                  <div className={cn("font-semibold", resolved && "text-muted-foreground/60 line-through")}>{e.text}</div>
                  {resolved && (
                    <Badge variant="default" className="shrink-0">
                      {e.resolution === "mitigated" ? "Mitigated" : "No longer a concern"}
                    </Badge>
                  )}
                </div>
                <SourceQuote>{e.source}</SourceQuote>
                {/* Buried, not deleted (v1.17): resolving drops it from Today's Brief, the
                    weekly report's open concerns, and relationship-health scoring, but it
                    stays here on the meeting record — still visible, still searchable — in
                    case it's worth looking back at. Reopen undoes it in one tap. */}
                {resolved ? (
                  <button
                    onClick={() => doReopenConcern(e.id)}
                    disabled={busy}
                    className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-primary disabled:opacity-50"
                  >
                    {busy ? <Spinner className="h-3.5 w-3.5" /> : null} Reopen
                  </button>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => doResolveConcern(e.id, "mitigated")}
                      disabled={busy}
                      className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-muted-foreground hover:border-success hover:text-success disabled:opacity-50"
                    >
                      Mitigated
                    </button>
                    <button
                      onClick={() => doResolveConcern(e.id, "no_longer_relevant")}
                      disabled={busy}
                      className="rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-muted-foreground hover:border-success hover:text-success disabled:opacity-50"
                    >
                      No longer a concern
                    </button>
                    {busy && <Spinner className="h-4 w-4 self-center text-muted-foreground/60" />}
                  </div>
                )}
              </CardContent></Card>
            );
          })}
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
