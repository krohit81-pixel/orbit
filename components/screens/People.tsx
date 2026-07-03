"use client";

import { Search, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { intel, fmtFull } from "@/lib/utils";

export function PeopleScreen() {
  const { stakeholders, meetings } = useOrbit();
  const { go } = useFlow();

  return (
    <div>
      <div className="flex items-center justify-between py-2">
        <h1 className="text-[26px] font-bold tracking-tight">People</h1>
        <button
          onClick={() => go({ screen: "addStakeholder" })}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Add stakeholder"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={() => go({ screen: "search" })}
        className="mb-[18px] flex w-full items-center gap-2 rounded-xl bg-secondary px-3.5 py-3 text-sm text-muted-foreground"
      >
        <Search className="h-[17px] w-[17px]" /> Find a stakeholder…
      </button>

      {stakeholders.map((s) => {
        const it = intel(meetings, s.id);
        return (
          <Card key={s.id} onClick={() => go({ screen: "stakeholder", id: s.id })} className="mb-2.5 cursor-pointer">
            <CardContent>
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{s.name}</div>
                  <div className="truncate text-[13px] text-muted-foreground">{s.title}</div>
                </div>
                <Badge variant="accent">{s.relationship}</Badge>
              </div>
              <div className="mt-2.5 text-[12.5px] text-muted-foreground/70">
                {it.interactions[0] ? `Last interaction · ${fmtFull(it.interactions[0].date)}` : "No interactions yet"} · {it.exps.length} open expectation(s)
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
