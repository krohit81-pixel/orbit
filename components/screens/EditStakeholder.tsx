"use client";

import { useState } from "react";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { RELATIONSHIPS, cn, stakeholderById } from "@/lib/utils";
import type { Relationship } from "@/lib/types";

export function EditStakeholderScreen({ id }: { id: string }) {
  const { stakeholders, saveStakeholder, deleteStakeholder } = useOrbit();
  const { go } = useFlow();
  const s = stakeholderById(stakeholders, id);

  const [name, setName] = useState(s?.name ?? "");
  const [title, setTitle] = useState(s?.title ?? "");
  const [relationship, setRelationship] = useState<Relationship>(s?.relationship ?? "Peer");
  const [reportsTo, setReportsTo] = useState(s?.reportsTo ?? "");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!s) return <div className="py-10 text-center text-muted-foreground">Stakeholder not found.</div>;

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await saveStakeholder({ ...s, name: name.trim(), title: title.trim() || "—", relationship, reportsTo: reportsTo || null });
      go({ screen: "stakeholder", id });
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteStakeholder(id);
      go({ screen: "people" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3.5">
        <button onClick={() => go({ screen: "stakeholder", id })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Edit stakeholder</div>
      </div>

      <div className="mb-4">
        <Label>Name</Label>
        <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="mb-4">
        <Label>Title</Label>
        <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="mb-4">
        <Label>Relationship</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => (
            <button
              key={r}
              onClick={() => setRelationship(r)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-[13.5px] font-semibold",
                relationship === r ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <Label>Reports to (optional)</Label>
        <select
          value={reportsTo}
          onChange={(e) => setReportsTo(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">—</option>
          {stakeholders.filter((x) => x.id !== id).map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </div>

      <Button className="mt-2 w-full" disabled={!name.trim() || saving} onClick={save}>
        {saving ? <Spinner className="text-primary-foreground" /> : <Check className="h-[18px] w-[18px]" />}
        {saving ? "Saving…" : "Save changes"}
      </Button>

      {!confirming ? (
        <Button variant="secondary" className="mt-2.5 w-full text-warm" onClick={() => setConfirming(true)}>
          <Trash2 className="h-[18px] w-[18px]" /> Delete stakeholder
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-card p-3.5">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{s.name}</span>? Their meetings stay; references to them are cleared.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="warm" className="flex-1" disabled={deleting} onClick={doDelete}>
              {deleting ? <Spinner /> : null} {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button variant="secondary" className="flex-1" disabled={deleting} onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
