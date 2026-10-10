"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Eye, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { Avatar, Details, HealthDots, Panel, PanelEmpty, Spinner, Tag, healthLabel } from "@/components/bits";
import { ActionRow } from "@/components/ActionRow";
import { WatchRow } from "@/components/WatchRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { RELATIONSHIP_HUE } from "@/lib/hues";
import { agoLabel, fmtDate, fmtStamp, intel, relationshipHealth, sortByUrgency, stakeholderById, trajectory } from "@/lib/utils";

// A person (v2.0): who they are and how it's going, what's open between you in each direction,
// what's on watch, and one line per meeting — v1's longer per-meeting trajectory and repeated
// "cares about" lists folded into this.
export function StakeholderScreen({ id }: { id: string }) {
  const { stakeholders, meetings, setSummary } = useOrbit();
  const { go, back } = useFlow();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showExp, setShowExp] = useState(false);

  const s = stakeholderById(stakeholders, id);
  if (!s) return <div className="py-10 text-center text-muted-foreground">Person not found.</div>;
  const it = intel(meetings, id);
  const steps = trajectory(meetings, id);
  const health = relationshipHealth(meetings, id);
  const first = s.name.split(" ")[0];
  const youOwe = sortByUrgency(it.youOwe);
  const owesYou = sortByUrgency(it.owesYou);
  const recurringIds = new Set(steps.flatMap((st) => st.recurringConcerns.map((c) => c.id)));
  const watch = it.cons.slice().sort((a, b) => Number(a.c.status === "resolved") - Number(b.c.status === "resolved") || b.meeting.date.localeCompare(a.meeting.date));
  const directIds = new Set(it.interactions.map((m) => m.id));
  const last = it.interactions[0];
  const manager = s.reportsTo ? stakeholderById(stakeholders, s.reportsTo) : undefined;

  // Same "synthesize" task and history digest as v1 — only the trigger moved.
  const regenerate = async () => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const history = [...steps].reverse().map((st) => {
        const parts: string[] = [`${fmtDate(st.meeting.date)} — ${st.meeting.title}.`];
        if (st.newTopics.length) parts.push(`New topics: ${st.newTopics.join(", ")}.`);
        if (st.expectations.length) parts.push(`Expectations: ${st.expectations.map((e) => e.text).join("; ")}.`);
        if (st.freshConcerns.length) parts.push(`New concerns: ${st.freshConcerns.map((c) => c.text).join("; ")}.`);
        if (st.recurringConcerns.length) parts.push(`Recurring concerns: ${st.recurringConcerns.map((c) => c.text).join("; ")}.`);
        if (st.youCommitted.length) parts.push(`You committed: ${st.youCommitted.map((c) => c.text).join("; ")}.`);
        if (st.theyCommitted.length) parts.push(`They committed: ${st.theyCommitted.map((c) => c.text).join("; ")}.`);
        return parts.join(" ");
      }).join("\n");
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "synthesize", name: s.name, history }),
      });
      const data = await res.json();
      if (!res.ok || !data.summary) throw new Error(data.error || "Couldn't update the summary.");
      await setSummary(id, data.summary);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't update the summary.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <button onClick={back} className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
        <button onClick={() => go({ screen: "editStakeholder", id })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-accent-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /> Edit</button>
      </div>

      <div className="mb-4 flex items-start gap-3.5">
        <Avatar name={s.name} size="lg" />
        <div className="min-w-0">
          <h1 className="o-h1 text-balance text-[26px] font-bold leading-tight tracking-[-0.015em]">{s.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
            <span>{s.title}</span>
            <Tag tone="plain" hue={RELATIONSHIP_HUE[s.relationship]}>{s.relationship}</Tag>
            {manager && <button className="hover:underline" onClick={() => go({ screen: "stakeholder", id: manager.id })}>Reports to {manager.name}</button>}
            <span>{last ? `Last met ${agoLabel(last.date)}` : it.mentionedIn.length ? `Not met yet · mentioned in ${it.mentionedIn.length}` : "Not met yet"}</span>
            {health.stars !== null && <span className="inline-flex items-center gap-1.5"><HealthDots stars={health.stars} /><span className="text-muted-foreground/70">{healthLabel(health.stars)}</span></span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Panel>
          <div className="px-4 pb-4 pt-3.5">
            <div className="max-w-[68ch] text-[15px] leading-relaxed">{s.summary || "No summary yet."}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[12px] text-muted-foreground/70">
              <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
              <span>
                {it.interactions.length === 0 ? "No direct interaction yet"
                  : s.summaryGeneratedAt ? `Updated ${fmtStamp(s.summaryGeneratedAt)} · ${it.interactions.length} interaction${it.interactions.length === 1 ? "" : "s"}`
                  : `Based on ${it.interactions.length} interaction${it.interactions.length === 1 ? "" : "s"}`}
              </span>
              {it.interactions.length > 0 && (
                <button onClick={regenerate} disabled={busy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-accent-foreground hover:bg-accent disabled:opacity-60">
                  {busy ? <><Spinner className="h-3 w-3" /> Updating…</> : <><RefreshCw className="h-3 w-3" /> Update</>}
                </button>
              )}
              {err && <span className="text-warm">{err}</span>}
            </div>
            {it.cares.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">{it.cares.slice(0, 4).map((t) => <Tag key={t} tone="plain">{t}</Tag>)}</div>
            )}
          </div>
        </Panel>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel hue="orange" title={<><ArrowUpRight className="h-3.5 w-3.5" /> You owe {first}</>} count={youOwe.length}>
            {youOwe.length ? youOwe.map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} hidePerson />) : <PanelEmpty>Nothing open.</PanelEmpty>}
          </Panel>
          <Panel hue="green" title={<><ArrowDownLeft className="h-3.5 w-3.5" /> {first} owes you</>} count={owesYou.length}>
            {owesYou.length ? owesYou.map((c) => <ActionRow key={c.id} c={c} meeting={c.meeting} hidePerson nudge />) : <PanelEmpty>Nothing open.</PanelEmpty>}
          </Panel>
        </div>

        {watch.length > 0 && (
          <Panel hue="violet" title={<><Eye className="h-3.5 w-3.5" /> Watch</>} count={watch.filter((w) => w.c.status !== "resolved").length}>
            {watch.map(({ c, meeting }) => <WatchRow key={c.id} concern={c} meeting={meeting} recurring={recurringIds.has(c.id)} hidePerson />)}
          </Panel>
        )}

        {it.exps.length > 0 && (
          <Panel>
            <Details first label={`What ${first} expects (${it.exps.length})`} open={showExp} onToggle={() => setShowExp((v) => !v)}>
              <ul className="flex flex-col gap-2 px-4 pb-4 pl-10">
                {it.exps.map(({ e, meeting }) => (
                  <li key={e.id} className="list-disc">
                    {e.text}{" "}
                    <button className="text-[12.5px] text-muted-foreground/70 hover:underline" onClick={() => go({ screen: "meeting", id: meeting.id })}>· {meeting.title}</button>
                  </li>
                ))}
              </ul>
            </Details>
          </Panel>
        )}

        <Panel hue="teal" title="History" count={it.mentionedIn.length}>
          {it.mentionedIn.length === 0 && <PanelEmpty>No meetings yet.</PanelEmpty>}
          {it.mentionedIn.map((m) => {
            const n = m.commitments.filter((c) => c.ownerId === id || c.owedToId === id).length;
            return (
              <button
                key={m.id}
                onClick={() => go({ screen: "meeting", id: m.id })}
                className="o-row grid w-full grid-cols-[64px_minmax(0,1fr)] gap-3 border-t border-border px-4 py-2.5 text-left last:rounded-b-xl hover:bg-secondary"
              >
                <span className="pt-px text-[12.5px] font-semibold tabular-nums text-muted-foreground">{fmtDate(m.date)}</span>
                <span className="min-w-0">
                  <span className="block font-semibold">{m.title}</span>
                  <span className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{m.summary}</span>
                  <span className="mt-1 block text-[12px] text-muted-foreground/70">
                    {directIds.has(m.id) ? (n ? `${n} action${n === 1 ? "" : "s"} with ${first}` : "") : `Mentioned · nothing attributed to ${first}`}
                  </span>
                </span>
              </button>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
