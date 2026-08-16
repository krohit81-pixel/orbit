import { ArrowDownLeft, ArrowUpRight, Quote, Star, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bucketDue, dueTileInfo, fmtFull, tileCounterparty, type OpenCommitment, type TileBucket } from "@/lib/utils";
import type { Stakeholder } from "@/lib/types";
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

// `done` matters here: a completed item is never "overdue" — that's a live-risk word for
// something still outstanding. Bug fixed in v1.8.1: this previously ignored status entirely,
// so a closed commitment past its original due date still showed a red "Overdue" badge.
export function DueLabel({ dueDate, due, done, className }: { dueDate?: string | null; due?: string | null; done?: boolean; className?: string }) {
  if (!dueDate && !due) return null;
  const overdue = !done && dueDate ? bucketDue(dueDate) === "overdue" : false;
  const text = dueDate ? (done ? `Was due ${fmtFull(dueDate)}` : overdue ? `Overdue · ${fmtFull(dueDate)}` : `Due ${fmtFull(dueDate)}`) : due;
  return (
    <span className={cn("text-[12px] font-medium", overdue ? "text-warm" : "text-muted-foreground/70", className)}>
      {text}
    </span>
  );
}

// Grid of colored square tiles for the dashboard's "how's this week" glance (v1.11) — one
// tile per open commitment, most urgent first, colored red/amber/green by dueTileInfo()
// (undated commitments get a neutral tile). Replaces the plain list that used to live here —
// the full list is still available further down in "Commitments by stakeholder".
//
// Fixed 3 columns below Shell's own DESKTOP_BREAKPOINT (700px, kept in sync with that
// constant here since Tailwind's default `md:` (768px) doesn't quite match it) — a flat
// `grid-cols-3` rather than `auto-fill, minmax(...)`. auto-fill was the first attempt (see
// v1.11.0/v1.11.1 history) on the theory that Shell's phone-frame column only ever has room
// for 3 >=100px tracks, but that math was tighter than it looked once the brief card's own
// padding was accounted for — real devices landed on 2 columns, not 3. A flat count is
// simpler and doesn't depend on getting that arithmetic exactly right. At/above the
// breakpoint (iPad/macOS sidebar layout, wider column) auto-fill takes back over so more
// tiles fit per row as the window grows.
const STRIP_TILE_CLASS: Record<TileBucket, string> = {
  overdue: "bg-warm text-warm-foreground",
  soon: "bg-caution text-caution-foreground",
  later: "bg-success text-success-foreground",
  undated: "bg-secondary text-secondary-foreground",
};

export function CommitmentStrip({
  items, stakeholders, onSelect,
}: {
  items: OpenCommitment[];
  stakeholders: Stakeholder[];
  onSelect: (meetingId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-3 grid grid-cols-3 gap-2 min-[700px]:grid-cols-[repeat(auto-fill,minmax(110px,1fr))]">
      {items.map((cm) => {
        const { bucket, label } = dueTileInfo(cm.dueDate);
        const { name, direction } = tileCounterparty(cm, stakeholders);
        return (
          <button
            key={cm.id}
            onClick={() => onSelect(cm.meeting.id)}
            className={cn(
              "flex aspect-square flex-col overflow-hidden rounded-xl px-2.5 py-2.5 text-left",
              STRIP_TILE_CLASS[bucket]
            )}
          >
            {/* shrink-0 on the name and due-status lines keeps them full-height even when
                the caption below is long — only the (line-clamped) caption should ever give
                up space. An arrow instead of "You owe"/"owes you" text saves enough width
                that the counterparty's name usually fits without truncating. */}
            <span className="flex shrink-0 items-center gap-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.04em] opacity-85">
              {direction === "out" && <ArrowUpRight className="h-3 w-3 shrink-0" aria-label="You owe" />}
              {direction === "in" && <ArrowDownLeft className="h-3 w-3 shrink-0" aria-label="Owed to you" />}
              <span className="truncate">{name}</span>
            </span>
            <span className="mt-1.5 block shrink-0 text-[14px] font-extrabold leading-tight">{label}</span>
            <span className="mt-0.5 line-clamp-3 text-[10.5px] leading-snug opacity-90">{cm.text}</span>
          </button>
        );
      })}
    </div>
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
// (0-5) stars render solid; the rest render as outlines. `null` means "not enough signal
// yet" (no direct interaction) and renders as a plain N/A label instead of a star row —
// showing a confident-looking score for someone never actually met would be worse than
// showing nothing. Purely presentational — the score itself is computed in
// lib/utils.relationshipHealth from real signals, never an opaque AI-generated number.
export function Stars({ filled, className }: { filled: number | null; className?: string }) {
  if (filled === null) {
    return (
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60", className)}>
        N/A
      </span>
    );
  }
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
