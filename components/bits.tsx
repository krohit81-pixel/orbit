"use client";

import { useEffect } from "react";
import { ChevronRight, Quote, X } from "lucide-react";
import { cn, dueChip } from "@/lib/utils";

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

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70", className)}>
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

// ---- v2.0 building blocks ----

// Page title block used at the top of every main screen: a small eyebrow over a balanced h1,
// with optional actions on the right that wrap underneath on a phone.
export function PageHead({ eyebrow, title, right }: { eyebrow?: React.ReactNode; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-0.5 text-balance text-[26px] font-bold leading-tight tracking-[-0.015em]">{title}</h1>
      </div>
      {right && <div className="flex flex-wrap gap-2">{right}</div>}
    </div>
  );
}

// A titled panel: the one container style in 2.0. Rows inside draw their own top divider.
export function Panel({
  title, count, right, children, footer, className, id,
}: {
  title?: React.ReactNode;
  count?: number | null;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: { label: string; onClick: () => void };
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("min-w-0 rounded-xl border border-border bg-card", className)}>
      {(title || right) && (
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-3">
          <span className="flex items-center gap-1.5 text-[14px] font-semibold">{title}</span>
          {count !== undefined && count !== null && (
            <span className="text-[12px] font-bold tabular-nums text-muted-foreground/70">{count}</span>
          )}
          {right && <span className="ml-auto">{right}</span>}
        </div>
      )}
      {children}
      {footer && (
        <button
          onClick={footer.onClick}
          className="block w-full rounded-b-xl border-t border-border px-4 py-2.5 text-left text-[13px] font-semibold text-accent-foreground hover:bg-secondary"
        >
          {footer.label}
        </button>
      )}
    </section>
  );
}

export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-4 pt-1 text-[13px] text-muted-foreground/70">{children}</div>;
}

// The due-date pill on every action row. Red only when overdue, amber for the next three
// days, neutral otherwise — see dueChip() in lib/utils.
export function DueChip({ dueDate, due, done, className }: { dueDate?: string | null; due?: string | null; done?: boolean; className?: string }) {
  const { tone, label } = dueChip(dueDate, due, done);
  return (
    <span
      title={label}
      className={cn(
        // max-w + truncate is a backstop: the label is already kept short by dueChip()
        "max-w-[9rem] shrink-0 truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums",
        tone === "red" && "bg-warm/10 text-warm",
        tone === "amber" && "bg-caution/10 text-caution",
        tone === "plain" && "bg-secondary text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}

export function Tag({ children, tone = "accent", className }: { children: React.ReactNode; tone?: "accent" | "red" | "green" | "plain"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[7px] py-px text-[11.5px] font-semibold",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "red" && "bg-warm/10 text-warm",
        tone === "green" && "bg-success/10 text-success",
        tone === "plain" && "bg-secondary text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}

// Small bordered text button used inside rows ("Follow up", "Resolve", "Prep").
export function MiniButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "whitespace-nowrap rounded-md border border-border bg-card px-2 py-[3px] text-[12px] font-semibold text-accent-foreground hover:border-primary disabled:opacity-50",
        className
      )}
    />
  );
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent font-bold tracking-[0.02em] text-accent-foreground",
        size === "xs" && "h-[22px] w-[22px] text-[9.5px]",
        size === "md" && "h-[34px] w-[34px] text-[12.5px]",
        size === "lg" && "h-[52px] w-[52px] text-[17px]"
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Faces({ names }: { names: string[] }) {
  return (
    <span className="inline-flex">
      {names.map((n, i) => (
        <span key={n + i} className={cn("rounded-full border-2 border-card", i > 0 && "-ml-1.5")}>
          <Avatar name={n} size="xs" />
        </span>
      ))}
    </span>
  );
}

// Five dots for the deterministic Relationship Health score (v1.7, lib/utils.relationshipHealth).
// `null` = no direct interaction yet, shown as text rather than a misleading score.
export const healthLabel = (stars: number | null) =>
  stars === null ? "Not met yet" : stars >= 4 ? "Strong" : stars === 3 ? "Steady" : "Needs attention";
export function HealthDots({ stars }: { stars: number | null }) {
  if (stars === null) return <span className="text-[12px] text-muted-foreground/70">Not met yet</span>;
  return (
    <span className="inline-flex gap-[3px] align-middle" title={healthLabel(stars)} aria-label={`Relationship: ${healthLabel(stars)}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={cn("h-[7px] w-[7px] rounded-full", i <= stars ? (stars <= 2 ? "bg-warm" : "bg-primary") : "bg-border")} />
      ))}
    </span>
  );
}

// Segmented control (Past / Upcoming, All / You owe / Owed to you).
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="inline-flex rounded-[9px] bg-secondary p-[3px]" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          key={v}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[13px] font-semibold",
            value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-[11px] py-[5px] text-[12.5px] font-semibold",
        on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

// Collapsed-by-default section for detail that should stay out of the way (topics, transcript,
// expectations).
export function Details({ label, open, onToggle, children, first }: { label: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn(!first && "border-t border-border")}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-muted-foreground hover:text-foreground">
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        {label}
      </button>
      {open && children}
    </div>
  );
}

// Centred modal with a scrim, used for the command palette and the capture menu. Esc or a
// click on the scrim closes it.
export function Modal({ onClose, children, label }: { onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/30 dark:bg-black/55" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed left-1/2 top-[10vh] z-50 max-h-[80vh] w-[min(560px,calc(100%-32px))] -translate-x-1/2 overflow-auto rounded-[14px] border border-border bg-card shadow-[0_8px_28px_-8px_rgba(40,40,110,0.35)]"
      >
        {children}
      </div>
    </>
  );
}

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-[34px] w-[34px] place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
      <X className="h-[18px] w-[18px]" />
    </button>
  );
}
