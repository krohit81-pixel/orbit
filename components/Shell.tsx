"use client";

import { Home, Users, FileText, Search } from "lucide-react";
import { cn, fmtToday } from "@/lib/utils";
import { useFlow, type View } from "./flow";

const TABS: { key: View["screen"]; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "people", label: "People", icon: Users },
  { key: "meetings", label: "Meetings", icon: FileText },
  { key: "search", label: "Search", icon: Search },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { view, go } = useFlow();
  const active: View["screen"] =
    view.screen === "stakeholder" || view.screen === "editStakeholder" || view.screen === "addStakeholder"
      ? "people"
      : view.screen === "meeting" || view.screen === "editMeeting" || view.screen === "capture" || view.screen === "review"
      ? "meetings"
      : view.screen;

  return (
    <div className="flex min-h-screen justify-center">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-paper text-foreground">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-paper/90 px-[18px] py-2.5 backdrop-blur">
          <button onClick={() => go({ screen: "home" })} className="flex items-baseline gap-1.5 text-[15px] font-bold tracking-tight">
            Orbit
            <span className="text-[10.5px] font-medium text-muted-foreground/60">v1.4.1</span>
          </button>
          <span className="text-[11px] font-medium text-muted-foreground/70">{fmtToday()}</span>
        </header>
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
