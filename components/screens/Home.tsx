"use client";

import { useState } from "react";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow, SectionTitle, DueLabel } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  fmtFull, intel, openCommitmentsInvolvingMe, otherParty, commitmentLabel,
  bucketDue, stakeholderById, type OpenCommitment,
} from "@/lib/utils";

export function HomeScreen() {
  const { self, stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const open = openCommitmentsInvolvingMe(meetings);

  // group by the other party
  const groups = new Map<string, OpenCommitment[]>();
  open.forEach((cm) => {
    const key = otherParty(cm) ?? "__unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cm);
  });
  const groupList = [...groups.entries()].sort((a, b) => {
    if (a[0] === "__unassigned") return 1;
    if (b[0] === "__unassigned") return -1;
    return (stakeholderById(stakeholders, a[0])?.name ?? "").localeCompare(stakeholderById(stakeholders, b[0])?.name ?? "");
  });
  groupList.forEach(([, items]) => items.sort((x, y) => (x.dueDate || "9999").localeCompare(y.dueDate || "9999")));

  // smart default: expand groups that have something overdue or due this week
  const urgent = (items: OpenCommitment[]) => items.some((c) => ["overdue", "week"].includes(bucketDue(c.dueDate)));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, items: OpenCommitment[]) =>
    key in collapsed ? !collapsed[key] : urgent(items);
  const toggle = (key: string, items: OpenCommitment[]) =>
    setCollapsed((c) => ({ ...c, [key]: key in c ? !c[key] : urgent(items) }));

  const recent = stakeholders
    .filter((s) => meetings.slice(0, 2).some((m) => m.mentioned.includes(s.id)))
    .slice(0, 3);

  return (
    <div>
      <Eyebrow>Welcome back, {self.name}</Eyebrow>
      <h1 className="mb-4 mt-1 text-[26px] font-bold leading-tight tracking-tight">What needs your attention</h1>

      <button
        onClick={() => go({ screen: "search" })}
        className="mb-[18px] flex w-full items-center gap-2 rounded-md bg-secondary px-3.5 py-3 text-sm text-muted-foreground"
      >
        <Search className="h-[17px] w-[17px]" /> Search topics, people, commitments…
      </button>

      <SectionTitle right={<button onClick={() => go({ screen: "meetings" })} className="text-xs font-semibold text-primary">All</button>}>
        Recent meetings
      </SectionTitle>
      {meetings.slice(0, 3).map((m) => (
        <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2.5 cursor-pointer">
          <CardContent>
            <div className="font-semibold">{m.title}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground/70">{fmtFull(m.date)}</div>
            <div className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{m.summary}</div>
          </CardContent>
        </Card>
      ))}

      <SectionTitle>Commitments by stakeholder</SectionTitle>
      {open.length === 0 && (
        <Card className="mb-2.5"><CardContent className="text-muted-foreground/70">Nothing outstanding. Clean slate.</CardContent></Card>
      )}
      {groupList.map(([key, items]) => {
        const person = key === "__unassigned" ? null : stakeholderById(stakeholders, key);
        const openState = isOpen(key, items);
        return (
          <div key={key} className="mb-2.5 overflow-hidden rounded-md border border-border bg-card">
            <button
              className="flex w-full items-center justify-between px-3.5 py-2.5"
              onClick={() => toggle(key, items)}
            >
              <span className="flex items-center gap-2">
                <span className="text-[13px] font-bold tracking-tight text-foreground">{person ? person.name : "Unassigned"}</span>
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{items.length}</span>
              </span>
              {openState ? <ChevronDown className="h-4 w-4 text-muted-foreground/60" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
            </button>
            {openState && (
              <div className="border-t border-border">
                {items.map((cm) => (
                  <div
                    key={cm.id}
                    className="cursor-pointer border-b border-border px-3.5 py-2.5 last:border-b-0"
                    onClick={() => go({ screen: "meeting", id: cm.meeting.id })}
                  >
                    <div className="text-[14px] font-medium">{cm.text}</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-primary">{commitmentLabel(cm, stakeholders)}</span>
                      <DueLabel dueDate={cm.dueDate} due={cm.due} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {recent.length > 0 && (
        <>
          <SectionTitle>Recently updated</SectionTitle>
          {recent.map((s) => (
            <Card key={s.id} onClick={() => go({ screen: "stakeholder", id: s.id })} className="mb-2.5 cursor-pointer">
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-[12.5px] text-muted-foreground">{intel(meetings, s.id).exps.length} open expectation(s)</div>
                </div>
                <ChevronRight className="h-[18px] w-[18px] text-muted-foreground/60" />
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
