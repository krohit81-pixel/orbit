"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { RELATIONSHIPS, cn } from "@/lib/utils";
import type { Relationship } from "@/lib/types";

export function AddStakeholderScreen() {
  const { stakeholders, addStakeholder } = useOrbit();
  const { go } = useFlow();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("Peer");
  const [reportsTo, setReportsTo] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await addStakeholder({ name, title, relationship, reportsTo: reportsTo || null });
    go({ screen: "people" });
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3.5">
        <button onClick={() => go({ screen: "people" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Add stakeholder</div>
      </div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
        Kept deliberately light. Everything else builds itself from meetings.
      </p>

      <div className="mb-4">
        <Label>Name</Label>
        <Input className="mt-1.5" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tim Healy" />
      </div>
      <div className="mb-4">
        <Label>Title</Label>
        <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Head of US CRO" />
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
                relationship === r
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <Label>Reports to (optional — builds the org map)</Label>
        <select
          value={reportsTo}
          onChange={(e) => setReportsTo(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md border border-input bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">—</option>
          {stakeholders.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <Button className="mt-2 w-full" disabled={!name.trim() || saving} onClick={save}>
        <Check className="h-[18px] w-[18px]" /> Add stakeholder
      </Button>
    </div>
  );
}
