"use client";

import { ArrowLeft, Check, CircleDot, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow, SectionTitle, SourceQuote, DueLabel } from "@/components/bits";
import { useFlow } from "@/components/flow";
import type { ReviewModel } from "@/lib/types";

export function ReviewScreen() {
  const { review, setReview, go, commit } = useFlow();
  if (!review) return <div className="py-10 text-center text-muted-foreground">Nothing to review.</div>;
  const r = review;

  const toggle = (key: "people" | "expectations" | "commitments" | "concerns", id: string) => {
    setReview({
      ...r,
      [key]: (r[key] as { _id: string; include: boolean }[]).map((x) =>
        x._id === id ? { ...x, include: !x.include } : x
      ),
    } as ReviewModel);
  };

  const setCommitment = (id: string, patch: Record<string, unknown>) =>
    setReview({ ...r, commitments: r.commitments.map((x) => (x._id === id ? { ...x, ...patch } : x)) } as ReviewModel);

  const PartySelect = ({ value, onChange, allowNone }: { value: string; onChange: (v: string) => void; allowNone?: boolean }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-card px-2 text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="me">You</option>
      {allowNone && <option value="">—</option>}
      {r.people.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
    </select>
  );

  const includedCount =
    [...r.people, ...r.expectations, ...r.commitments, ...r.concerns].filter((x) => x.include).length;

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button className="mt-0.5" onClick={onClick}>
      {on ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ring))]" /> : <CircleDot className="h-5 w-5 text-muted-foreground/60" />}
    </button>
  );

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-2">
        <button onClick={() => go({ screen: "capture" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Review</div>
      </div>
      <p className="mb-2 text-[13.5px] leading-relaxed text-muted-foreground">
        Nothing is saved yet. Drop anything that&apos;s wrong, then commit what&apos;s right to your knowledge base.
      </p>

      <Card className="mb-4 bg-accent/40"><CardContent>
        <Eyebrow>Proposed title, date &amp; summary</Eyebrow>
        <Input className="mt-2 font-semibold" value={r.title} onChange={(e) => setReview({ ...r, title: e.target.value })} />
        <Input type="date" className="mt-2 w-auto" value={r.date} onChange={(e) => setReview({ ...r, date: e.target.value })} />
        <div className="mt-2.5 text-[15px] leading-relaxed">{r.summary}</div>
      </CardContent></Card>

      <SectionTitle>People ({r.people.filter((p) => p.include).length})</SectionTitle>
      {r.people.map((p) => (
        <Card key={p._id} className={`mb-2.5 ${p.include ? "" : "opacity-45"}`}><CardContent className="flex items-center gap-2.5">
          <Toggle on={p.include} onClick={() => toggle("people", p._id)} />
          <div className="flex-1 font-semibold">{p.name}</div>
          <Badge variant={p.existing ? "default" : "warm"}>{p.existing ? "Existing" : "New"}</Badge>
        </CardContent></Card>
      ))}

      {r.expectations.length > 0 && (
        <>
          <SectionTitle>Expectations</SectionTitle>
          {r.expectations.map((x) => (
            <Card key={x._id} className={`mb-2.5 ${x.include ? "" : "opacity-45"}`}><CardContent className="flex items-start gap-2.5">
              <Toggle on={x.include} onClick={() => toggle("expectations", x._id)} />
              <div className="flex-1">
                <div className="font-semibold">{x.text}</div>
                {x.stakeholder && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{x.stakeholder}</div>}
                <SourceQuote>{x.source}</SourceQuote>
              </div>
            </CardContent></Card>
          ))}
        </>
      )}

      {r.commitments.length > 0 && (
        <>
          <SectionTitle>Commitments</SectionTitle>
          {r.commitments.map((x) => (
            <Card key={x._id} className={`mb-2.5 ${x.include ? "" : "opacity-45"}`}><CardContent className="flex items-start gap-2.5">
              <Toggle on={x.include} onClick={() => toggle("commitments", x._id)} />
              <div className="flex-1">
                <div className="font-semibold">{x.text}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <PartySelect value={x.owner} onChange={(v) => setCommitment(x._id, { owner: v })} />
                  <span className="text-[12px] text-muted-foreground">owes</span>
                  <PartySelect value={x.owedTo ?? ""} onChange={(v) => setCommitment(x._id, { owedTo: v || null })} allowNone />
                </div>
                <DueLabel dueDate={x.dueDate} due={x.due} className="mt-1.5 block" />
                <SourceQuote>{x.source}</SourceQuote>
              </div>
            </CardContent></Card>
          ))}
        </>
      )}

      {r.concerns.length > 0 && (
        <>
          <SectionTitle>Concerns</SectionTitle>
          {r.concerns.map((x) => (
            <Card key={x._id} className={`mb-2.5 ${x.include ? "" : "opacity-45"}`}><CardContent className="flex items-start gap-2.5">
              <Toggle on={x.include} onClick={() => toggle("concerns", x._id)} />
              <div className="flex-1">
                <div className="font-semibold">{x.text}</div>
                {x.stakeholder && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{x.stakeholder}</div>}
                <SourceQuote>{x.source}</SourceQuote>
              </div>
            </CardContent></Card>
          ))}
        </>
      )}

      {r.decisions.length > 0 && (
        <>
          <SectionTitle>Decisions</SectionTitle>
          {r.decisions.map((d, i) => <Card key={i} className="mb-2"><CardContent className="font-semibold">{d}</CardContent></Card>)}
        </>
      )}

      <Button className="mt-4 w-full" onClick={commit}>
        <Check className="h-[18px] w-[18px]" /> Commit {includedCount} item(s) to knowledge base
      </Button>
      <Button variant="secondary" className="mt-2.5 w-full" onClick={() => go({ screen: "capture" })}>
        Back to transcript
      </Button>
    </div>
  );
}
