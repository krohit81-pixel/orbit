"use client";

import { AlertTriangle, Check, CircleDot, ListChecks, Tags, Users } from "lucide-react";
import { TILE_BUCKET_BG } from "@/components/bits";
import { cn, dueTileInfo } from "@/lib/utils";
import type { Meeting } from "@/lib/types";

// Deterministic "at a glance" graphic for the top of a meeting, next to the executive
// summary and before the detail sections (v1.12). Built entirely from this meeting's own
// already-extracted fields — no extra LLM call, no image generation, nothing to hallucinate.
// Mirrors MeetingScreen's own section order (Topics, Expectations, Commitments, Concerns,
// Decisions, People) so it reads as a compressed preview of what follows, and reuses the
// dashboard commitment tiles' exact red/amber/green background tokens (TILE_BUCKET_BG) so
// the two places agree on what "overdue" looks like.
function StatChip({ icon: Icon, count, label }: { icon: typeof Tags; count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-[12px] font-semibold">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {count} <span className="font-normal text-muted-foreground">{label}</span>
    </span>
  );
}

export function MeetingSnapshot({ meeting: m }: { meeting: Meeting }) {
  const chips: { icon: typeof Tags; count: number; label: string }[] = [
    { icon: Tags, count: m.topics.length, label: m.topics.length === 1 ? "topic" : "topics" },
    { icon: ListChecks, count: m.expectations.length, label: m.expectations.length === 1 ? "expectation" : "expectations" },
    { icon: CircleDot, count: m.commitments.length, label: m.commitments.length === 1 ? "commitment" : "commitments" },
    { icon: AlertTriangle, count: m.concerns.length, label: m.concerns.length === 1 ? "concern" : "concerns" },
    { icon: Check, count: m.decisions.length, label: m.decisions.length === 1 ? "decision" : "decisions" },
    { icon: Users, count: m.mentioned.length, label: m.mentioned.length === 1 ? "person" : "people" },
  ].filter((c) => c.count > 0);

  if (chips.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => <StatChip key={c.label} {...c} />)}
      </div>
      {m.commitments.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
            Commitment status
          </span>
          <div className="flex gap-1">
            {m.commitments.map((cm) => (
              <span
                key={cm.id}
                title={cm.text}
                className={cn("h-2.5 w-2.5 rounded-full", cm.status === "done" ? "bg-secondary" : TILE_BUCKET_BG[dueTileInfo(cm.dueDate).bucket])}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
