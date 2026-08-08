import { Quote, Star, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bucketDue, fmtFull } from "@/lib/utils";
import type { Theme } from "@/components/ThemeProvider";

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

// Shared light/dark segmented control — used in both the mobile hamburger menu and the
// desktop sidebar (v1.7) so the two chrome variants can't drift out of sync.
export function ThemeToggle({ theme, setTheme, className }: { theme: Theme; setTheme: (t: Theme) => void; className?: string }) {
  return (
    <div className={cn("flex overflow-hidden rounded-md border border-border", className)}>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold",
          theme === "light" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
        )}
      >
        <Sun className="h-3.5 w-3.5" /> Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 py-2 text-[12.5px] font-semibold",
          theme === "dark" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
        )}
      >
        <Moon className="h-3.5 w-3.5" /> Dark
      </button>
    </div>
  );
}

// Five-star row for the deterministic "Relationship Health" heuristic (v1.7). `filled`
// (0-5) stars render solid; the rest render as outlines. Purely presentational — the
// score itself is computed in lib/utils.relationshipHealth from real signals, never an
// opaque AI-generated number.
export function Stars({ filled, className }: { filled: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${filled} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < filled ? "fill-primary text-primary" : "fill-none text-muted-foreground/30")}
          strokeWidth={i < filled ? 0 : 1.5}
        />
      ))}
    </span>
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
