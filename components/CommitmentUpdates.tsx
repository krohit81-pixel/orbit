"use client";

import { useState } from "react";
import { Plus, ChevronDown, ChevronRight, ArrowRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { cn, commitmentUpdates, fmtFull, todayISO } from "@/lib/utils";
import type { Commitment } from "@/lib/types";

// Append-only progress log for a single commitment — "further notes/steps taken", shown as
// a small audit trail on top of the original commitment, with an optional due-date revision
// captured alongside each entry (v1.8). Read side is pure (commitmentUpdates in lib/utils);
// the write goes through OrbitStore.addCommitmentUpdate, which follows toggleCommitment's
// optimistic-then-rollback shape since this is a data-integrity write like any other.
export function CommitmentUpdates({ meetingId, commitment }: { meetingId: string; commitment: Commitment }) {
  const { addCommitmentUpdate } = useOrbit();
  const updates = commitmentUpdates(commitment);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [reviseDue, setReviseDue] = useState(false);
  const [newDueDate, setNewDueDate] = useState(commitment.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  const startAdding = () => {
    setNote("");
    setDate(todayISO());
    setReviseDue(false);
    setNewDueDate(commitment.dueDate ?? "");
    setAdding(true);
    setOpen(true);
  };

  const save = async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      await addCommitmentUpdate(meetingId, commitment.id, {
        note: note.trim(),
        date,
        newDueDate: reviseDue ? newDueDate || null : undefined,
      });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2.5 border-t border-primary/20 pt-2">
      {(updates.length > 0 || adding) && (
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {updates.length > 0 ? `${updates.length} update${updates.length === 1 ? "" : "s"}` : "Updates"}
        </button>
      )}

      {open && updates.length > 0 && (
        <div className="relative mt-2.5 pl-4">
          {updates.map((u, i) => (
            <div key={u.id} className="relative pb-3 last:pb-0">
              {i < updates.length - 1 && <div className="absolute left-[-13px] top-2.5 h-full w-px bg-border" />}
              <div className="absolute left-[-16.5px] top-[5px] h-2 w-2 rounded-full bg-primary" />
              <div className="text-[11.5px] font-semibold text-muted-foreground">{fmtFull(u.date)}</div>
              <div className="mt-0.5 text-[13px] leading-snug">{u.note}</div>
              {u.dueDateAfter !== undefined && (
                <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-primary">
                  <CalendarClock className="h-3 w-3" />
                  Due date revised: {u.dueDateBefore ? fmtFull(u.dueDateBefore) : "none"}
                  <ArrowRight className="h-3 w-3" />
                  {u.dueDateAfter ? fmtFull(u.dueDateAfter) : "none"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button onClick={startAdding} className="mt-2 flex items-center gap-1 text-[11.5px] font-semibold text-primary">
          <Plus className="h-3 w-3" /> Add update
        </button>
      ) : (
        <div className="mt-2 space-y-2.5 rounded-md border border-border bg-card p-3">
          <Textarea
            rows={2}
            placeholder="What's the latest? Steps taken, blockers, progress…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="px-3 py-2 text-[13px]"
          />
          <div className="flex items-center gap-2">
            <label className="text-[11.5px] text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" />
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={reviseDue}
              onChange={(e) => setReviseDue(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Revise due date
          </label>
          {reviseDue && (
            <div className="flex items-center gap-2 pl-5">
              <label className="text-[11.5px] text-muted-foreground">New due date</label>
              <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" />
            </div>
          )}
          <div className="flex gap-2 pt-0.5">
            <Button size="sm" className={cn("flex-1 text-[12.5px]")} disabled={!note.trim() || saving} onClick={save}>
              {saving ? <Spinner className="h-3.5 w-3.5 text-primary-foreground" /> : null} {saving ? "Saving…" : "Save update"}
            </Button>
            <Button size="sm" variant="secondary" className="flex-1 text-[12.5px]" disabled={saving} onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
