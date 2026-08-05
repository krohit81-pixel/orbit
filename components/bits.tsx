import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { bucketDue, fmtFull } from "@/lib/utils";

// Shared "vibrant" card treatment — a soft violet border + tinted shadow, used on the
// sections the owner wants to feel a bit more alive (recent meetings, commitments,
// expectations). Deliberately not applied to plain form/edit surfaces.
export const vibrantCard = "border border-primary/30 bg-card shadow-[0_2px_12px_-2px_rgba(91,95,199,0.25)]";

// A small "in progress" ring — use this anywhere an async action (network/DB call) is
// underway, so it's always visually obvious that Orbit is working on something.
export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

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
