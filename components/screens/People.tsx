"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, HealthDots, PageHead, Panel, PanelEmpty, Tag } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { agoLabel, intel, isOverdueAction, matchesQuery, relationshipHealth } from "@/lib/utils";

// Everyone, most in need of attention first: overdue items between you, then most recently met.
export function PeopleScreen() {
  const { stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const [q, setQ] = useState("");

  const rows = stakeholders
    .filter((s) => !q.trim() || matchesQuery(q, `${s.name} ${s.title} ${s.relationship}`))
    .map((s) => {
      const it = intel(meetings, s.id);
      const open = [...it.youOwe, ...it.owesYou];
      return {
        s, it,
        overdue: open.filter(isOverdueAction).length,
        last: it.interactions[0]?.date ?? null,
        health: relationshipHealth(meetings, s.id).stars,
      };
    })
    .sort((a, b) => b.overdue - a.overdue || (b.last ?? "").localeCompare(a.last ?? "") || a.s.name.localeCompare(b.s.name));

  return (
    <div>
      <PageHead
        eyebrow={`${stakeholders.length} stakeholder${stakeholders.length === 1 ? "" : "s"}`}
        title="People"
        right={<Button variant="secondary" size="sm" onClick={() => go({ screen: "addStakeholder" })}><Plus className="h-3.5 w-3.5" /> Add person</Button>}
      />
      <label className="mb-3.5 flex items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-[7px] focus-within:border-primary">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person, role or relationship" aria-label="Find a person" className="w-full min-w-0 bg-transparent outline-none" />
      </label>
      <Panel>
        <div className="[&>*:first-child]:border-t-0">
          {rows.map(({ s, it, overdue, last, health }) => (
            <button
              key={s.id}
              onClick={() => go({ screen: "stakeholder", id: s.id })}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left first:rounded-t-xl last:rounded-b-xl hover:bg-secondary"
            >
              <Avatar name={s.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.name}</div>
                <div className="mt-[3px] flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
                  <span className="truncate">{s.title}</span>
                  <Tag tone="plain">{s.relationship}</Tag>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex gap-2.5 text-[12.5px] tabular-nums text-muted-foreground">
                  {overdue > 0 && <span className="font-semibold text-warm">{overdue} overdue</span>}
                  <span className="hidden sm:inline">You owe <b className="font-semibold text-foreground">{it.youOwe.length}</b></span>
                  <span className="hidden sm:inline">Owes you <b className="font-semibold text-foreground">{it.owesYou.length}</b></span>
                </div>
                <div className="flex items-center gap-2">
                  {last && <span className="text-[12px] text-muted-foreground/70">Met {agoLabel(last)}</span>}
                  <HealthDots stars={health} />
                </div>
              </div>
            </button>
          ))}
        </div>
        {rows.length === 0 && <div className="pt-3"><PanelEmpty>No one matches.</PanelEmpty></div>}
      </Panel>
    </div>
  );
}
