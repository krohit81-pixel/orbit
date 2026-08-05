"use client";

import { useState } from "react";
import { Home, Users, FileText, Search, Menu, CalendarRange, Sun, Moon, X } from "lucide-react";
import { cn, fmtToday } from "@/lib/utils";
import { useFlow, type View } from "./flow";
import { useTheme } from "./ThemeProvider";

const TABS: { key: View["screen"]; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "people", label: "People", icon: Users },
  { key: "meetings", label: "Meetings", icon: FileText },
  { key: "search", label: "Search", icon: Search },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { view, go } = useFlow();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const active: View["screen"] =
    view.screen === "stakeholder" || view.screen === "editStakeholder" || view.screen === "addStakeholder"
      ? "people"
      : view.screen === "meeting" || view.screen === "editMeeting" || view.screen === "capture" || view.screen === "review"
      ? "meetings"
      : view.screen;

  return (
    <div className="flex min-h-screen justify-center">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-paper text-foreground">
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
              <span className="text-[10.5px] font-medium text-muted-foreground/60">v1.5.0</span>
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
                <div className="flex overflow-hidden rounded-md border border-border">
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
              </div>
            </div>
          </>
        )}

        <div className="app-scroll flex-1 overflow-y-auto px-[18px] pb-24 pt-4">
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
