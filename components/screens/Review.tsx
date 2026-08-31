"use client";

import { ArrowLeft, Check, CircleDot, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow, SectionTitle, SourceQuote, DueLabel } from "@/components/bits";
import { useFlow } from "@/components/flow";
import { fmtFull } from "@/lib/utils";
import type { ReviewModel } from "@/lib/types";

const SUGGESTION_ACTION_LABEL: Record<string, string> = {
  close: "Mark as done",
  revise_date: "Revise due date",
  progress_note: "Log a progress note",
};

export function ReviewScreen() {
  const { view, review, setReview, go, commit, pendingQueue, pendingIndex, skipPendingReview } = useFlow();
  const isPendingQueue = view.screen === "pendingReviews";
  if (!review) return <div className="py-10 text-center text-muted-foreground">Nothing to review.</div>;
  const r = review;

  const toggle = (key: "people" | "expectations" | "commitments" | "concerns" | "commitmentSuggestions", id: string) => {
    setReview({
      ...r,
      [key]: (r[key] as { _id: string; include: boolean }[]).map((x) =>
        x._id === id ? { ...x, include: !x.include } : x
      ),
    } as ReviewModel);
  };

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
        <button onClick={() => go({ screen: isPendingQueue ? "meetings" : "capture" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">
          {isPendingQueue ? `Review meeting ${pendingIndex + 1} of ${pendingQueue.length}` : "Review"}
        </div>
      </div>
      <p className="mb-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {isPendingQueue
          ? "Extracted from your own prep notes for this meeting, now that its date has passed. Nothing is saved yet."
          : "Nothing is saved yet. Drop anything that's wrong, then commit what's right to your knowledge base."}
      </p>

      <Card className="mb-4 bg-accent/40"><CardContent>
        <Eyebrow>Proposed title, date &amp; summary</Eyebrow>
        <Input className="mt-2 font-semibold" value={r.title} onChange={(e) => setReview({ ...r, title: e.target.value })} />
        <Input type="date" className="mt-2 w-auto" value={r.date} onChange={(e) => setReview({ ...r, date: e.target.value })} />
        <div className="mt-2.5 font-serif text-[15.5px] leading-relaxed">{r.summary}</div>
      </CardContent></Card>

      {r.commitmentSuggestions.length > 0 && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
            <Sparkles className="h-3 w-3" /> Suggested commitment updates
          </div>
          <p className="mb-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            This meeting looks like it touches these existing open commitments. Accepted ones update them directly — they aren&apos;t committed as new items below.
          </p>
          {r.commitmentSuggestions.map((s) => (
            <Card key={s._id} className={`mb-2.5 ${s.include ? "" : "opacity-45"}`}><CardContent className="flex items-start gap-2.5">
              <Toggle on={s.include} onClick={() => toggle("commitmentSuggestions", s._id)} />
              <div className="flex-1">
                <div className="text-[11.5px] font-semibold text-primary">{s.commitmentLabel}</div>
                <div className="font-semibold">{s.commitmentText}</div>
                <div className="mt-1 text-[12.5px] font-medium text-foreground">
                  {SUGGESTION_ACTION_LABEL[s.action]}
                  {s.action === "revise_date" && s.newDueDate ? ` → ${fmtFull(s.newDueDate)}` : ""}
                </div>
                <SourceQuote>{s.reason}</SourceQuote>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

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
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground">{x.owner === "me" ? "You owe" : x.owner}</span>
                  <DueLabel dueDate={x.dueDate} due={x.due} />
                </div>
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
        <Check className="h-[18px] w-[18px]" /> {isPendingQueue ? `Add to Meetings (${includedCount} item(s))` : `Commit ${includedCount} item(s) to knowledge base`}
      </Button>
      {isPendingQueue ? (
        <Button variant="secondary" className="mt-2.5 w-full" onClick={skipPendingReview}>
          Skip this one — don&apos;t add it
        </Button>
      ) : (
        <Button variant="secondary" className="mt-2.5 w-full" onClick={() => go({ screen: "capture" })}>
          Back to transcript
        </Button>
      )}
    </div>
  );
}
