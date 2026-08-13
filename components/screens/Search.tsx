"use client";

import { useState } from "react";
import { Search as SearchIcon, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle, Spinner } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { matchesQuery, fmtFull, assistantDigest } from "@/lib/utils";
import type { AssistantAnswer } from "@/lib/types";

export function SearchScreen() {
  const { stakeholders, meetings } = useOrbit();
  const { go } = useFlow();
  const [q, setQ] = useState("");

  // ---- Ask Orbit ----
  // Deliberate, manual only — never fires on keystrokes, only on explicit submit. Ephemeral,
  // not cached: unlike Today's Brief there's no single "the" answer to remember, a new
  // question just replaces the last one. See lib/utils.assistantDigest + the "ask" LLM task.
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState("");

  const updateQuery = (v: string) => {
    setQ(v);
    setAnswer(null);
    setAskErr("");
  };

  const ask = async () => {
    if (!q.trim() || asking || meetings.length === 0) return;
    setAsking(true);
    setAskErr("");
    setAnswer(null);
    try {
      const context = assistantDigest(meetings, stakeholders);
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "ask", question: q, context }),
      });
      const json = await res.json();
      if (!res.ok || !json.result) throw new Error(json.error || "Couldn't get an answer.");
      setAnswer(json.result as AssistantAnswer);
    } catch (e) {
      setAskErr(e instanceof Error ? e.message : "Couldn't get an answer.");
    } finally {
      setAsking(false);
    }
  };

  // Only ever link to sources that resolve to a real meeting — the model's title/date text
  // is a citation hint, never trusted for display; a hallucinated id just silently drops.
  const resolvedSources = (answer?.sources ?? [])
    .map((src) => meetings.find((m) => m.id === src.meetingId))
    .filter((m): m is NonNullable<typeof m> => !!m);

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
      <div className="mb-2.5 flex items-center gap-2 rounded-xl bg-secondary px-3.5 py-3">
        <SearchIcon className="h-[17px] w-[17px] text-muted-foreground/70" />
        <input
          autoFocus
          value={q}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="Try: risk appetite, hiring, Maya… or ask a question"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
        />
        {q && <button onClick={() => updateQuery("")} aria-label="Clear"><X className="h-4 w-4 text-muted-foreground/70" /></button>}
      </div>

      {active && meetings.length > 0 && (
        <button
          onClick={ask}
          disabled={asking}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2.5 text-[13.5px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {asking ? <Spinner className="text-primary-foreground" /> : <Sparkles className="h-[16px] w-[16px]" />}
          {asking ? "Asking…" : `Ask Orbit about "${q}"`}
        </button>
      )}

      {askErr && <div className="mb-4 text-[13px] text-warm">{askErr}</div>}

      {answer && (
        <div className="mb-[18px] rounded-md border border-primary/30 bg-accent/40 px-3.5 py-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">
            <Sparkles className="h-3 w-3" /> Answer
          </div>
          <div className="text-[14.5px] leading-relaxed">{answer.answer}</div>
          {resolvedSources.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {resolvedSources.map((m) => (
                <button
                  key={m.id}
                  onClick={() => go({ screen: "meeting", id: m.id })}
                  className="block w-full rounded-md border border-primary/20 bg-card px-2.5 py-2 text-left"
                >
                  <div className="text-[13px] font-semibold text-primary">{m.title}</div>
                  <div className="text-[11.5px] text-muted-foreground/70">{fmtFull(m.date)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {active && total === 0 && !answer && (
        <div className="mt-2 text-center text-muted-foreground/70">Nothing matches “{q}” yet.</div>
      )}

      {!active && (
        <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground/70">
          One box across everything you&apos;ve captured — people, meetings, expectations, commitments and concerns. Or ask a question in plain English and tap “Ask Orbit”.
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
