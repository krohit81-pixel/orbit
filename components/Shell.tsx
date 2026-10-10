"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, Home, ListChecks, Moon, Plus, Search, Sun, Users } from "lucide-react";
import { cn, isOverdueAction, openCommitmentsInvolvingMe } from "@/lib/utils";
import { useOrbit } from "./OrbitStore";
import { useFlow, type View } from "./flow";
import { useTheme } from "./ThemeProvider";

const VERSION = "v2.1.0";

const TABS: { key: View["screen"]; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Today", icon: Home },
  { key: "actions", label: "Actions", icon: ListChecks },
  { key: "people", label: "People", icon: Users },
  { key: "meetings", label: "Meetings", icon: CalendarDays },
];

// Below this width Orbit is the phone layout (top bar + bottom tabs); at or above it (a resized
// macOS window, an iPad in portrait or landscape) the sidebar layout (v1.7). Chosen to clear
// iPad mini's 744px portrait viewport while staying well above any iPhone width. The action
// drawer's own phone/desktop switch (ActionDrawer.tsx, `min-[700px]:`) matches this number.
const DESKTOP_BREAKPOINT = 700;

function useIsDesktop(breakpointPx: number): boolean {
  // Lazy-init from window: Shell only ever mounts client-side (after the store-ready gate
  // in Orbit.tsx), well past hydration, so reading window here carries no SSR-mismatch risk.
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= breakpointPx);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);
  return isDesktop;
}

function useActiveTab(): View["screen"] {
  const { view } = useFlow();
  switch (view.screen) {
    case "stakeholder": case "editStakeholder": case "addStakeholder": return "people";
    case "meeting": case "editMeeting": case "meetingPrint": case "capture": case "review":
    case "importSchedule": case "scheduleReview": return "meetings";
    case "pendingReviews": return "home";
    default: return view.screen;
  }
}

// ⌘K / Ctrl+K anywhere, or "/" when not typing, opens the search palette.
function usePaletteShortcut() {
  const { overlay, setOverlay } = useFlow();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement as HTMLElement | null)?.tagName ?? "");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay(overlay === "palette" ? null : "palette");
      } else if (e.key === "/" && !typing && !overlay) {
        e.preventDefault();
        setOverlay("palette");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, setOverlay]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop(DESKTOP_BREAKPOINT);
  usePaletteShortcut();
  return isDesktop ? <DesktopShell>{children}</DesktopShell> : <MobileShell>{children}</MobileShell>;
}

function ThemeButton({ withLabel }: { withLabel?: boolean }) {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;
  return withLabel ? (
    <button onClick={() => setTheme(dark ? "light" : "dark")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
      <Icon className="h-[18px] w-[18px]" /> {dark ? "Light" : "Dark"} mode
    </button>
  ) : (
    <button onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="grid h-[34px] w-[34px] place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function CaptureButton() {
  const { setOverlay } = useFlow();
  return (
    <button onClick={() => setOverlay("capture")} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary/90">
      <Plus className="h-4 w-4" /> Capture
    </button>
  );
}

const Brand = ({ className }: { className?: string }) => (
  <span className={cn("flex items-baseline gap-1.5 font-bold tracking-tight", className)}>
    Orbit <span className="text-[11px] font-semibold text-muted-foreground/60">{VERSION}</span>
  </span>
);

// ---- Phone: top bar + bottom tabs ----
function MobileShell({ children }: { children: React.ReactNode }) {
  const { nav, setOverlay } = useFlow();
  const active = useActiveTab();
  return (
    <div className="flex h-screen justify-center overflow-hidden bg-paper">
      <div className="relative flex h-full w-full max-w-[560px] flex-col text-foreground">
        <header className="z-20 flex items-center gap-1 border-b border-border bg-paper/90 px-4 py-2.5 backdrop-blur">
          <button onClick={() => nav({ screen: "home" })}><Brand className="text-[17px]" /></button>
          <span className="flex-1" />
          <button onClick={() => setOverlay("palette")} aria-label="Search" className="grid h-[34px] w-[34px] place-items-center rounded-lg text-muted-foreground hover:bg-secondary">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <ThemeButton />
          <span className="ml-1"><CaptureButton /></span>
        </header>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {children}
          <div className="mt-10 text-center text-[11px] tracking-wide text-muted-foreground/60">Orbit · Rohit Kohli</div>
        </div>
        <nav className="flex border-t border-border bg-card/95 px-1.5 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-1.5 backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => nav({ screen: t.key } as View)}
                aria-current={on ? "page" : undefined}
                className={cn("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-semibold", on ? "text-accent-foreground" : "text-muted-foreground/70")}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={on ? 2.3 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ---- Desktop / iPad: sidebar + top bar + centred working column ----
function DesktopShell({ children }: { children: React.ReactNode }) {
  const { meetings } = useOrbit();
  const { nav, setOverlay } = useFlow();
  const active = useActiveTab();
  const overdue = openCommitmentsInvolvingMe(meetings).filter(isOverdueAction).length;
  const item = (on: boolean) => cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-semibold",
    on ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
  );

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-foreground">
      <aside className="flex w-[228px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-border px-3 pb-4 pt-5">
        <button onClick={() => nav({ screen: "home" })} className="px-2.5 pb-4 text-left"><Brand className="text-[18px]" /></button>
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = active === t.key;
          return (
            <button key={t.key} onClick={() => nav({ screen: t.key } as View)} aria-current={on ? "page" : undefined} className={item(on)}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2.3 : 1.8} />
              {t.label}
              {t.key === "actions" && overdue > 0 && <span className="ml-auto text-[11.5px] font-bold tabular-nums text-warm">{overdue}</span>}
            </button>
          );
        })}
        <div className="mx-2 my-2.5 h-px bg-border" />
        <button onClick={() => nav({ screen: "weeklyReport" })} aria-current={active === "weeklyReport" ? "page" : undefined} className={item(active === "weeklyReport")}>
          <BarChart3 className="h-[18px] w-[18px]" /> Weekly recap
        </button>
        <div className="mt-auto flex flex-col gap-2">
          <ThemeButton withLabel />
          <div className="px-2.5 text-[11px] tracking-wide text-muted-foreground/60">Orbit · Rohit Kohli</div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 flex items-center gap-2.5 border-b border-border bg-paper/90 px-7 py-3 backdrop-blur">
          <button
            onClick={() => setOverlay("palette")}
            className="flex max-w-[520px] flex-1 items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2 text-muted-foreground/70 hover:border-muted-foreground/50"
          >
            <Search className="h-4 w-4" /> Search or ask Orbit
            <kbd className="ml-auto rounded border border-border px-1.5 text-[11px] font-semibold">⌘K</kbd>
          </button>
          <span className="flex-1" />
          <CaptureButton />
        </header>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-7 pb-16 pt-6">
          <div className="mx-auto max-w-[1040px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
