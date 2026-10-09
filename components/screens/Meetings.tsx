"use client";

import { useState } from "react";
import { Camera, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Faces, PageHead, Panel, PanelEmpty, Seg } from "@/components/bits";
import { UpcomingRow } from "@/components/UpcomingRow";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { matchesQuery, stakeholderById, todayISO } from "@/lib/utils";

// Recall a discussion (Past) or get ready for one (Upcoming, with prep notes and calendar import).
export function MeetingsScreen({ initialTab }: { initialTab?: "past" | "upcoming" }) {
  const { meetings, upcomingMeetings, stakeholders } = useOrbit();
  const { go } = useFlow();
  const [tab, setTab] = useState<"past" | "upcoming">(initialTab ?? "past");
  const [q, setQ] = useState("");

  const upcoming = upcomingMeetings
    .filter((u) => u.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  const names = (ids: string[]) => ids.map((id) => stakeholderById(stakeholders, id)?.name).filter((n): n is string => !!n);
  const past = meetings.filter((m) => !q.trim() || matchesQuery(q, `${m.title} ${m.summary} ${m.topics.join(" ")} ${names(m.mentioned).join(" ")}`));

  return (
    <div>
      <PageHead
        eyebrow={tab === "past" ? "Recall a discussion" : "Get ready"}
        title="Meetings"
        right={<Seg label="Meetings" value={tab} onChange={setTab} options={[["past", "Past"], ["upcoming", `Upcoming · ${upcoming.length}`]]} />}
      />

      {tab === "past" ? (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-[7px] focus-within:border-primary">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a discussion by person, topic or title" aria-label="Find a meeting" className="w-full min-w-0 bg-transparent outline-none" />
            </label>
            <Button variant="secondary" size="sm" onClick={() => go({ screen: "capture" })}><Plus className="h-3.5 w-3.5" /> Add meeting</Button>
          </div>
          <Panel>
            <div className="[&>*:first-child]:border-t-0">
              {past.map((m) => {
                const d = new Date(m.date + "T00:00:00");
                const people = names(m.mentioned);
                const na = m.commitments.length;
                return (
                  <button
                    key={m.id}
                    onClick={() => go({ screen: "meeting", id: m.id })}
                    className="grid w-full grid-cols-[46px_minmax(0,1fr)_auto] items-start gap-3.5 border-t border-border px-4 py-3 text-left first:rounded-t-xl last:rounded-b-xl hover:bg-secondary"
                  >
                    <span className="pt-px text-center leading-tight">
                      <b className="block text-[19px] font-bold tabular-nums">{d.getDate()}</b>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/70">{d.toLocaleDateString("en-GB", { month: "short" })}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium leading-snug">{m.title}</span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{m.summary}</span>
                      {people.length > 0 && (
                        <span className="mt-1.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                          <Faces names={people.slice(0, 4)} />
                          <span className="truncate">{people.join(", ")}</span>
                        </span>
                      )}
                    </span>
                    <span className="flex flex-col items-end gap-0.5 text-[12px] tabular-nums text-muted-foreground">
                      {na > 0 && <span>{na} action{na === 1 ? "" : "s"}</span>}
                      {m.decisions.length > 0 && <span>{m.decisions.length} decision{m.decisions.length === 1 ? "" : "s"}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {past.length === 0 && <div className="pt-3"><PanelEmpty>{meetings.length ? "No meetings match." : "No meetings yet."}</PanelEmpty></div>}
          </Panel>
        </>
      ) : (
        <>
          <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
            <span className="min-w-[200px] flex-1 text-muted-foreground">
              Add your prep notes here. After the meeting, Orbit drafts it from your note and asks you to review it.
            </span>
            <Button variant="secondary" size="sm" onClick={() => go({ screen: "importSchedule" })}><Camera className="h-3.5 w-3.5" /> Import calendar photo</Button>
          </div>
          <Panel>
            <div className="[&>*:first-child]:border-t-0">
              {upcoming.map((u) => <UpcomingRow key={u.id} u={u} manage />)}
            </div>
            {upcoming.length === 0 && <div className="pt-3"><PanelEmpty>Nothing scheduled. Import a photo of your calendar to add the week.</PanelEmpty></div>}
          </Panel>
        </>
      )}
    </div>
  );
}
