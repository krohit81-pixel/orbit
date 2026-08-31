// Shared Anthropic call + JSON-recovery helpers. Originally lived inline in
// app/api/llm/route.ts; pulled out here once a second caller (the overnight
// process-elapsed-meetings cron route, v1.16) needed the exact same two functions rather than
// a near-duplicate copy or an awkward self-HTTP call from one server route to another.

const MODEL = process.env.ORBIT_MODEL || "claude-sonnet-4-6";

// `content` is a plain string for text-only tasks; extractSchedule (v1.15) is the first
// caller that needs a multi-part content array (an image block plus a text instruction),
// which is why this takes `unknown` rather than `string` — Anthropic's Messages API accepts
// either shape identically, so one function serves both instead of a near-duplicate
// "vision" variant.
export async function callClaude(system: string, content: string | unknown[], maxTokens = 1500): Promise<string> {
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
      messages: [{ role: "user", content }],
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

// Every task's prompt says "Respond with ONLY valid JSON (no markdown, no commentary)" — but
// the model doesn't always comply, occasionally prefacing the JSON with a stray sentence
// ("I'll carefully analyze..."), especially on vision tasks with a lot to describe. Stripping
// markdown fences alone doesn't help with that. Since every task here returns exactly one JSON
// object, slicing from the first "{" to the last "}" recovers it regardless of what the model
// wrapped around it, while leaving genuinely-clean output untouched.
export function extractJson(t: string): string {
  const stripped = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}
