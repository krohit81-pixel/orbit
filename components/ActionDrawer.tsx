"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloseButton, DueChip, Spinner } from "@/components/bits";
import { DirIcon } from "@/components/ActionRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  actionDir, agoLabel, cn, commitmentLabel, commitmentUpdates, fmtDate, fmtFull, lastFollowUp, stakeholderById, todayISO,
} from "@/lib/utils";

// Detail for one action (v2.0): who, due date, where it came from, its update history, and —
// for something owed to you — a drafted follow-up. Everything writes through the existing
// addCommitmentUpdate/toggleCommitment, so every change lands in the commitment's own
// append-only log exactly as v1's update form did. A right-hand panel on desktop, a bottom
// sheet on a phone.
export function ActionDrawer() {
  const { meetings, stakeholders, addCommitmentUpdate, toggleCommitment } = useOrbit();
  const { action, closeAction, go } = useFlow();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "note" | "due" | "done" | "follow">(null);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [nudge, setNudge] = useState("");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLDivElement>(null);

  const meeting = action ? meetings.find((m) => m.id === action.meetingId) : undefined;
  const c = meeting?.commitments.find((x) => x.id === action?.commitmentId);
  const open = !!(action && meeting && c);

  // Reset per-action state whenever a different action is opened.
  useEffect(() => {
    setNote("");
    setCopied(false);
    setNudgeOpen(!!action?.followUp);
    if (c && meeting) {
      const first = (stakeholderById(stakeholders, c.ownerId)?.name ?? "").split(" ")[0] || "there";
      setNudge(`Hi ${first}, following up on "${c.text}" from our ${meeting.title} on ${fmtDate(meeting.date)}. Could you share it, or let me know a new date?`);
    }
    if (action) setTimeout(() => closeRef.current?.querySelector("button")?.focus(), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action?.meetingId, action?.commitmentId, action?.followUp]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAction(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAction]);

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try { await fn(); } finally { setBusy(null); }
  };

  const person = c ? stakeholderById(stakeholders, actionDir(c) === "out" ? c.owedToId : c.ownerId) : undefined;
  const isOpen = c?.status !== "done";
  const updates = c ? commitmentUpdates(c) : [];
  const chased = c ? lastFollowUp(c) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(nudge);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused — the text is still selectable in the box.
    }
  };

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-foreground/30 transition-opacity dark:bg-black/55", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={closeAction}
      />
      <aside
        aria-label="Action detail"
        aria-hidden={!open}
        className={cn(
          "fixed z-50 flex flex-col border-border bg-card shadow-[0_8px_28px_-8px_rgba(40,40,110,0.35)] transition-transform duration-200 motion-reduce:transition-none",
          "inset-x-0 bottom-0 h-[90%] rounded-t-2xl border-t",
          "min-[700px]:inset-x-auto min-[700px]:right-0 min-[700px]:top-0 min-[700px]:h-full min-[700px]:w-[440px] min-[700px]:rounded-none min-[700px]:border-l min-[700px]:border-t-0",
          open ? "translate-x-0 translate-y-0" : "translate-y-[105%] min-[700px]:translate-x-[105%] min-[700px]:translate-y-0"
        )}
      >
        {open && c && meeting && (
          <>
            <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5" ref={closeRef}>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[12px] font-semibold text-accent-foreground">
                <DirIcon c={c} />{commitmentLabel(c, stakeholders)}
              </span>
              <DueChip dueDate={c.dueDate} due={c.due} done={!isOpen} />
              <span className="flex-1" />
              <CloseButton onClick={closeAction} />
            </div>

            <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-5 pb-5 pt-1">
              <h2 className="text-balance text-[20px] font-bold leading-snug tracking-[-0.01em]">{c.text}</h2>

              <dl className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-[13.5px]">
                <dt className="text-[12.5px] font-semibold text-muted-foreground/70">Person</dt>
                <dd className="min-w-0">
                  {person ? (
                    <><button className="font-semibold text-accent-foreground hover:underline" onClick={() => go({ screen: "stakeholder", id: person.id })}>{person.name}</button>
                      <span className="text-muted-foreground/70"> · {person.title}</span></>
                  ) : <span className="text-muted-foreground">No one named</span>}
                </dd>
                <dt className="text-[12.5px] font-semibold text-muted-foreground/70">Due</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label="Due date"
                    value={c.dueDate ?? ""}
                    disabled={busy === "due"}
                    onChange={(e) => {
                      const next = e.target.value || null;
                      run("due", () => addCommitmentUpdate(meeting.id, c.id, { note: "Due date changed", date: todayISO(), newDueDate: next }));
                    }}
                    className="rounded-[7px] border border-border bg-card px-2 py-1"
                  />
                  {busy === "due" && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
                  {!c.dueDate && c.due && <span className="text-[12.5px] text-muted-foreground">Said: “{c.due}”</span>}
                </dd>
                <dt className="self-start pt-px text-[12.5px] font-semibold text-muted-foreground/70">From</dt>
                <dd className="min-w-0">
                  <button className="font-semibold text-accent-foreground hover:underline" onClick={() => go({ screen: "meeting", id: meeting.id })}>{meeting.title}</button>
                  <span className="text-muted-foreground/70"> · {fmtDate(meeting.date)}</span>
                  {c.source && <p className="mt-1.5 border-l-2 border-border pl-2.5 text-[13px] italic text-muted-foreground">“{c.source}”</p>}
                </dd>
              </dl>

              {actionDir(c) === "in" && isOpen && (
                nudgeOpen ? (
                  <div className="rounded-[10px] bg-secondary p-3">
                    <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70">Follow-up message</div>
                    <textarea
                      value={nudge}
                      onChange={(e) => setNudge(e.target.value)}
                      aria-label="Follow-up message"
                      className="min-h-[84px] w-full resize-y rounded-lg border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:border-primary"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={copy}><Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}</Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={busy === "follow"}
                        onClick={() => run("follow", async () => {
                          await addCommitmentUpdate(meeting.id, c.id, { note: "Followed up", date: todayISO(), kind: "follow_up" });
                          setNudgeOpen(false);
                        })}
                      >
                        {busy === "follow" ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} Mark as followed up
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => setNudgeOpen(true)}>
                    <Send className="h-3.5 w-3.5" /> {chased ? `Follow up again (last ${agoLabel(chased)})` : "Follow up"}
                  </Button>
                )
              )}

              <div>
                <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70">Updates</div>
                <div className="flex flex-col gap-2.5">
                  {updates.length === 0 && <div className="text-[13px] text-muted-foreground/70">No updates yet.</div>}
                  {updates.map((u) => (
                    <div key={u.id} className="grid grid-cols-[54px_minmax(0,1fr)] gap-2.5 text-[13px]">
                      <time className="pt-px text-[12px] font-semibold tabular-nums text-muted-foreground/70">{fmtDate(u.date)}</time>
                      <div>
                        {u.note}
                        {u.dueDateAfter !== undefined && (
                          <div className="text-[12px] text-muted-foreground">
                            Due {u.dueDateBefore ? fmtFull(u.dueDateBefore) : "not set"} → {u.dueDateAfter ? fmtFull(u.dueDateAfter) : "not set"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  className="mt-2.5 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = note.trim();
                    if (!v) return;
                    run("note", async () => { await addCommitmentUpdate(meeting.id, c.id, { note: v, date: todayISO() }); setNote(""); });
                  }}
                >
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add an update"
                    aria-label="Add an update"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 outline-none focus:border-primary"
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={!note.trim() || busy === "note"}>
                    {busy === "note" ? <Spinner className="h-3.5 w-3.5" /> : null} Add
                  </Button>
                </form>
              </div>
            </div>

            <div className="flex gap-2 border-t border-border px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3">
              <Button
                className="flex-1"
                variant={isOpen ? "default" : "secondary"}
                disabled={busy === "done"}
                onClick={() => run("done", () => toggleCommitment(meeting.id, c.id))}
              >
                {busy === "done" ? <Spinner className="h-4 w-4" /> : isOpen ? <Check className="h-4 w-4" /> : null}
                {isOpen ? "Mark done" : "Reopen"}
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
