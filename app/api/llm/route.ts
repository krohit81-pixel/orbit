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
      const system = `You are the extraction engine for Orbit, an executive intelligence app. The user (the leader) is named Rohit.
This meeting took place on ${meetingDate} (${weekday}). Resolve any relative due dates ("next week", "by the 30th", "end of month") RELATIVE TO THE MEETING DATE, not to today.
From the meeting transcript, extract structured intelligence. Known stakeholders: ${known || "(none yet)"}.
Attribute each item to a stakeholder by full name when clear, otherwise null.
Commitments have a direction: capture WHO owes it ("owner") and WHO it is owed to ("owedTo"). Each is a stakeholder's full name, or "me" for Rohit, or null if unclear. Examples: Rohit promises Jo -> owner "me", owedTo "Jo". Tim promises Rohit -> owner "Tim", owedTo "me". David promises Priya -> owner "David", owedTo "Priya".
For every expectation, commitment and concern, include a short verbatim "source" quote (under 12 words) taken from the transcript.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"title":"short meeting title","summary":"1-2 sentence executive summary","topics":["..."],"stakeholders":[{"name":"...","role":"... or null"}],"expectations":[{"text":"...","stakeholder":"name or null","source":"..."}],"commitments":[{"text":"...","owner":"me or name","owedTo":"me or name or null","due":"human due label or null","dueDate":"YYYY-MM-DD or null","source":"..."}],"concerns":[{"text":"...","stakeholder":"name or null","source":"..."}],"decisions":["..."],"actionItems":["..."]}`;
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
      const system = `You are Orbit's weekly reporting assistant for Rohit, an executive. Based on the structured digest below for the week of ${weekLabel} (meetings held, topics raised, decisions, action items, commitments completed, and commitments due the following week), write a concise weekly report.
Respond with ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"overview":"1-2 sentence plain-English summary of the week","focusAreas":["short bullet phrases — key focus areas this week"],"accomplishments":["short bullet phrases — key accomplishments/decisions this week"],"upcoming":["short bullet phrases — key deliverables/commitments for the upcoming week"]}
Keep every bullet under 18 words and specific to the digest, not generic. If the digest has nothing for a section, return an empty array for it rather than inventing content. If the digest says no meetings were held this week, say so plainly in "overview".`;
      const raw = await callClaude(system, digest, 1400);
      let parsed;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        throw new Error("The weekly report response wasn't valid JSON. Please try generating it again.");
      }
      return NextResponse.json({ report: parsed });
    }

    return NextResponse.json({ error: "Unknown task." }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
