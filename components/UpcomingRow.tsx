"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { DueChip, Faces, MiniButton, Spinner } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { useOrbit } from "@/components/OrbitStore";
import { useFlow } from "@/components/flow";
import {
  attendeeStakeholderIds, cn, commitmentLabel, daysFromToday, fmtTime12h, openCommitmentsInvolvingMe, otherParty, sortByUrgency,
} from "@/lib/utils";
import type { UpcomingMeeting } from "@/lib/types";

// One scheduled meeting (v1.15 data) with 2.0's "Prep" — the open actions and watch items you
// have with whoever's attending, matched from the calendar's attendee names to known people.
// `manage` adds the owner's prep note plus edit/delete, for the Meetings → Upcoming list.
export function UpcomingRow({ u, manage }: { u: UpcomingMeeting; manage?: boolean }) {
  const { stakeholders, meetings } = useOrbit();
  const { go, openAction } = useFlow();
  const [prepOpen, setPrepOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const ids = attendeeStakeholderIds(u.attendees, stakeholders);
  const openItems = sortByUrgency(openCommitmentsInvolvingMe(meetings).filter((c) => { const o = otherParty(c); return !!o && ids.includes(o); }));
  const watchItems = meetings.flatMap((m) => m.concerns.filter((c) => c.status !== "resolved" && c.stakeholderId && ids.includes(c.stakeholderId)));
  const n = daysFromToday(u.date);
  const when = n === 0 ? "Today" : n === 1 ? "Tomorrow" : new Date(u.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0 pt-px text-[13px] font-semibold tabular-nums">
          {fmtTime12h(u.startTime) ?? "—"}
          <div className="text-[11.5px] font-semibold text-muted-foreground/70">{when}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-snug">{u.title}</div>
          {editing ? (
            <ScheduleEditor meeting={u} onDone={() => setEditing(false)} />
          ) : (
            <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted-foreground">
              {u.attendees.length > 0 && <Faces names={u.attendees.slice(0, 4)} />}
              {u.attendees.map((name, i) => {
                const sid = attendeeStakeholderIds([name], stakeholders)[0];
                return (
                  <span key={name + i}>
                    {sid ? <button className="hover:text-accent-foreground hover:underline" onClick={() => go({ screen: "stakeholder", id: sid })}>{name}</button> : name}
                    {i < u.attendees.length - 1 ? "," : ""}
                  </span>
                );
              })}
              {manage && u.endTime && <span className="text-muted-foreground/70">· until {fmtTime12h(u.endTime)}</span>}
              {manage && u.location && <span className="text-muted-foreground/70">· {u.location}</span>}
            </div>
          )}
          {openItems.length + watchItems.length > 0 && (
            <MiniButton className="mt-2" onClick={() => setPrepOpen((v) => !v)} aria-expanded={prepOpen}>
              {prepOpen ? "Hide prep" : `Prep: ${openItems.length} open${watchItems.length ? `, ${watchItems.length} on watch` : ""}`}
            </MiniButton>
          )}
        </div>
        {manage && !editing && <div className="flex shrink-0 items-center gap-1"><DeleteOrEdit u={u} onEdit={() => setEditing(true)} /></div>}
      </div>

      {prepOpen && (
        <div className="mt-2.5 rounded-[10px] bg-secondary px-3 py-2.5 text-[13px] sm:ml-[76px]">
          <div className="font-semibold">Before you go in</div>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-[18px]">
            {openItems.map((c) => (
              <li key={c.id}>
                <button className="text-left font-medium text-accent-foreground hover:underline" onClick={() => openAction({ meetingId: c.meeting.id, commitmentId: c.id })}>
                  {commitmentLabel(c, stakeholders)}: {c.text}
                </button>{" "}
                <DueChip dueDate={c.dueDate} due={c.due} />
              </li>
            ))}
            {watchItems.map((c) => <li key={c.id}>Watch: {c.text}</li>)}
          </ul>
          {!manage && u.notes && <div className="mt-2 text-muted-foreground">Your note: {u.notes}</div>}
        </div>
      )}

      {manage && <NotesField meeting={u} />}
    </div>
  );
}

function DeleteOrEdit({ u, onEdit }: { u: UpcomingMeeting; onEdit: () => void }) {
  const { deleteUpcomingMeeting } = useOrbit();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <MiniButton
          disabled={busy}
          className="text-warm"
          onClick={async () => { setBusy(true); try { await deleteUpcomingMeeting(u.id); } finally { setBusy(false); } }}
        >
          {busy ? "Removing…" : "Remove"}
        </MiniButton>
        <MiniButton disabled={busy} onClick={() => setConfirming(false)}>Keep</MiniButton>
      </span>
    );
  }
  return (
    <>
      <button onClick={onEdit} aria-label="Edit date and time" className="rounded-md p-1 text-muted-foreground/60 hover:text-primary"><Pencil className="h-4 w-4" /></button>
      <button onClick={() => setConfirming(true)} aria-label="Remove" className="rounded-md p-1 text-muted-foreground/60 hover:text-warm"><Trash2 className="h-4 w-4" /></button>
    </>
  );
}

// The owner's prep note. Saves on blur; the line under it always says whether what you see is
// what's saved (v1.17.1's real save state, shown as text in 2.0).
function NotesField({ meeting }: { meeting: UpcomingMeeting }) {
  const { saveUpcomingMeetingNotes } = useOrbit();
  const [value, setValue] = useState(meeting.notes ?? "");
  const [saving, setSaving] = useState(false);
  const saved = value === (meeting.notes ?? "");
  const save = async () => {
    if (saved || saving) return;
    setSaving(true);
    try { await saveUpcomingMeetingNotes(meeting.id, value); } finally { setSaving(false); }
  };
  return (
    <div className="mt-2.5 sm:ml-[76px]">
      <textarea
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Prep note…"
        aria-label={`Prep note for ${meeting.title}`}
        className="min-h-[56px] w-full resize-y rounded-[9px] border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:border-primary"
      />
      <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground/70">
        {saving ? <><Spinner className="h-3 w-3" /> Saving…</> : saved ? (value ? "Saved" : "") : (
          <>Unsaved changes · <button className="font-semibold text-accent-foreground hover:underline" onClick={save}>Save now</button></>
        )}
      </div>
    </div>
  );
}

// Direct date/time correction for a meeting the owner already knows moved (v1.17.1).
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
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" aria-label="Date" />
      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" aria-label="Start time" />
      <span className="text-[12px] text-muted-foreground">–</span>
      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-8 w-auto px-2 text-[12.5px]" aria-label="End time" />
      <button onClick={save} disabled={busy || !date} aria-label="Save" className={cn("rounded-md p-1.5 text-success disabled:opacity-50")}>
        {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </button>
      <button onClick={onDone} disabled={busy} aria-label="Cancel" className="rounded-md p-1.5 text-muted-foreground/70 disabled:opacity-50"><X className="h-4 w-4" /></button>
    </div>
  );
}
