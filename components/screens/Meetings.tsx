"use client";

import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { vibrantCard } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { cn, fmtDate } from "@/lib/utils";

export function MeetingsScreen() {
  const { meetings } = useOrbit();
  const { go } = useFlow();
  return (
    <div>
      <h1 className="py-2 text-[26px] font-bold tracking-tight">Meetings</h1>
      <Button className="w-full" onClick={() => go({ screen: "capture" })}>
        <Plus className="h-[18px] w-[18px]" /> Add meeting
      </Button>
      <div className="h-[18px]" />
      {meetings.map((m) => (
        <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className={cn(vibrantCard, "mb-2.5 cursor-pointer")}>
          <CardContent>
            <div className="font-semibold leading-snug">{m.title}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground/70">{fmtDate(m.date)}</div>
            <div className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{m.summary}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
