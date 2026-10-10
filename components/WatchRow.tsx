"use client";

import { useState } from "react";
import { MiniButton, Spinner, Tag } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { cn, fmtDate, stakeholderById } from "@/lib/utils";
import type { Concern, Meeting } from "@/lib/types";

// A concern ("Watch" in 2.0). Resolving buries it rather than deleting it (v1.17): it drops
// off Today and the weekly recap but stays on the meeting record, with a one-tap Reopen.
export function WatchRow({ concern: c, meeting, recurring, hidePerson }: { concern: Concern; meeting: Meeting; recurring?: boolean; hidePerson?: boolean }) {
  const { stakeholders, resolveConcern, reopenConcern } = useOrbit();
  const { go } = useFlow();
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const resolved = c.status === "resolved";
  const person = stakeholderById(stakeholders, c.stakeholderId);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); setChoosing(false); }
  };

  return (
    <div className="o-row border-t border-border px-4 py-2.5">
      <div className={cn("font-medium leading-snug", resolved && "text-muted-foreground/70 line-through")}>{c.text}</div>
      <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
        {!hidePerson && person && (
          <button className="font-semibold text-accent-foreground hover:underline" onClick={() => go({ screen: "stakeholder", id: person.id })}>{person.name}</button>
        )}
        <button className="text-muted-foreground/70 hover:underline" onClick={() => go({ screen: "meeting", id: meeting.id })}>
          {meeting.title} · {fmtDate(meeting.date)}
        </button>
        {recurring && !resolved && <Tag tone="red">Raised again</Tag>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {resolved ? (
          <>
            <Tag tone="green">{c.resolution === "mitigated" ? "Mitigated" : "No longer relevant"}</Tag>
            <MiniButton disabled={busy} onClick={() => run(() => reopenConcern(meeting.id, c.id))}>Reopen</MiniButton>
          </>
        ) : choosing ? (
          <>
            <MiniButton disabled={busy} onClick={() => run(() => resolveConcern(meeting.id, c.id, "mitigated"))}>Mitigated</MiniButton>
            <MiniButton disabled={busy} onClick={() => run(() => resolveConcern(meeting.id, c.id, "no_longer_relevant"))}>No longer relevant</MiniButton>
            <MiniButton disabled={busy} onClick={() => setChoosing(false)}>Cancel</MiniButton>
          </>
        ) : (
          <MiniButton onClick={() => setChoosing(true)}>Resolve</MiniButton>
        )}
        {busy && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </div>
  );
}
