import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.ORBIT_MODEL || "claude-sonnet-4-6";

async function callClaude(system: string, user: string, maxTokens = 1500): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text: string = (data.content || [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return text;
}

function stripFences(t: string): string {
  return t.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const task = body.task as string;

  try {
    if (task === "extract") {
      const transcript = String(body.transcript || "");
      const known = String(body.known || "");
      const meetingDate = String(body.meetingDate || body.today || new Date().toISOString().slice(0, 10));
      const weekday = new Date(meetingDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long" });
      const openCommitments = String(body.openCommitments || "");
      const system = `You are the extraction engine for Orbit, an executive intelligence app. The user (the leader) is named Rohit.
This meeting took place on ${meetingDate} (${weekday}). Resolve any relative due dates ("next week", "by the 30th", "end of month") RELATIVE TO THE MEETING DATE, not to today.
From the meeting transcript, extract structured intelligence. Known stakeholders: ${known || "(none yet)"}.
Attribute each item to a stakeholder by full name when clear, otherwise null.
Commitments have a direction: capture WHO owes it ("owner") and WHO it is owed to ("owedTo"). Each is a stakeholder's full name, or "me" for Rohit, or null if unclear. Examples: Rohit promises Jo -> owner "me", owedTo "Jo". Tim promises Rohit -> owner "Tim", owedTo "me". David promises Priya -> owner "David", owedTo "Priya".
For every expectation, commitment and concern, include a short verbatim "source" quote (under 12 words) taken from the transcript.${openCommitments ? `

You are also given Rohit's currently OPEN commitments from past meetings, each tagged with its [id]. For every one this NEW meeting closes, progresses, or requires a due-date change to, add an entry to "commitmentSuggestions" — including when the meeting itself simply IS the thing the commitment described (e.g. an open commitment "meet with Ko Saito" is satisfied just by this being a meeting with Ko Saito, even with no explicit closing statement in the transcript). Don't suggest anything for a commitment this meeting doesn't actually touch, and never invent an [id] that isn't in the list below.

Open commitments:
${openCommitments}` : ""}
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"title":"short meeting title","summary":"1-2 sentence executive summary","topics":["..."],"stakeholders":[{"name":"...","role":"... or null"}],"expectations":[{"text":"...","stakeholder":"name or null","source":"..."}],"commitments":[{"text":"...","owner":"me or name","owedTo":"me or name or null","due":"human due label or null","dueDate":"YYYY-MM-DD or null","source":"..."}],"concerns":[{"text":"...","stakeholder":"name or null","source":"..."}],"decisions":["..."],"actionItems":["..."],"commitmentSuggestions":[{"commitmentRef":"the [id] from the open commitments list","action":"close, revise_date, or progress_note","newDueDate":"YYYY-MM-DD or null — only for revise_date, resolved relative to this meeting's date","reason":"short, specific, grounded in this transcript, under 20 words"}]}
If there are no open commitments listed above, or none of them are touched by this meeting, return an empty array for "commitmentSuggestions".`;
      const raw = await callClaude(system, transcript, 8192);
      let parsed;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        throw new Error(
          "The extraction response wasn't valid JSON (it may have been cut off for a very long transcript). Try again, or split the transcript into smaller sections."
        );
      }
      return NextResponse.json({ extraction: parsed });
    }

    if (task === "synthesize") {
      const name = String(body.name || "this stakeholder");
      const history = String(body.history || "");
      const system = `You are Orbit's relationship analyst. In 2-3 sentences, synthesize how the leader's relationship with ${name} has EVOLVED over time, based on the ordered history of interactions below. Focus on the trajectory — what shifted, what's now most important, and what it means for the leader. Be specific and plain. Respond with prose only, no preamble, no JSON.`;
      const summary = (await callClaude(system, history, 400)).trim();
      return NextResponse.json({ summary });
    }

    if (task === "weeklyReport") {
      const weekLabel = String(body.weekLabel || "this week");
      const digest = String(body.digest || "");
      const system = `You are Orbit's weekly status-report assistant for Rohit, an executive. Based on the structured digest below for the week of ${weekLabel} (meetings held, topics raised, decisions, action items, commitments completed this week, and commitments due the following week), write a terse status update in just a few words per line — this is a glance-first summary, not a narrative report. Open commitments and concerns are reported separately elsewhere and don't need restating here — focus "achieved" on what actually happened this week, and "focusForFuture" on what's coming up next week.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"achieved":["a few words each — what was achieved, decided, or completed this week"],"focusForFuture":["a few words each — what to focus on going into the upcoming week"]}
Keep every entry under 8 words, specific to the digest, never generic filler. If the digest has nothing for a section, return an empty array for it rather than inventing content. If the digest says no meetings were held this week, return {"achieved":["No meetings logged this week"],"focusForFuture":[]}.`;
      const raw = await callClaude(system, digest, 600);
      let parsed;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        throw new Error("The weekly report response wasn't valid JSON. Please try generating it again.");
      }
      return NextResponse.json({ report: parsed });
    }

    if (task === "todaysBrief") {
      const digest = String(body.digest || "");
      const system = `You are Orbit's daily briefing assistant for Rohit, an executive. Based on the digest below (his open commitments involving him, concerns raised recently — marked if recurring — open expectations, and recent meetings), produce a short "Today's Brief".
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"priorities":["short, specific, actionable bullet phrases — the 3-5 things Rohit should prioritise today, ranked most important first"]}
Keep every bullet under 18 words. Ground every bullet in the digest — never invent facts or names not present in it. Weigh recurring or long-unresolved concerns into what you prioritise, but the concerns themselves are shown separately and don't need restating. If there's nothing to prioritise, return an empty array rather than inventing content.`;
      const raw = await callClaude(system, digest, 500);
      let parsed;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        throw new Error("The brief response wasn't valid JSON. Please try refreshing it again.");
      }
      return NextResponse.json({ brief: parsed });
    }

    if (task === "ask") {
      const question = String(body.question || "");
      const context = String(body.context || "");
      const system = `You are Orbit's research assistant for Rohit, an executive. Answer the question using ONLY the meeting digest below — never invent facts, names, dates, or quotes that aren't in it. Each meeting in the digest starts with its id in square brackets, e.g. "[abc123] 12 Aug 2026 — Meeting Title".
Be concise and specific: prefer exact names, dates, and commitment/expectation text over vague paraphrase. If the user asks to see a transcript or "the discussion", point them at the right meeting rather than trying to reproduce transcript text.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"answer":"plain-text answer, 1-4 sentences unless the question needs a short list","sources":[{"meetingId":"the [id] from the digest","title":"meeting title","date":"YYYY-MM-DD"}]}
List every meeting your answer draws from in "sources", most relevant first, capped at 5. If the digest has nothing relevant to the question, say so plainly in "answer" and return an empty "sources" array — never guess.`;
      const user = `Meeting digest:\n${context}\n\nQuestion: ${question}`;
      const raw = await callClaude(system, user, 700);
      let parsed;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        throw new Error("The answer wasn't valid JSON. Please try asking again.");
      }
      return NextResponse.json({ result: parsed });
    }

    return NextResponse.json({ error: "Unknown task." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
