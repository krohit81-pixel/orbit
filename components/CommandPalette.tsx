"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Search, Sparkles } from "lucide-react";
import { Avatar, DueChip, Modal, Spinner } from "@/components/bits";
import { DirIcon } from "@/components/ActionRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { assistantDigest, commitmentLabel, fmtDate, intel, matchesQuery, openCommitmentsInvolvingMe } from "@/lib/utils";
import type { AssistantAnswer } from "@/lib/types";

type Item =
  | { kind: "person"; id: string }
  | { kind: "meeting"; id: string }
  | { kind: "action"; meetingId: string; commitmentId: string }
  | { kind: "ask" };

// v2.0's one search box (⌘K or "/"), replacing v1's Search tab. Typing filters people,
// meetings and open actions instantly, in memory. "Ask Orbit" sends the question to the
// existing "ask" LLM task only when chosen explicitly (Enter or a click) — never on a
// keystroke — and, as in v1.9, only renders sources that resolve to a real meeting.
export function CommandPalette() {
  const { stakeholders, meetings } = useOrbit();
  const { setOverlay, go, openAction } = useFlow();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(-1);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [askErr, setAskErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const close = () => setOverlay(null);
  const t = q.trim();

  const results = useMemo(() => {
    if (!t) {
      const lastMet = (id: string) => intel(meetings, id).interactions[0]?.date ?? "";
      return {
        people: stakeholders.slice().sort((a, b) => lastMet(b.id).localeCompare(lastMet(a.id))).slice(0, 4),
        meetings: meetings.slice(0, 3),
        actions: [] as ReturnType<typeof openCommitmentsInvolvingMe>,
      };
    }
    return {
      people: stakeholders.filter((s) => matchesQuery(t, `${s.name} ${s.title} ${s.relationship}`)).slice(0, 4),
      meetings: meetings.filter((m) => matchesQuery(t, `${m.title} ${m.summary} ${m.topics.join(" ")}`)).slice(0, 4),
      actions: openCommitmentsInvolvingMe(meetings).filter((c) => matchesQuery(t, `${c.text} ${commitmentLabel(c, stakeholders)}`)).slice(0, 5),
    };
  }, [t, stakeholders, meetings]);

  const items: Item[] = [
    ...results.people.map((p) => ({ kind: "person" as const, id: p.id })),
    ...results.meetings.map((m) => ({ kind: "meeting" as const, id: m.id })),
    ...results.actions.map((c) => ({ kind: "action" as const, meetingId: c.meeting.id, commitmentId: c.id })),
    ...(t && meetings.length ? [{ kind: "ask" as const }] : []),
  ];

  const ask = async () => {
    if (!t || asking) return;
    setAsking(true);
    setAskErr("");
    setAnswer(null);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "ask", question: t, context: assistantDigest(meetings, stakeholders) }),
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

  const choose = (it: Item) => {
    if (it.kind === "ask") return void ask();
    close();
    if (it.kind === "person") go({ screen: "stakeholder", id: it.id });
    else if (it.kind === "meeting") go({ screen: "meeting", id: it.id });
    else openAction({ meetingId: it.meetingId, commitmentId: it.commitmentId });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!items.length) return;
      setSel((s) => (s + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (sel >= 0 && items[sel]) choose(items[sel]);
      else if (t) void ask();
    }
  };

  const sources = (answer?.sources ?? []).map((s) => meetings.find((m) => m.id === s.meetingId)).filter((m): m is NonNullable<typeof m> => !!m);
  let idx = -1;
  const rowCls = (i: number) => `flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-secondary ${i === sel ? "bg-secondary" : ""}`;
  const groupCls = "o-palg px-4 pb-1 pt-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground/70";

  return (
    <Modal onClose={close} label="Search and ask">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
        <Search className="h-[18px] w-[18px] text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(-1); setAnswer(null); setAskErr(""); }}
          onKeyDown={onKey}
          placeholder="Find a person, meeting or action, or ask a question"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
        <kbd className="rounded border border-border px-1.5 text-[11px] text-muted-foreground/70">Esc</kbd>
      </div>
      <div className="pb-2 pt-1.5">
        {(answer || asking || askErr) && (
          <div className="mx-4 mb-2 mt-2 rounded-[10px] bg-accent px-3.5 py-3">
            <div className="flex items-center gap-1.5 font-semibold text-accent-foreground"><Sparkles className="h-3.5 w-3.5" /> Orbit</div>
            {asking && <div className="mt-1.5 flex items-center gap-2 text-muted-foreground"><Spinner className="h-3.5 w-3.5" /> Reading your meetings…</div>}
            {askErr && <p className="mt-1.5 text-warm">{askErr}</p>}
            {answer && <p className="mt-1.5 leading-relaxed">{answer.answer}</p>}
            {sources.length > 0 && (
              <div className="mt-2 flex flex-col items-start gap-1">
                {sources.map((m) => (
                  <button key={m.id} className="font-semibold text-accent-foreground hover:underline" onClick={() => { close(); go({ screen: "meeting", id: m.id }); }}>
                    {m.title} · {fmtDate(m.date)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {results.people.length > 0 && <div className={groupCls}>{t ? "People" : "Recent people"}</div>}
        {results.people.map((p) => { idx++; const i = idx; return (
          <button key={p.id} className={rowCls(i)} onClick={() => choose({ kind: "person", id: p.id })}>
            <Avatar name={p.name} size="xs" />
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{p.name}</span> <span className="text-[12.5px] text-muted-foreground/70">{p.title}</span></span>
          </button>
        ); })}

        {results.meetings.length > 0 && <div className={groupCls}>{t ? "Meetings" : "Recent meetings"}</div>}
        {results.meetings.map((m) => { idx++; const i = idx; return (
          <button key={m.id} className={rowCls(i)} onClick={() => choose({ kind: "meeting", id: m.id })}>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{m.title}</span> <span className="text-[12.5px] text-muted-foreground/70">{fmtDate(m.date)}</span></span>
          </button>
        ); })}

        {results.actions.length > 0 && <div className={groupCls}>Actions</div>}
        {results.actions.map((c) => { idx++; const i = idx; return (
          <button key={c.id} className={rowCls(i)} onClick={() => choose({ kind: "action", meetingId: c.meeting.id, commitmentId: c.id })}>
            <DirIcon c={c} className="text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{c.text}</span> <span className="text-[12.5px] text-muted-foreground/70">{commitmentLabel(c, stakeholders)}</span></span>
            <DueChip dueDate={c.dueDate} due={c.due} />
          </button>
        ); })}

        {t && meetings.length > 0 && (() => { idx++; const i = idx; return (
          <>
            <div className={groupCls}>Ask</div>
            <button className={rowCls(i)} onClick={() => choose({ kind: "ask" })} disabled={asking}>
              <Sparkles className="h-4 w-4 shrink-0 text-accent-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">Ask Orbit: “{t}”</span>
              <kbd className="rounded border border-border px-1.5 text-[11px] text-muted-foreground/70">Enter</kbd>
            </button>
          </>
        ); })()}

        {t && !results.people.length && !results.meetings.length && !results.actions.length && !answer && !asking && (
          <div className="px-4 pt-2 text-[13px] text-muted-foreground/70">No direct matches. Ask Orbit instead.</div>
        )}
      </div>
    </Modal>
  );
}
