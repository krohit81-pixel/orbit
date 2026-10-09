"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check } from "lucide-react";
import { DueChip, MiniButton, Spinner, Tag } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { actionDir, agoLabel, cn, commitmentLabel, counterpartyName, isOverdueAction, lastFollowUp, awaitingReply } from "@/lib/utils";
import type { Commitment, Meeting } from "@/lib/types";

export function DirIcon({ c, className }: { c: Commitment; className?: string }) {
  const d = actionDir(c);
  if (d === "out") return <ArrowUpRight className={cn("h-[13px] w-[13px] shrink-0", className)} strokeWidth={2.2} aria-label="You owe" />;
  if (d === "in") return <ArrowDownLeft className={cn("h-[13px] w-[13px] shrink-0", className)} strokeWidth={2.2} aria-label="Owed to you" />;
  return null;
}

// One action (a commitment) as a row: tick to close, title, who/where, due chip. Clicking the
// row opens the action drawer; the tick and "Follow up" are separate targets.
export function ActionRow({
  c, meeting, directional, hidePerson, hideSource, nudge,
}: {
  c: Commitment;
  meeting: Meeting;
  directional?: boolean; // the panel already says "You owe" / "Owed to you" — just show the name
  hidePerson?: boolean;
  hideSource?: boolean;
  nudge?: boolean; // offer "Follow up" on overdue items owed to you that haven't been chased
}) {
  const { stakeholders, toggleCommitment } = useOrbit();
  const { openAction } = useFlow();
  const [busy, setBusy] = useState(false);
  const done = c.status === "done";
  const chased = lastFollowUp(c);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try { await toggleCommitment(meeting.id, c.id); } finally { setBusy(false); }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openAction({ meetingId: meeting.id, commitmentId: c.id })}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openAction({ meetingId: meeting.id, commitmentId: c.id }); }}
      className="flex cursor-pointer items-start gap-3 border-t border-border px-4 py-2.5 last:rounded-b-xl hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <button
        onClick={toggle}
        aria-label={done ? "Reopen" : "Mark done"}
        disabled={busy}
        className={cn(
          "mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.6px]",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 text-transparent hover:border-primary hover:text-primary"
        )}
      >
        {busy ? <Spinner className="h-3 w-3 text-muted-foreground" /> : <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium leading-snug", done && "text-muted-foreground/70 line-through")}>{c.text}</div>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          {!hidePerson && (directional
            ? <span>{counterpartyName(c, stakeholders)}</span>
            : <span className="inline-flex items-center gap-[3px] font-semibold"><DirIcon c={c} />{commitmentLabel(c, stakeholders)}</span>)}
          {!hideSource && <span className="text-muted-foreground/70">{meeting.title}</span>}
          {awaitingReply(c) && chased && <Tag tone="plain">Awaiting reply · chased {agoLabel(chased)}</Tag>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <DueChip dueDate={c.dueDate} due={c.due} done={done} />
        {nudge && actionDir(c) === "in" && isOverdueAction(c) && !chased && (
          <MiniButton onClick={(e) => { e.stopPropagation(); openAction({ meetingId: meeting.id, commitmentId: c.id, followUp: true }); }}>
            Follow up
          </MiniButton>
        )}
      </div>
    </div>
  );
}
