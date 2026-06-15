"use client";

import { Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, SectionTitle } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { bucketDue, fmtDate, intel, myOpenCommitments, stakeholderById, type DueBucket, type OpenCommitment } from "@/lib/utils";

export function HomeScreen() {
  const { self, stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const open = myOpenCommitments(meetings);

  const groups: Record<DueBucket, OpenCommitment[]> = { overdue: [], week: [], upcoming: [], undated: [] };
  open.forEach((cm) => groups[bucketDue(cm.dueDate)].push(cm));
  (Object.keys(groups) as DueBucket[]).forEach((k) =>
    groups[k].sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))
  );
  const order: { key: DueBucket; label: string }[] = [
    { key: "overdue", label: "Overdue" },
    { key: "week", label: "This week" },
    { key: "upcoming", label: "Upcoming" },
    { key: "undated", label: "No date yet" },
  ];

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

      <SectionTitle>Your open commitments</SectionTitle>
      {open.length === 0 && (
        <Card className="mb-2.5"><CardContent className="text-muted-foreground/70">Nothing outstanding. Clean slate.</CardContent></Card>
      )}
      {order.map(({ key, label }) =>
        groups[key].length === 0 ? null : (
          <div key={key}>
            <div className={`mb-1.5 mt-2 text-[11px] font-bold tracking-wide ${key === "overdue" ? "text-warm" : "text-muted-foreground/60"}`}>{label}</div>
            {groups[key].map((cm) => (
              <Card key={cm.id} className="mb-2.5">
                <CardContent className="flex justify-between gap-2.5">
                  <div>
                    <div className="font-semibold">{cm.text}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {cm.stakeholderId ? stakeholderById(stakeholders, cm.stakeholderId)?.name : "—"}
                    </div>
                  </div>
                  {cm.dueDate ? (
                    <Badge variant={key === "overdue" ? "warm" : "accent"}>{fmtDate(cm.dueDate)}</Badge>
                  ) : cm.due ? (
                    <Badge variant="warm">{cm.due}</Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

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
