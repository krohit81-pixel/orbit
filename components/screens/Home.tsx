"use client";

import { Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow, SectionTitle, DueLabel } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { fmtDate, intel, myOpenCommitments, stakeholderById } from "@/lib/utils";

export function HomeScreen() {
  const { self, stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const open = myOpenCommitments(meetings);

  // person-first grouping: commitments by the stakeholder they relate to
  const groups = new Map<string, typeof open>();
  open.forEach((cm) => {
    const key = cm.stakeholderId ?? "__unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cm);
  });
  const groupList = [...groups.entries()].sort((a, b) => {
    if (a[0] === "__unassigned") return 1;
    if (b[0] === "__unassigned") return -1;
    return (stakeholderById(stakeholders, a[0])?.name ?? "").localeCompare(stakeholderById(stakeholders, b[0])?.name ?? "");
  });
  groupList.forEach(([, items]) => items.sort((x, y) => (x.dueDate || "9999").localeCompare(y.dueDate || "9999")));

  const recent = stakeholders
    .filter((s) => meetings.slice(0, 2).some((m) => m.mentioned.includes(s.id)))
    .slice(0, 3);

  return (
    <div>
      <Eyebrow>Welcome back, {self.name}</Eyebrow>
      <h1 className="mb-4 mt-1 text-[28px] font-bold leading-tight tracking-tight">What needs your attention</h1>

      <button
        onClick={() => go({ screen: "search" })}
        className="mb-[18px] flex w-full items-center gap-2 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground"
      >
        <Search className="h-[17px] w-[17px]" /> Search topics, people, commitments…
      </button>

      <SectionTitle right={<button onClick={() => go({ screen: "meetings" })} className="text-xs font-semibold text-primary">All</button>}>
        Recent meetings
      </SectionTitle>
      {meetings.slice(0, 3).map((m) => (
        <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2.5 cursor-pointer">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="font-semibold">{m.title}</div>
              <span className="text-xs text-muted-foreground/70">{fmtDate(m.date)}</span>
            </div>
            <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{m.summary}</div>
          </CardContent>
        </Card>
      ))}

      <SectionTitle>Open commitments by stakeholder</SectionTitle>
      {open.length === 0 && (
        <Card className="mb-2.5"><CardContent className="text-muted-foreground/70">Nothing outstanding. Clean slate.</CardContent></Card>
      )}
      {groupList.map(([key, items]) => {
        const person = key === "__unassigned" ? null : stakeholderById(stakeholders, key);
        return (
          <div key={key} className="mb-1.5">
            <button
              className="mb-1.5 mt-2 flex items-center gap-1.5"
              onClick={() => person && go({ screen: "stakeholder", id: person.id })}
            >
              <span className="text-[12px] font-bold tracking-wide text-foreground">{person ? person.name : "Unassigned"}</span>
              <span className="text-[11px] text-muted-foreground/60">· {items.length}</span>
            </button>
            {items.map((cm) => (
              <Card key={cm.id} className="mb-2.5">
                <CardContent>
                  <div className="font-semibold">{cm.text}</div>
                  <DueLabel dueDate={cm.dueDate} due={cm.due} className="mt-1 block" />
                </CardContent>
              </Card>
            ))}
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
