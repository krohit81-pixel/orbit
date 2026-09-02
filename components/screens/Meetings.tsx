"use client";

import { useState } from "react";
import { Plus, Camera, Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { vibrantCard } from "@/components/bits";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import { cn, fmtDate, fmtFull, fmtTime12h, todayISO } from "@/lib/utils";
import type { UpcomingMeeting } from "@/lib/types";

// A single free-text notes field, editable any time. Saves automatically on blur (unchanged,
// v1.15), and — v1.17.1 — a checkbox below it reflects real save state rather than a
// decorative flag: checked exactly when the visible text matches what's actually persisted,
// unchecked the moment it's edited again. Ticking it while unchecked saves immediately,
// useful when the owner would rather tap the box than tap away to blur the field.
function NotesField({ meeting }: { meeting: UpcomingMeeting }) {
  const { saveUpcomingMeetingNotes } = useOrbit();
  const [value, setValue] = useState(meeting.notes ?? "");
  const saved = value === (meeting.notes ?? "");
  const doSave = () => { if (!saved) saveUpcomingMeetingNotes(meeting.id, value); };
  return (
    <div>
      <Textarea
        className="mt-2 text-[13px]"
        rows={2}
        placeholder="Add a note for this meeting…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={doSave}
      />
      <label className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <input
          type="checkbox"
          checked={saved}
          onChange={doSave}
          disabled={saved}
          className="h-3.5 w-3.5 accent-primary disabled:opacity-60"
        />
        Saved
      </label>
    </div>
  );
}

// Direct date/time correction for a meeting the owner already knows moved (v1.17.1) — a
// lighter-weight sibling to re-importing a fresh calendar photo (which also handles this via
// matchSchedule(), but is overkill for "just fix this one"). Inline in the card rather than a
// separate screen, matching how CommitmentUpdates edits a due date inline rather than
// navigating away.
function ScheduleEditor({ meeting, onDone }: { meeting: UpcomingMeeting; onDone: () => void }) {
  const { updateUpcomingMeetingSchedule } = useOrbit();
  const [date, setDate] = useState(meeting.date);
  const [startTime, setStartTime] = useState(meeting.startTime ?? "");
  const [endTime, setEndTime] = useState(meeting.endTime ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await updateUpcomingMeetingSchedule(meeting.id, { date, startTime: startTime || null, endTime: endTime || null });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" />
      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" aria-label="Start time" />
      <span className="text-[12px] text-muted-foreground">–</span>
      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" aria-label="End time" />
      <button onClick={save} disabled={busy || !date} aria-label="Save" className="rounded-md p-1.5 text-success disabled:opacity-50">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onDone} disabled={busy} aria-label="Cancel" className="rounded-md p-1.5 text-muted-foreground/70 disabled:opacity-50">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MeetingsScreen() {
  const { meetings, upcomingMeetings, deleteUpcomingMeeting } = useOrbit();
  const { go } = useFlow();
  const [tab, setTab] = useState<"past" | "upcoming">("past");
  const [editingId, setEditingId] = useState<string | null>(null);

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
              const editing = editingId === u.id;
              return (
                <Card key={u.id} className={cn(vibrantCard, "mb-2.5")}><CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-semibold leading-snug">{u.title}</div>
                      {editing ? (
                        <ScheduleEditor meeting={u} onDone={() => setEditingId(null)} />
                      ) : (
                        <div className="mt-0.5 text-[12px] text-muted-foreground/70">
                          {fmtFull(u.date)}{time ? ` · ${time}${timeEnd ? ` – ${timeEnd}` : ""}` : ""}
                        </div>
                      )}
                      {u.attendees.length > 0 && <div className="mt-1 text-[12.5px] text-muted-foreground">{u.attendees.join(", ")}</div>}
                      {u.location && <div className="mt-0.5 text-[12px] text-muted-foreground/70">{u.location}</div>}
                    </div>
                    {!editing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setEditingId(u.id)} aria-label="Edit date and time" className="p-1 text-muted-foreground/50 hover:text-primary">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteUpcomingMeeting(u.id)} aria-label="Remove" className="p-1 text-muted-foreground/50 hover:text-warm">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
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
