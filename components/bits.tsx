import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { bucketDue, fmtFull } from "@/lib/utils";

// Shared "vibrant" card treatment — a soft violet border + tinted shadow, used on the
// sections the owner wants to feel a bit more alive (recent meetings, commitments,
// expectations). Deliberately not applied to plain form/edit surfaces.
export const vibrantCard = "border border-primary/30 bg-card shadow-[0_2px_12px_-2px_rgba(91,95,199,0.25)]";

export function DueLabel({ dueDate, due, className }: { dueDate?: string | null; due?: string | null; className?: string }) {
  if (!dueDate && !due) return null;
  const overdue = dueDate ? bucketDue(dueDate) === "overdue" : false;
  const text = dueDate ? (overdue ? `Overdue · ${fmtFull(dueDate)}` : `Due ${fmtFull(dueDate)}`) : due;
  return (
    <span className={cn("text-[12px] font-medium", overdue ? "text-warm" : "text-muted-foreground/70", className)}>
      {text}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-1 flex items-baseline justify-between">
      <Eyebrow>{children}</Eyebrow>
      {right}
    </div>
  );
}

export function SourceQuote({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div className="mt-1.5 flex gap-1.5 border-l-2 border-border pl-2.5 text-[12.5px] italic text-muted-foreground/80">
      <Quote className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
