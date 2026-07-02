"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, Circle, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, SectionTitle, SourceQuote, DueLabel } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { intel, trajectory, fmtFull, fmtStamp, stakeholderById } from "@/lib/utils";

export function StakeholderScreen({ id }: { id: string }) {
  const { stakeholders, meetings, setSummary } = useOrbit();
  const { go } = useFlow();
  const [busy, setBusy] = useState(false);

  const s = stakeholderById(stakeholders, id);
  if (!s) return <div className="py-10 text-center text-muted-foreground">Stakeholder not found.</div>;
  const it = intel(meetings, id);
  const steps = trajectory(meetings, id);

  const regenerate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const asc = [...steps].reverse();
      const history = asc
        .map((st) => {
          const parts: string[] = [`${fmtFull(st.meeting.date)} — ${st.meeting.title}.`];
          if (st.newTopics.length) parts.push(`New topics: ${st.newTopics.join(", ")}.`);
          if (st.expectations.length) parts.push(`Expectations: ${st.expectations.map((e) => e.text).join("; ")}.`);
          if (st.freshConcerns.length) parts.push(`New concerns: ${st.freshConcerns.map((c) => c.text).join("; ")}.`);
          if (st.recurringConcerns.length) parts.push(`Recurring concerns: ${st.recurringConcerns.map((c) => c.text).join("; ")}.`);
          if (st.youCommitted.length) parts.push(`You committed: ${st.youCommitted.map((c) => c.text).join("; ")}.`);
          if (st.theyCommitted.length) parts.push(`They committed: ${st.theyCommitted.map((c) => c.text).join("; ")}.`);
          return parts.join(" ");
        })
        .join("\n");
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "synthesize", name: s.name, history }),
      });
      const data = await res.json();
      if (data.summary) await setSummary(id, data.summary);
    } catch {
      /* keep existing summary on failure */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <button onClick={() => go({ screen: "people" })}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => go({ screen: "editStakeholder", id })} className="flex items-center gap-1 text-[13px] font-semibold text-primary">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
      <div className="text-2xl font-bold tracking-tight">{s.name}</div>
      <div className="mt-0.5 text-sm text-muted-foreground">{s.title}</div>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="accent">{s.relationship}</Badge>
        {s.reportsTo && stakeholderById(stakeholders, s.reportsTo) && (
          <span className="text-[12.5px] text-muted-foreground">Reports to {stakeholderById(stakeholders, s.reportsTo)?.name}</span>
        )}
      </div>

      <Card className="mb-4 mt-3 bg-accent/40"><CardContent>
        <div className="flex items-center justify-between">
          <Eyebrow>Relationship summary</Eyebrow>
          <button onClick={regenerate} className="flex items-center gap-1 text-[11px] font-semibold text-primary disabled:opacity-50" disabled={busy}>
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> {busy ? "Synthesizing…" : "Regenerate"}
          </button>
        </div>
        <div className="mt-2 text-[15px] leading-relaxed">{s.summary}</div>
        <div className="mt-2.5 text-[11px] text-muted-foreground/60">
          {s.summaryGeneratedAt ? `Synthesized ${fmtStamp(s.summaryGeneratedAt)} · ${it.interactions.length} interaction(s)` : `Based on ${it.interactions.length} interaction(s)`}
        </div>
      </CardContent></Card>

      {it.cares.length > 0 && (
        <div className="mb-4">
          <SectionTitle>What they care about</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{it.cares.map((t, i) => <Badge key={i} variant="accent">{t}</Badge>)}</div>
        </div>
      )}

      {/* Trajectory — the evolution over time */}
      <SectionTitle>Trajectory</SectionTitle>
      {steps.length === 0 && <div className="mb-4 text-muted-foreground/70">No interactions yet.</div>}
      <div className="relative mb-5 pl-1">
        {steps.map((st, idx) => (
          <div key={st.meeting.id} className="relative pb-4 pl-6">
            {idx < steps.length - 1 && <div className="absolute left-[7px] top-3 h-full w-px bg-border" />}
            <Circle className="absolute left-0 top-[5px] h-3.5 w-3.5 fill-card text-primary" strokeWidth={2.5} />
            <button onClick={() => go({ screen: "meeting", id: st.meeting.id })} className="block text-left">
              <div className="text-[13px] font-semibold">{st.meeting.title}</div>
              <div className="text-[11.5px] text-muted-foreground/70">{fmtFull(st.meeting.date)}{st.first ? " · first interaction" : ""}</div>
            </button>
            <div className="mt-1.5 space-y-1">
              {st.newTopics.map((t, i) => (
                <div key={`t${i}`} className="text-[12.5px] text-muted-foreground"><span className="font-semibold text-foreground">New focus:</span> {t}</div>
              ))}
              {st.expectations.map((e) => (
                <div key={e.id} className="text-[12.5px] text-muted-foreground"><span className="font-semibold text-foreground">Expects:</span> {e.text}</div>
              ))}
              {st.freshConcerns.map((cn) => (
                <div key={cn.id} className="text-[12.5px] text-muted-foreground"><span className="font-semibold text-warm">New concern:</span> {cn.text}</div>
              ))}
              {st.recurringConcerns.map((cn) => (
                <div key={cn.id} className="text-[12.5px] text-muted-foreground"><span className="font-semibold text-warm">Raised again:</span> {cn.text}</div>
              ))}
              {st.youCommitted.map((cm) => (
                <div key={cm.id} className="text-[12.5px] text-muted-foreground">
                  <span className="font-semibold text-foreground">You committed:</span> {cm.text}{cm.status === "done" ? " · fulfilled" : ""}
                </div>
              ))}
              {st.theyCommitted.map((cm) => (
                <div key={cm.id} className="text-[12.5px] text-muted-foreground">
                  <span className="font-semibold text-foreground">They committed:</span> {cm.text}{cm.status === "done" ? " · done" : ""}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {it.exps.length > 0 && (
        <div className="mb-4">
          <SectionTitle>Open expectations from you</SectionTitle>
          {it.exps.map(({ e, meeting }) => (
            <Card key={e.id} className="mb-2.5"><CardContent>
              <div className="font-semibold">{e.text}</div>
              <SourceQuote>{e.source}</SourceQuote>
              <button onClick={() => go({ screen: "meeting", id: meeting.id })} className="mt-1.5 text-[11.5px] font-medium text-primary">
                Raised in {meeting.title} · {fmtFull(meeting.date)}
              </button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {it.owesYou.length > 0 && (
        <div className="mb-4">
          <SectionTitle>What they owe you</SectionTitle>
          {it.owesYou.map((cm) => (
            <Card key={cm.id} className="mb-2.5"><CardContent className="flex items-center justify-between">
              <div className="font-semibold">{cm.text}</div>
              <DueLabel dueDate={cm.dueDate} due={cm.due} />
            </CardContent></Card>
          ))}
        </div>
      )}

      {it.youOwe.length > 0 && (
        <div className="mb-4">
          <SectionTitle>What you owe them</SectionTitle>
          {it.youOwe.map((cm) => (
            <Card key={cm.id} className="mb-2.5"><CardContent className="flex items-center justify-between">
              <div className="font-semibold">{cm.text}</div>
              <DueLabel dueDate={cm.dueDate} due={cm.due} />
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
