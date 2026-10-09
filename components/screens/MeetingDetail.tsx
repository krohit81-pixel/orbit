"use client";

import { useState } from "react";
import { ArrowLeft, Eye, FileDown, Pencil } from "lucide-react";
import { Avatar, Details, Panel, PanelEmpty, Tag } from "@/components/bits";
import { ActionRow } from "@/components/ActionRow";
import { WatchRow } from "@/components/WatchRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { recurringConcernIds, stakeholderById } from "@/lib/utils";

// A meeting (v2.0): summary and decisions up front, then what it produced (actions, watch
// items). Topics, expectations, action items and the transcript stay one tap away.
export function MeetingScreen({ id }: { id: string }) {
  const { meetings, stakeholders } = useOrbit();
  const { go, back } = useFlow();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const m = meetings.find((x) => x.id === id);
  if (!m) return <div className="py-10 text-center text-muted-foreground">Meeting not found.</div>;

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const recurring = recurringConcernIds(meetings, m.id);
  const people = m.mentioned.map((sid) => stakeholderById(stakeholders, sid)).filter((s): s is NonNullable<typeof s> => !!s);
  const details: { key: string; label: string; body: React.ReactNode }[] = [];
  if (m.topics.length) details.push({ key: "topics", label: "Topics", body: <div className="flex flex-wrap gap-1.5 px-4 pb-4">{m.topics.map((t) => <Tag key={t} tone="plain">{t}</Tag>)}</div> });
  if (m.expectations.length) details.push({
    key: "exp", label: `What they expect (${m.expectations.length})`,
    body: (
      <ul className="flex flex-col gap-1.5 px-4 pb-4 pl-10">
        {m.expectations.map((e) => (
          <li key={e.id} className="list-disc">
            {e.text}
            {e.stakeholderId && <span className="text-[12.5px] text-muted-foreground/70"> · {stakeholderById(stakeholders, e.stakeholderId)?.name}</span>}
            {e.status === "met" && <Tag tone="green" className="ml-1.5">Met</Tag>}
          </li>
        ))}
      </ul>
    ),
  });
  if (m.actionItems.length) details.push({ key: "items", label: `Action items (${m.actionItems.length})`, body: <ul className="flex flex-col gap-1.5 px-4 pb-4 pl-10">{m.actionItems.map((a, i) => <li key={i} className="list-disc">{a}</li>)}</ul> });
  details.push({
    key: "notes", label: "Notes and transcript",
    body: m.transcript
      ? <div className="mx-4 mb-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[10px] bg-secondary px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">{m.transcript}</div>
      : <PanelEmpty>No transcript stored. <button className="font-semibold text-accent-foreground hover:underline" onClick={() => go({ screen: "editMeeting", id })}>Add one</button></PanelEmpty>,
  });

  const date = new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const linkBtn = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-accent-foreground hover:bg-accent";

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <button onClick={back} className="inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
        <span className="flex gap-1">
          <button onClick={() => go({ screen: "meetingPrint", id })} className={linkBtn}><FileDown className="h-3.5 w-3.5" /> Export PDF</button>
          <button onClick={() => go({ screen: "editMeeting", id })} className={linkBtn}><Pencil className="h-3.5 w-3.5" /> Edit</button>
        </span>
      </div>
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{date}</div>
      <h1 className="mt-0.5 text-balance text-[26px] font-bold leading-tight tracking-[-0.015em]">{m.title}</h1>
      {people.length > 0 && (
        <div className="mb-[18px] mt-2.5 flex flex-wrap gap-1.5">
          {people.map((p) => (
            <button key={p.id} onClick={() => go({ screen: "stakeholder", id: p.id })} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-[3px] pl-[3px] pr-2.5 text-[12.5px] font-semibold hover:border-primary">
              <Avatar name={p.name} size="xs" />{p.name}
            </button>
          ))}
        </div>
      )}

      <div className={`flex flex-col gap-4 ${people.length ? "" : "mt-[18px]"}`}>
        <Panel>
          <p className="max-w-[70ch] px-4 pb-4 pt-3.5 text-[16px] leading-relaxed">{m.summary || "No summary."}</p>
          {m.decisions.length > 0 && (
            <>
              <div className="px-4 pb-2 text-[14px] font-semibold">Decisions</div>
              <ol className="flex list-decimal flex-col gap-1.5 pb-3.5 pl-[34px] pr-4">{m.decisions.map((d, i) => <li key={i}>{d}</li>)}</ol>
            </>
          )}
        </Panel>

        <Panel title="Actions from this meeting" count={m.commitments.length}>
          {m.commitments.length ? m.commitments.map((c) => <ActionRow key={c.id} c={c} meeting={m} hideSource nudge />) : <PanelEmpty>No actions came out of this meeting.</PanelEmpty>}
        </Panel>

        {m.concerns.length > 0 && (
          <Panel title={<><Eye className="h-3.5 w-3.5" /> Watch</>} count={m.concerns.filter((c) => c.status !== "resolved").length}>
            {m.concerns.map((c) => <WatchRow key={c.id} concern={c} meeting={m} recurring={recurring.has(c.id)} />)}
          </Panel>
        )}

        <Panel>
          {details.map((d, i) => (
            <Details key={d.key} first={i === 0} label={d.label} open={!!open[d.key]} onToggle={() => toggle(d.key)}>{d.body}</Details>
          ))}
        </Panel>
      </div>
    </div>
  );
}
