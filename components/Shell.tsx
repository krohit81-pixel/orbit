"use client";

import { useEffect, useState } from "react";
import { Home, Users, FileText, Search, Menu, CalendarRange, X } from "lucide-react";
import { cn, fmtToday } from "@/lib/utils";
import { useFlow, type View } from "./flow";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./bits";

const TABS: { key: View["screen"]; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "people", label: "People", icon: Users },
  { key: "meetings", label: "Meetings", icon: FileText },
  { key: "search", label: "Search", icon: Search },
];

// Below this width Orbit stays the phone-frame cockpit it was designed as; at or above it
// (a resized macOS window, an iPad in portrait or landscape) it switches to a sidebar-nav
// desktop layout instead of just stretching the same narrow column (v1.7). Chosen to clear
// iPad mini's 744px portrait viewport while staying well above any iPhone width.
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
  return view.screen === "stakeholder" || view.screen === "editStakeholder" || view.screen === "addStakeholder"
    ? "people"
    : view.screen === "meeting" || view.screen === "editMeeting" || view.screen === "capture" || view.screen === "review"
    ? "meetings"
    : view.screen;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop(DESKTOP_BREAKPOINT);
  return isDesktop ? <DesktopShell>{children}</DesktopShell> : <MobileShell>{children}</MobileShell>;
}

// ---- Mobile: the original phone-frame cockpit (unchanged below the breakpoint) ----
function MobileShell({ children }: { children: React.ReactNode }) {
  const { view, go } = useFlow();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveTab();

  return (
    <div className="flex h-screen justify-center overflow-hidden">
      <div className="relative flex h-full w-full max-w-[430px] flex-col bg-paper text-foreground">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-paper/90 px-[18px] py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="rounded-md p-1 text-muted-foreground/70 hover:bg-secondary hover:text-foreground"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
            <button onClick={() => go({ screen: "home" })} className="flex items-baseline gap-1.5 text-[15px] font-bold tracking-tight">
              Orbit
              <span className="text-[10.5px] font-medium text-muted-foreground/60">v1.10.1</span>
            </button>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground/70">{fmtToday()}</span>
        </header>

        {menuOpen && (
          <>
            <button
              className="fixed inset-0 z-10 cursor-default bg-foreground/10"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-[18px] top-[52px] z-20 w-[240px] overflow-hidden rounded-lg border border-primary/30 bg-card shadow-[0_8px_24px_-4px_rgba(91,95,199,0.3)]">
              <button
                onClick={() => { go({ screen: "weeklyReport" }); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13.5px] font-semibold hover:bg-secondary"
              >
                <CalendarRange className="h-[18px] w-[18px] text-primary" /> Weekly report
              </button>
              <div className="border-t border-border px-4 py-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Display</div>
                <ThemeToggle theme={theme} setTheme={setTheme} />
              </div>
            </div>
          </>
        )}

        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-[18px] pb-24 pt-4">
          {children}
          <div className="mt-10 text-center text-[11px] tracking-wide text-muted-foreground/60">
            Orbit · Rohit Kohli
          </div>
        </div>
        <nav className="sticky bottom-0 flex border-t border-border bg-paper/90 px-1.5 pb-2.5 pt-2 backdrop-blur">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => go({ screen: t.key } as View)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px]",
                  on ? "font-bold text-primary" : "font-medium text-muted-foreground/70"
                )}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={on ? 2.4 : 1.9} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ---- Desktop: sidebar nav + wider content column (v1.7, macOS/iPadOS) ----
function DesktopShell({ children }: { children: React.ReactNode }) {
  const { view, go } = useFlow();
  const { theme, setTheme } = useTheme();
  const active = useActiveTab();

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-foreground">
      <aside className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-border">
        <button onClick={() => go({ screen: "home" })} className="flex items-baseline gap-1.5 px-5 py-5 text-left text-[17px] font-bold tracking-tight">
          Orbit
          <span className="text-[11px] font-medium text-muted-foreground/60">v1.10.1</span>
        </button>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => go({ screen: t.key } as View)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13.5px] font-semibold",
                  on ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2.4 : 1.9} />
                {t.label}
              </button>
            );
          })}

          <div className="my-2 border-t border-border" />

          <button
            onClick={() => go({ screen: "weeklyReport" })}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13.5px] font-semibold",
              view.screen === "weeklyReport" ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <CalendarRange className="h-[18px] w-[18px]" /> Weekly report
          </button>

          <div className="mt-4 px-1">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/70">Display</div>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </nav>

        <div className="px-4 pb-4 text-[11px] tracking-wide text-muted-foreground/60">Orbit · Rohit Kohli</div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-end border-b border-border bg-paper/90 px-8 py-3 backdrop-blur">
          <span className="text-[12px] font-medium text-muted-foreground/70">{fmtToday()}</span>
        </header>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-[760px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
