"use client";

import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DueChip, MiniButton, PageHead, Panel, PanelEmpty, Spinner, Tag } from "@/components/bits";
import { useFlow } from "@/components/flow";
import { cn, fmtFull } from "@/lib/utils";
import type { ReviewModel } from "@/lib/types";

const SUGGESTION_LABEL: Record<string, string> = {
  close: "Mark done",
  revise_date: "Change due date",
  progress_note: "Log a progress note",
};

type ListKey = "people" | "expectations" | "commitments" | "concerns" | "commitmentSuggestions";

// Review before anything is saved — the invariant every capture path goes through, including
// the overnight drafts from prep notes (pendingReviews). Nothing here touches the database
// until Save; Save is disabled while it runs so a double tap can't save twice.
export function ReviewScreen() {
  const { view, review, setReview, back, nav, commit, committing, pendingQueue, pendingIndex, skipPendingReview } = useFlow();
  if (!review) return <div className="py-10 text-center text-muted-foreground">Nothing to review.</div>;
  const r = review;
  const isQueue = view.screen === "pendingReviews";

  const toggle = (key: ListKey, id: string) =>
    setReview({ ...r, [key]: (r[key] as { _id: string; include: boolean }[]).map((x) => (x._id === id ? { ...x, include: !x.include } : x)) } as ReviewModel);
  const swap = (id: string) =>
    setReview({ ...r, commitments: r.commitments.map((x) => (x._id === id ? { ...x, owner: x.owedTo ?? "me", owedTo: x.owner } : x)) });

  const included = [...r.commitmentSuggestions, ...r.commitments, ...r.concerns, ...r.expectations].filter((x) => x.include).length;
  const Tick = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      aria-label={on ? "Exclude" : "Include"}
      className={cn("mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.6px]", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 text-transparent")}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </button>
  );
  const item = (on: boolean) => cn("flex items-start gap-3 border-t border-border px-4 py-2.5", !on && "opacity-45");
  const label = (who: string) => (who === "me" ? "You" : who.split(" ")[0]);

  return (
    <div className="max-w-[760px]">
      <button onClick={back} className="mb-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
      <PageHead
        eyebrow={isQueue ? `Drafted from your prep note · ${pendingIndex + 1} of ${pendingQueue.length}` : "Review before saving"}
        title="Check what Orbit found"
      />
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">Nothing is saved yet. Untick anything that&apos;s wrong.</p>

        <Panel>
          <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3.5">
            <div className="flex flex-wrap gap-2">
              <input value={r.title} onChange={(e) => setReview({ ...r, title: e.target.value })} aria-label="Meeting title" className="min-w-[220px] flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold outline-none focus:border-primary" />
              <input type="date" value={r.date} onChange={(e) => setReview({ ...r, date: e.target.value })} aria-label="Meeting date" className="rounded-lg border border-border bg-card px-2.5 py-1.5 outline-none focus:border-primary" />
            </div>
            <p className="text-[15px] leading-relaxed">{r.summary || "No summary found."}</p>
            {r.people.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {r.people.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => toggle("people", p._id)}
                    aria-pressed={p.include}
                    className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-[3px] text-[12.5px] font-semibold", !p.include && "line-through opacity-45")}
                  >
                    {p.name} {!p.existing && <Tag>New</Tag>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {r.commitmentSuggestions.length > 0 && (
          <Panel title={<><Sparkles className="h-3.5 w-3.5 text-accent-foreground" /> Updates to existing actions</>} count={r.commitmentSuggestions.length}>
            {r.commitmentSuggestions.map((s) => (
              <div key={s._id} className={item(s.include)}>
                <Tick on={s.include} onClick={() => toggle("commitmentSuggestions", s._id)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-muted-foreground">{s.commitmentLabel}</div>
                  <div className="font-medium leading-snug">{s.commitmentText}</div>
                  <div className="mt-[3px] text-[12.5px] font-semibold">
                    {SUGGESTION_LABEL[s.action]}{s.action === "revise_date" && s.newDueDate ? ` → ${fmtFull(s.newDueDate)}` : ""}
                  </div>
                  <p className="mt-1 border-l-2 border-border pl-2.5 text-[13px] italic text-muted-foreground">{s.reason}</p>
                </div>
              </div>
            ))}
          </Panel>
        )}

        <Panel title="New actions" count={r.commitments.length}>
          {r.commitments.length === 0 && <PanelEmpty>None found.</PanelEmpty>}
          {r.commitments.map((x) => (
            <div key={x._id} className={item(x.include)}>
              <Tick on={x.include} onClick={() => toggle("commitments", x._id)} />
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-snug">{x.text}</div>
                <div className="mt-[3px] flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-[3px] font-semibold">
                    {x.owner === "me" ? <ArrowUpRight className="h-[13px] w-[13px]" /> : x.owedTo === "me" ? <ArrowDownLeft className="h-[13px] w-[13px]" /> : null}
                    {x.owner === "me" ? (x.owedTo ? `You owe ${label(x.owedTo)}` : "You owe") : `${label(x.owner)} owes ${x.owedTo ? (x.owedTo === "me" ? "you" : label(x.owedTo)) : "someone"}`}
                  </span>
                  {((x.owner === "me" && x.owedTo) || (x.owedTo === "me" && x.owner)) && <MiniButton onClick={() => swap(x._id)}>Swap direction</MiniButton>}
                </div>
                {x.source && <p className="mt-1 border-l-2 border-border pl-2.5 text-[13px] italic text-muted-foreground">{x.source}</p>}
              </div>
              <DueChip dueDate={x.dueDate} due={x.due} />
            </div>
          ))}
        </Panel>

        {r.concerns.length > 0 && (
          <Panel title={<><Eye className="h-3.5 w-3.5" /> Watch</>} count={r.concerns.length}>
            {r.concerns.map((x) => (
              <div key={x._id} className={item(x.include)}>
                <Tick on={x.include} onClick={() => toggle("concerns", x._id)} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{x.text}</div>
                  {x.stakeholder && <div className="mt-[3px] text-[12.5px] text-muted-foreground">{x.stakeholder}</div>}
                  {x.source && <p className="mt-1 border-l-2 border-border pl-2.5 text-[13px] italic text-muted-foreground">{x.source}</p>}
                </div>
              </div>
            ))}
          </Panel>
        )}

        {r.expectations.length > 0 && (
          <Panel title="What they expect" count={r.expectations.length}>
            {r.expectations.map((x) => (
              <div key={x._id} className={item(x.include)}>
                <Tick on={x.include} onClick={() => toggle("expectations", x._id)} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{x.text}</div>
                  {x.stakeholder && <div className="mt-[3px] text-[12.5px] text-muted-foreground">{x.stakeholder}</div>}
                </div>
              </div>
            ))}
          </Panel>
        )}

        {r.decisions.length > 0 && (
          <Panel title="Decisions" count={r.decisions.length}>
            <ol className="flex list-decimal flex-col gap-1.5 pb-3.5 pl-[34px] pr-4">{r.decisions.map((d, i) => <li key={i}>{d}</li>)}</ol>
          </Panel>
        )}

        <div className="sticky bottom-0 flex gap-2 bg-gradient-to-t from-paper from-70% to-transparent py-3">
          <Button className="flex-1" onClick={commit} disabled={committing}>
            {committing ? <><Spinner /> Saving…</> : <><Check className="h-4 w-4" /> Save meeting · {included} item{included === 1 ? "" : "s"}</>}
          </Button>
          {isQueue ? (
            <Button variant="secondary" disabled={committing} onClick={skipPendingReview}>Skip</Button>
          ) : (
            <Button variant="secondary" disabled={committing} onClick={() => { setReview(null); nav({ screen: "meetings" }); }}>Discard</Button>
          )}
        </div>
      </div>
    </div>
  );
}
