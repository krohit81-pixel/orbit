"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { FilterChip, PageHead, Panel, PanelEmpty, Seg } from "@/components/bits";
import { ActionRow } from "@/components/ActionRow";
import { useOrbit } from "@/components/OrbitStore";
import type { ActionDirFilter, ActionWhenFilter } from "@/components/flow";
import {
  actionDir, awaitingReply, bucketDue, commitmentLabel, dueSoon, involvesMe, isOverdueAction, matchesQuery, sortByUrgency,
  type OpenCommitment,
} from "@/lib/utils";

// One list for everything owed (v2.0) — replaces v1's "Commitments by stakeholder", the dashboard
// tiles and the Gantt, which all showed the same commitments three ways. Filter by direction,
// by when, or by text; detail and updates open in the action drawer.
export function ActionsScreen({ dir: initialDir, when: initialWhen }: { dir?: ActionDirFilter; when?: ActionWhenFilter }) {
  const { meetings, stakeholders } = useOrbit();
  const [dir, setDir] = useState<ActionDirFilter>(initialDir ?? "all");
  const [when, setWhen] = useState<ActionWhenFilter>(initialWhen ?? "open");
  const [q, setQ] = useState("");
  const [showDone, setShowDone] = useState(false);

  // Every commitment involving the owner, open or done, each paired with its meeting.
  const all: OpenCommitment[] = [];
  meetings.forEach((m) => m.commitments.forEach((c) => { if (involvesMe(c)) all.push({ ...c, meeting: m }); }));
  const filtered = all
    .filter((c) => dir === "all" || actionDir(c) === dir)
    .filter((c) => !q.trim() || matchesQuery(q, `${c.text} ${commitmentLabel(c, stakeholders)} ${c.meeting.title}`));
  const open = sortByUrgency(filtered.filter((c) => c.status !== "done"));
  const done = filtered.filter((c) => c.status === "done").sort((a, b) => b.meeting.date.localeCompare(a.meeting.date));

  const groups: [string, OpenCommitment[], boolean?][] =
    when === "overdue" ? [["", open.filter(isOverdueAction)]]
    : when === "week" ? [["", open.filter(dueSoon)]]
    : when === "awaiting" ? [["", open.filter(awaitingReply)]]
    : [
        ["Overdue", open.filter(isOverdueAction), true],
        ["Next 7 days", open.filter(dueSoon)],
        ["Later", open.filter((c) => bucketDue(c.dueDate) === "upcoming")],
        ["No date", open.filter((c) => !c.dueDate)],
      ];
  const shown = groups.filter(([, items]) => items.length);

  return (
    <div>
      <PageHead eyebrow="One list for everything owed" title="Actions" />
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <Seg label="Direction" value={dir} onChange={setDir} options={[["all", "All"], ["out", "You owe"], ["in", "Owed to you"]]} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="When">
          {([["open", "Open"], ["overdue", "Overdue"], ["week", "Next 7 days"], ["awaiting", "Awaiting reply"]] as [ActionWhenFilter, string][]).map(([v, l]) => (
            <FilterChip key={v} on={when === v} onClick={() => setWhen(v)}>{l}</FilterChip>
          ))}
        </div>
        <label className="o-field flex min-w-[180px] flex-1 items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-[7px] focus-within:border-primary">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by text, person or meeting" aria-label="Filter actions" className="w-full min-w-0 bg-transparent outline-none" />
        </label>
      </div>

      <Panel>
        {shown.length === 0 && <div className="pt-3"><PanelEmpty>No open actions match.</PanelEmpty></div>}
        {shown.map(([label, items, hot], gi) => (
          <div key={label || "list"}>
            {label ? (
              <div data-hot={hot ? "" : undefined} className={`o-group flex items-center gap-2 px-4 pb-2 ${gi === 0 ? "pt-3" : "pt-3.5"} text-[12px] font-bold uppercase tracking-[0.06em] ${hot ? "text-warm" : "text-muted-foreground/70"}`}>
                {label} <span>{items.length}</span>
              </div>
            ) : <div className="h-1" />}
            <div className="[&>*:first-child]:border-t-0">
              {items.map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} nudge />)}
            </div>
          </div>
        ))}
        {done.length > 0 && (
          <>
            <button onClick={() => setShowDone((v) => !v)} className="block w-full border-t border-border px-4 py-2.5 text-left text-[13px] font-semibold text-accent-foreground hover:bg-secondary">
              {showDone ? "Hide" : "Show"} {done.length} done
            </button>
            {showDone && done.map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} />)}
          </>
        )}
      </Panel>
    </div>
  );
}
