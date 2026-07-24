"use client";

import { useState } from "react";
import { ArrowLeft, Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import type { Commitment, Concern, Expectation, Meeting } from "@/lib/types";

export function EditMeetingScreen({ id }: { id: string }) {
  const { meetings, stakeholders, saveMeeting, deleteMeeting } = useOrbit();
  const { go } = useFlow();
  const original = meetings.find((m) => m.id === id);
  const [m, setM] = useState<Meeting | null>(original ?? null);
  const [confirming, setConfirming] = useState(false);

  if (!m) return <div className="py-10 text-center text-muted-foreground">Meeting not found.</div>;

  const setField = <K extends keyof Meeting>(k: K, v: Meeting[K]) => setM({ ...m, [k]: v });

  const editExp = (i: number, patch: Partial<Expectation>) =>
    setField("expectations", m.expectations.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const editCom = (i: number, patch: Partial<Commitment>) =>
    setField("commitments", m.commitments.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const editCon = (i: number, patch: Partial<Concern>) =>
    setField("concerns", m.concerns.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const StakeholderSelect = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">Unassigned</option>
      {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );

  const PartySelect = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-9 rounded-md border border-input bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="me">You</option>
      <option value="">—</option>
      {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );

  const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} className="text-muted-foreground/60 hover:text-warm" aria-label="Remove"><X className="h-4 w-4" /></button>
  );

  const save = async () => {
    await saveMeeting(m);
    go({ screen: "meeting", id });
  };
  const doDelete = async () => {
    await deleteMeeting(id);
    go({ screen: "meetings" });
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3">
        <button onClick={() => go({ screen: "meeting", id })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Edit meeting</div>
      </div>

      <div className="mb-4"><Label>Title</Label>
        <Input className="mt-1.5" value={m.title} onChange={(e) => setField("title", e.target.value)} />
      </div>
      <div className="mb-4"><Label>Date</Label>
        <Input type="date" className="mt-1.5" value={m.date} onChange={(e) => setField("date", e.target.value)} />
        <p className="mt-1 text-[11.5px] text-muted-foreground/70">Trajectory and intelligence re-order to this date automatically.</p>
      </div>
      <div className="mb-4"><Label>Summary</Label>
        <Textarea className="mt-1.5" rows={3} value={m.summary} onChange={(e) => setField("summary", e.target.value)} />
      </div>

      {m.expectations.length > 0 && (
        <div className="mb-4"><SectionTitle>Expectations</SectionTitle>
          {m.expectations.map((e, i) => (
            <div key={e.id} className="mb-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <Input value={e.text} onChange={(ev) => editExp(i, { text: ev.target.value })} className="h-9 flex-1 text-[13px]" />
                <RemoveBtn onClick={() => setField("expectations", m.expectations.filter((_, idx) => idx !== i))} />
              </div>
              <div className="mt-2"><StakeholderSelect value={e.stakeholderId} onChange={(v) => editExp(i, { stakeholderId: v })} /></div>
            </div>
          ))}
        </div>
      )}

      {m.commitments.length > 0 && (
        <div className="mb-4"><SectionTitle>Commitments</SectionTitle>
          {m.commitments.map((cm, i) => (
            <div key={cm.id} className="mb-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <Input value={cm.text} onChange={(ev) => editCom(i, { text: ev.target.value })} className="h-9 flex-1 text-[13px]" />
                <RemoveBtn onClick={() => setField("commitments", m.commitments.filter((_, idx) => idx !== i))} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                <PartySelect value={cm.ownerId} onChange={(v) => editCom(i, { ownerId: v })} />
                <span className="text-muted-foreground">owes</span>
                <PartySelect value={cm.owedToId} onChange={(v) => editCom(i, { owedToId: v })} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Label>Due</Label>
                <Input type="date" value={cm.dueDate ?? ""} onChange={(ev) => editCom(i, { dueDate: ev.target.value || null, due: null })} className="h-9 w-auto text-[13px]" />
                {cm.dueDate && <button className="text-[12px] text-muted-foreground/70 underline" onClick={() => editCom(i, { dueDate: null })}>clear</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {m.concerns.length > 0 && (
        <div className="mb-4"><SectionTitle>Concerns</SectionTitle>
          {m.concerns.map((cn, i) => (
            <div key={cn.id} className="mb-2.5 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <Input value={cn.text} onChange={(ev) => editCon(i, { text: ev.target.value })} className="h-9 flex-1 text-[13px]" />
                <RemoveBtn onClick={() => setField("concerns", m.concerns.filter((_, idx) => idx !== i))} />
              </div>
              <div className="mt-2"><StakeholderSelect value={cn.stakeholderId} onChange={(v) => editCon(i, { stakeholderId: v })} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <SectionTitle>Meeting transcript</SectionTitle>
        <Textarea
          rows={8}
          placeholder="Paste or add the original transcript/notes for this meeting…"
          value={m.transcript ?? ""}
          onChange={(e) => setField("transcript", e.target.value)}
        />
        <p className="mt-1 text-[11.5px] text-muted-foreground/70">
          Stored for reference. Older meetings may not have one yet — add it here if you want to keep it.
        </p>
      </div>

      <Button className="mt-2 w-full" onClick={save}><Check className="h-[18px] w-[18px]" /> Save changes</Button>

      {!confirming ? (
        <Button variant="secondary" className="mt-2.5 w-full text-warm" onClick={() => setConfirming(true)}>
          <Trash2 className="h-[18px] w-[18px]" /> Delete meeting
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-card p-3.5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{m.title}</span> and everything extracted from it? This can&apos;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="warm" className="flex-1" onClick={doDelete}>Yes, delete</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
