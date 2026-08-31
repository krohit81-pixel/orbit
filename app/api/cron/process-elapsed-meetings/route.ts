import { NextResponse } from "next/server";
import { callClaude, extractJson } from "@/lib/llm";
import { deleteUpcomingMeeting, fetchElapsedUpcomingMeetings, insertPendingMeetingReview } from "@/lib/db";
import { uid } from "@/lib/utils";
import type { Extraction, ExtractedPerson } from "@/lib/types";

export const runtime = "nodejs";

// v1.16: nightly close-out for orbit.upcoming_meetings. An UpcomingMeeting is never
// auto-promoted straight to a real Meeting — the review-before-commit invariant applies to
// AI-derived content regardless of what triggered the extraction, a cron job included. What
// this route DOES do unattended is the deterministic, no-judgment part: find meetings whose
// date has passed, extract whatever intelligence their prep notes actually contain, and stage
// each as a PendingMeetingReview for the owner to look at next time they open the app. See
// lib/types.ts's PendingMeetingReview doc comment and orbit-master-context v1.16 §27.

// Vercel functions run in UTC with no reliable "local" timezone — same root issue the
// client-side addDaysISO/todayISO timezone bug (v1.14, see master context §10) was fixed for,
// just on the server side this time. Computing IST explicitly, rather than trusting
// `new Date()` getters, is what makes "has this meeting's day actually elapsed" correct
// regardless of which region the function happens to execute in.
function todayISTDate(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const EMPTY_FIELDS = {
  summary: "",
  topics: [] as string[],
  stakeholders: [] as ExtractedPerson[],
  expectations: [] as Extraction["expectations"],
  commitments: [] as Extraction["commitments"],
  concerns: [] as Extraction["concerns"],
  decisions: [] as string[],
  actionItems: [] as string[],
};

// Deliberately its own prompt, not a reuse of the "extract" task's — that one is written for
// a full transcript and has no instruction for "there's barely anything here," which is the
// common case for a one-line prep note. The one hard requirement carried over unchanged from
// the rest of the app: never invent a commitment, concern, decision or action item just to
// fill out the shape. An empty or purely evaluative note is a valid, complete result.
async function extractFromNotes(
  title: string, date: string, attendees: string[], location: string | null, notes: string
): Promise<typeof EMPTY_FIELDS> {
  if (!notes || !notes.trim()) return { ...EMPTY_FIELDS };
  const system = `You are Orbit's extraction engine, reading the owner's own short prep or debrief note about a meeting that has already happened — not a transcript, just whatever he personally jotted down. The meeting was "${title}" on ${date}${location ? ` at ${location}` : ""}. Known attendees: ${attendees.join(", ") || "(none recorded)"}.
The note is often just a sentence or two, sometimes nothing substantive at all beyond confirming the meeting happened — that is normal, not a failure of the note. Extract ONLY what the note itself actually says; never invent a commitment, expectation, concern, decision, or action item that isn't genuinely present just to fill out the response shape. A short evaluative note (e.g. an opinion on a candidate, a vendor, a decision made) with no explicit follow-up is a valid, complete result with every array empty.
Attribute anything to a named attendee only when the note actually names them; otherwise use null.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"summary":"one sentence, or an empty string if the note adds nothing beyond the bare fact the meeting happened","topics":["..."],"stakeholders":[{"name":"...","role":null}],"expectations":[{"text":"...","stakeholder":"name or null","source":"..."}],"commitments":[{"text":"...","owner":"me or name","owedTo":"me or name or null","due":null,"dueDate":null,"source":"..."}],"concerns":[{"text":"...","stakeholder":"name or null","source":"..."}],"decisions":["..."],"actionItems":["..."]}
If the note has nothing substantive, return every array empty and "summary" as an empty string.`;
  try {
    const raw = await callClaude(system, notes, 800);
    const parsed = JSON.parse(extractJson(raw));
    // The prompt's example shows dueDate hardcoded to null (this task never asks the model to
    // resolve relative dates), but verifying against a real note showed it doesn't reliably
    // comply — it put "next week" in dueDate once. bucketDue() (lib/utils.ts) feeds dueDate
    // straight into `new Date(dueDate + "T00:00:00")`; a non-ISO string there silently becomes
    // an Invalid Date rather than throwing, so a commitment like that would never show as
    // overdue and just quietly miscategorize instead — the kind of failure that's easy to miss
    // in review. Same "don't trust the prompt, sanitize the output" principle as
    // normalizeAttendeeName() elsewhere in this feature: coerce anything that isn't a real
    // YYYY-MM-DD to null, keeping it as the human-readable "due" label instead so the
    // information isn't lost, just not treated as a resolvable date.
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    const commitments = (parsed.commitments || []).map((c: Extraction["commitments"][number]) => {
      if (c.dueDate && !isoDate.test(c.dueDate)) {
        return { ...c, due: c.due || c.dueDate, dueDate: null };
      }
      return c;
    });
    return {
      summary: parsed.summary || "",
      topics: parsed.topics || [],
      stakeholders: parsed.stakeholders || [],
      expectations: parsed.expectations || [],
      commitments,
      concerns: parsed.concerns || [],
      decisions: parsed.decisions || [],
      actionItems: parsed.actionItems || [],
    };
  } catch {
    // Same principle as everywhere else in this file: a bad response for ONE meeting
    // degrades to a blank-but-still-reviewable pending item, never blocks the rest of the
    // night's run and never fabricates a plausible-looking result to paper over the failure.
    return { ...EMPTY_FIELDS };
  }
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = todayISTDate();
  let elapsed;
  try {
    elapsed = await fetchElapsedUpcomingMeetings(cutoff);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fetch failed." }, { status: 500 });
  }

  let processed = 0;
  const failures: string[] = [];

  for (const u of elapsed) {
    try {
      const fields = await extractFromNotes(u.title, u.date, u.attendees, u.location, u.notes || "");
      // Attendees already known from the calendar itself are seeded in directly rather than
      // trusted to come back out of the note text again — same "don't re-derive what's
      // already a fact" principle matchSchedule() and normalizeAttendeeName() apply elsewhere
      // in this feature. Anyone the note names who ISN'T already a known attendee still gets
      // added from the model's own output.
      const stakeholders: ExtractedPerson[] = [
        ...u.attendees.map((name) => ({ name, role: null as string | null })),
        ...fields.stakeholders.filter((s) => !u.attendees.some((a) => a.toLowerCase() === s.name.toLowerCase())),
      ];
      const extraction: Extraction = { title: u.title, ...fields, stakeholders };

      // Insert before delete: if the insert fails, the source row survives for tomorrow
      // night's run to retry. The reverse order would risk losing the meeting's notes
      // entirely if the insert then failed — a worse outcome than the rare duplicate this
      // order could theoretically leave behind if the delete itself fails right after a
      // successful insert (the owner can just discard the duplicate).
      await insertPendingMeetingReview({
        id: uid(),
        sourceUpcomingMeetingId: u.id,
        title: u.title,
        date: u.date,
        startTime: u.startTime,
        endTime: u.endTime,
        attendees: u.attendees,
        location: u.location,
        notes: u.notes,
        extraction,
        createdAt: new Date().toISOString(),
      });
      await deleteUpcomingMeeting(u.id);
      processed++;
    } catch (e) {
      failures.push(`${u.title} (${u.id}): ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ cutoff, total: elapsed.length, processed, failures });
}
