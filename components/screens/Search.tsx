"use client";

import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { matchesQuery, fmtFull } from "@/lib/utils";

export function SearchScreen() {
  const { stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const [q, setQ] = useState("");

  const active = q.trim().length > 0;
  const people = active ? stakeholders.filter((s) => matchesQuery(q, s.name) || matchesQuery(q, s.title)) : [];
  const mtgs = active ? meetings.filter((m) => matchesQuery(q, m.title) || matchesQuery(q, m.summary) || m.topics.some((t) => matchesQuery(q, t))) : [];
  const exps = active ? meetings.flatMap((m) => m.expectations.filter((e) => matchesQuery(q, e.text)).map((e) => ({ e, m }))) : [];
  const comms = active ? meetings.flatMap((m) => m.commitments.filter((c) => matchesQuery(q, c.text)).map((c) => ({ c, m }))) : [];
  const cons = active ? meetings.flatMap((m) => m.concerns.filter((c) => matchesQuery(q, c.text)).map((c) => ({ c, m }))) : [];
  const total = people.length + mtgs.length + exps.length + comms.length + cons.length;

  return (
    <div>
      <h1 className="py-2 text-[26px] font-bold tracking-tight">Search</h1>
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
        <SearchIcon className="h-[17px] w-[17px] text-muted-foreground/70" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: risk appetite, hiring, Maya…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
        />
        {q && <button onClick={() => setQ("")}><X className="h-4 w-4 text-muted-foreground/70" /></button>}
      </div>

      {active && total === 0 && (
        <div className="mt-6 text-center text-muted-foreground/70">Nothing matches “{q}” yet.</div>
      )}

      {!active && (
        <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground/70">
          One box across everything you&apos;ve captured — people, meetings, expectations, commitments and concerns.
        </p>
      )}

      {people.length > 0 && (
        <div className="mb-[18px]"><SectionTitle>Stakeholders</SectionTitle>
          {people.map((s) => (
            <Card key={s.id} onClick={() => go({ screen: "stakeholder", id: s.id })} className="mb-2 cursor-pointer"><CardContent>
              <div className="font-semibold">{s.name}</div><div className="text-[12.5px] text-muted-foreground">{s.title}</div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {mtgs.length > 0 && (
        <div className="mb-[18px]"><SectionTitle>Meetings</SectionTitle>
          {mtgs.map((m) => (
            <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2 cursor-pointer"><CardContent>
              <div className="font-semibold">{m.title}</div><div className="text-[12.5px] text-muted-foreground">{fmtFull(m.date)}</div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {exps.length > 0 && (
        <div className="mb-[18px]"><SectionTitle>Expectations</SectionTitle>
          {exps.map(({ e, m }) => (
            <Card key={e.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2 cursor-pointer"><CardContent>
              <div className="font-semibold">{e.text}</div><div className="text-xs text-muted-foreground/70">{m.title}</div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {comms.length > 0 && (
        <div className="mb-[18px]"><SectionTitle>Commitments</SectionTitle>
          {comms.map(({ c, m }) => (
            <Card key={c.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2 cursor-pointer"><CardContent>
              <div className="font-semibold">{c.text}</div><div className="text-xs text-muted-foreground/70">{m.title}</div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {cons.length > 0 && (
        <div className="mb-[18px]"><SectionTitle>Concerns</SectionTitle>
          {cons.map(({ c, m }) => (
            <Card key={c.id} onClick={() => go({ screen: "meeting", id: m.id })} className="mb-2 cursor-pointer"><CardContent>
              <div className="font-semibold">{c.text}</div><div className="text-xs text-muted-foreground/70">{m.title}</div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
