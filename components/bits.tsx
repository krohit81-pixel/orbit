"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Quote, Star, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  bucketDue, dueTileInfo, fmtDate, fmtFull, fmtWeekdayShort, shortLabel, tileCounterparty,
  type OpenCommitment, type TileBucket, type WeekGanttData,
} from "@/lib/utils";
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
// Bg-only half of the mapping, exported so MeetingSnapshot's commitment-status dots (v1.12)
// use exactly the same red/amber/green background tokens as these tiles — one source of
// truth for the color, rather than a second mapping (or string-parsing this one) that could
// drift from it. TILE_BUCKET_FG is the matching "readable on a solid fill" foreground half
// (white-ish `*-foreground` tokens) — STRIP_TILE_CLASS combines both for CommitmentStrip's
// solid-fill tiles. WeekGantt's outlined bars (v1.14.3) want the colored text itself, not the
// on-fill foreground, so they use their own GANTT_BAR_CLASS below instead of this pair.
export const TILE_BUCKET_BG: Record<TileBucket, string> = {
  overdue: "bg-warm",
  soon: "bg-caution",
  later: "bg-success",
  undated: "bg-secondary",
};
export const TILE_BUCKET_FG: Record<TileBucket, string> = {
  overdue: "text-warm-foreground",
  soon: "text-caution-foreground",
  later: "text-success-foreground",
  undated: "text-secondary-foreground",
};
const STRIP_TILE_CLASS: Record<TileBucket, string> = {
  overdue: `${TILE_BUCKET_BG.overdue} ${TILE_BUCKET_FG.overdue}`,
  soon: `${TILE_BUCKET_BG.soon} ${TILE_BUCKET_FG.soon}`,
  later: `${TILE_BUCKET_BG.later} ${TILE_BUCKET_FG.later}`,
  undated: `${TILE_BUCKET_BG.undated} ${TILE_BUCKET_FG.undated}`,
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

// Rolling 7-day "shape of the week" timeline (v1.14) — one row per open commitment due or
// overdue within the window (see weekGanttData()), a bar spanning meeting-date -> due-date,
// clamped into the 7 visible day columns. A fixed-width label column (direction arrow +
// counterparty name, reusing tileCounterparty() exactly like CommitmentStrip) sits to the
// left of the 7-column grid; the bar itself carries no text — labels stay legible at any
// screen width instead of trying to fit inside a possibly one-day-wide bar. Colored via the
// same TILE_BUCKET_BG tokens the tiles above it and MeetingSnapshot's dots already use, so
// red/amber/green means the same thing everywhere in the app. Read-only: tapping a row
// navigates to its source meeting, the same interaction as every other card/tile on Home —
// dragging to reschedule would bypass the commitment audit trail (see CommitmentUpdates).
//
// A faint day-column grid (v1.14.1) sits behind the bars, with "today" getting its own soft
// tint + left edge. Real usage showed several commitments often share the same due date and
// bucket (e.g. a batch all resolved to "by Friday" from one meeting) — with nothing behind
// them, same-color/same-length bars just read as an undifferentiated stack. The gridlines
// let a bar's start/end still be read against the header even when color and length don't
// vary between rows.
//
// v1.14.3: bars are a thick colored outline over a light tint of the same color, not a solid
// fill — a deliberate, lighter-weight treatment for this widget specifically (CommitmentStrip's
// tiles and MeetingSnapshot's dots keep their existing solid fill; this isn't a site-wide
// palette change, just this component's own look). Border/text share the bucket's own color
// token; the fill is that same token at low opacity, so it stays recognizably "the same red"
// without competing visually with the (also full-color) tiles above it.
const GANTT_BAR_CLASS: Record<TileBucket, string> = {
  overdue: "border-warm bg-warm/10 text-warm",
  soon: "border-caution bg-caution/10 text-caution",
  later: "border-success bg-success/10 text-success",
  undated: "border-border bg-secondary/60 text-muted-foreground",
};
export function WeekGantt({
  data, stakeholders, onSelect,
}: {
  data: WeekGanttData;
  stakeholders: Stakeholder[];
  onSelect: (meetingId: string) => void;
}) {
  // Which grouped rows are expanded to show their individual commitments — local, resets on
  // remount, same "no persistence needed for pure UI state" treatment as Home's own collapsed
  // commitment groups (see HomeScreen's openKeys).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (data.rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[68px_repeat(7,1fr)] gap-1">
        <div />
        {data.days.map((d, i) => (
          <div key={d} className={cn("text-center", i === 0 && "text-primary")}>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.04em] opacity-70">{fmtWeekdayShort(d)}</div>
            <div className="text-[11px] font-bold">{fmtDate(d)?.split(" ")[0]}</div>
          </div>
        ))}
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-[68px] right-0 grid grid-cols-7 divide-x divide-border/60">
          {data.days.map((d, i) => (
            <div key={d} className={i === 0 ? "border-l-2 border-l-primary/40 bg-primary/[0.06]" : undefined} />
          ))}
        </div>
        <div className="relative space-y-1 py-0.5">
          {data.rows.map((row) => {
            const { name, direction } = tileCounterparty(row.commitments[0], stakeholders);
            const grouped = row.commitments.length > 1;
            const isOpen = !!expanded[row.key];
            return (
              <div key={row.key}>
                <button
                  onClick={() => (grouped ? setExpanded((e) => ({ ...e, [row.key]: !e[row.key] })) : onSelect(row.commitments[0].meeting.id))}
                  className="grid w-full grid-cols-[68px_repeat(7,1fr)] items-center gap-1 rounded-md py-0.5 text-left hover:bg-secondary/50"
                >
                  <span className="flex items-center gap-0.5 truncate text-[11px] font-medium">
                    {direction === "out" && <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="You owe" />}
                    {direction === "in" && <ArrowDownLeft className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Owed to you" />}
                    <span className="truncate">{name}</span>
                  </span>
                  <span
                    className={cn("flex h-5 min-w-0 items-center justify-between overflow-hidden rounded-full border-2 px-1.5", GANTT_BAR_CLASS[row.bucket])}
                    style={{ gridColumn: `${row.startCol + 2} / ${row.endCol + 3}` }}
                    title={grouped ? `${row.commitments.length} items` : row.commitments[0].text}
                  >
                    {/* A short, real-text "what this is about" label (v1.14.2) — not the due
                        date (that's already readable from the bar's position against the
                        header). Only shown when the bar spans 2+ days: a single-day bar has no
                        room for even a couple of words, and forcing text in would either
                        overflow or need type too small to read. For a grouped row, the count
                        replaces the label entirely — several same-due-date commitments from
                        one person often share a leading phrase (e.g. "Nick to share the..."),
                        so a truncated label would just repeat itself across bars anyway;
                        the count is more honest about what's actually here. */}
                    {row.endCol > row.startCol && (
                      <span className="truncate text-[9px] font-semibold leading-none">
                        {grouped ? `${row.commitments.length} items` : shortLabel(row.commitments[0].text)}
                      </span>
                    )}
                    {grouped && (
                      <ChevronDown className={cn("h-2.5 w-2.5 shrink-0 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                    )}
                  </span>
                </button>
                {grouped && isOpen && (
                  <div className="ml-[68px] space-y-0.5 border-l-2 border-border/60 pl-2">
                    {row.commitments.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => onSelect(c.meeting.id)}
                        className="block w-full truncate rounded py-0.5 text-left text-[10.5px] text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        title={c.text}
                      >
                        {c.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
