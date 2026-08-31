"use client";

import { useState } from "react";
import { Plus, Camera, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { vibrantCard } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { cn, fmtDate, fmtFull, fmtTime12h, todayISO } from "@/lib/utils";
import type { UpcomingMeeting } from "@/lib/types";

// A single free-text notes field, editable any time, saved on blur rather than per keystroke
// — same shape as Meeting.transcript, not an audit trail (that pattern is reserved for
// commitment updates specifically, see engineering reference §12).
function NotesField({ meeting }: { meeting: UpcomingMeeting }) {
  const { saveUpcomingMeetingNotes } = useOrbit();
  const [value, setValue] = useState(meeting.notes ?? "");
  return (
    <Textarea
      className="mt-2 text-[13px]"
      rows={2}
      placeholder="Add a note for this meeting…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (value !== (meeting.notes ?? "")) saveUpcomingMeetingNotes(meeting.id, value); }}
    />
  );
}

export function MeetingsScreen() {
  const { meetings, upcomingMeetings, deleteUpcomingMeeting } = useOrbit();
  const { go } = useFlow();
  const [tab, setTab] = useState<"past" | "upcoming">("past");

  const upcoming = upcomingMeetings
    .filter((u) => u.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));

  return (
    <div>
      <h1 className="py-2 text-[26px] font-bold tracking-tight">Meetings</h1>

      <div className="mb-4 flex overflow-hidden rounded-md border border-border">
        <button
          onClick={() => setTab("past")}
          className={cn("flex-1 py-2 text-[13.5px] font-semibold", tab === "past" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Past
        </button>
        <button
          onClick={() => setTab("upcoming")}
          className={cn("flex-1 py-2 text-[13.5px] font-semibold", tab === "upcoming" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
        >
          Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
        </button>
      </div>

      {tab === "past" ? (
        <>
          <Button className="w-full" onClick={() => go({ screen: "capture" })}>
            <Plus className="h-[18px] w-[18px]" /> Add meeting
          </Button>
          <div className="h-[18px]" />
          {meetings.map((m) => (
            <Card key={m.id} onClick={() => go({ screen: "meeting", id: m.id })} className={cn(vibrantCard, "mb-2.5 cursor-pointer")}>
              <CardContent>
                <div className="font-semibold leading-snug">{m.title}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground/70">{fmtDate(m.date)}</div>
                <div className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{m.summary}</div>
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <>
          <Button className="w-full" onClick={() => go({ screen: "importSchedule" })}>
            <Camera className="h-[18px] w-[18px]" /> Import from photo
          </Button>
          <p className="mb-3.5 mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            A photo of your Outlook calendar. Safe to do this as often as you like — already-recorded meetings are skipped automatically.
          </p>
          {upcoming.length === 0 ? (
            <div className="py-6 text-center text-[13.5px] text-muted-foreground">Nothing scheduled yet.</div>
          ) : (
            upcoming.map((u) => {
              const time = fmtTime12h(u.startTime);
              const timeEnd = fmtTime12h(u.endTime);
              return (
                <Card key={u.id} className={cn(vibrantCard, "mb-2.5")}><CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold leading-snug">{u.title}</div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground/70">
                        {fmtFull(u.date)}{time ? ` · ${time}${timeEnd ? ` – ${timeEnd}` : ""}` : ""}
                      </div>
                      {u.attendees.length > 0 && <div className="mt-1 text-[12.5px] text-muted-foreground">{u.attendees.join(", ")}</div>}
                      {u.location && <div className="mt-0.5 text-[12px] text-muted-foreground/70">{u.location}</div>}
                    </div>
                    <button onClick={() => deleteUpcomingMeeting(u.id)} aria-label="Remove" className="shrink-0 p-1 text-muted-foreground/50 hover:text-warm">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <NotesField meeting={u} />
                </CardContent></Card>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
