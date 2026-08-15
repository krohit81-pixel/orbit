# Orbit

Your AI chief of staff. Orbit turns meeting transcripts into living stakeholder
intelligence — what each person cares about, what they expect from you, what
you've committed to (with a running progress-update audit trail), and **how the
relationship has evolved over time**, including a deterministic Relationship Health
rating that correctly distinguishes people you've actually talked to from people only
ever mentioned by someone else.

Single-user **v1.10.2**. Next.js (App Router) + TypeScript + Tailwind + shadcn-style UI,
with **Supabase** as the data layer and server-side LLM extraction (Anthropic only — no
other AI provider is used anywhere in the app). Deployable to Vercel. Responsive: a
phone-frame cockpit below ~700px viewport width, a sidebar-nav desktop layout at or above it
(macOS browser windows, iPad).

> **Full version history and the reasoning behind every decision** live in
> `documents/orbit-master-context-v1.10.md` (product/philosophy) and
> `documents/engineering-reference-v1.10.md` (architecture) in the parent project folder —
> this README covers what the app does today and how to set it up, not a changelog.

## What Orbit does today

- **Home** — a manually-refreshed **Today's Brief** (suggested priorities, open
  commitments, and clickable potential risks/concerns — never auto-generates; shows the
  last-generated brief with a timestamp until you tap refresh), then recent meetings and
  open commitments grouped by stakeholder (including a "You" group for commitments with no
  specific counterparty), all collapsed by default.
- **People** — stakeholder cards; manual add (name, title, relationship, optional "reports
  to"). Relationship taxonomy: Sponsor, Functional lead, My manager, Peer, Reports to me,
  Vendor, Future hire, Other.
- **Stakeholder intelligence** — synthesized summary (regenerate on demand); a
  **Relationship Intelligence** card (a 1–5 star Relationship Health rating, or "N/A" if
  you've never actually interacted with them — not just been mentioned alongside them; last
  interaction date; "Waiting for"; what they currently care about); a **trajectory** across
  every interaction with new-vs-recurring concerns flagged; open expectations and
  commitments in both directions, each with its own progress-update history.
- **Meetings** — paste a transcript → AI extraction → **review before commit** (toggle off
  anything wrong; every item shows its source quote) → saved. Full edit/delete, an
  always-editable transcript field, and an **Export** button that builds a structured PDF of
  the meeting — optionally including the transcript and a ready-to-paste "infographic
  prompt" for tools like NotebookLM.
- **Search** — keyword search across everything captured, plus **Ask Orbit**: type a
  natural-language question ("what did Megan ask me to do in the last meeting?") and get a
  grounded answer with clickable citations back to the real source meeting(s).
- **Weekly report** (hamburger menu / desktop sidebar) — generate a report for any
  Monday-start week: what was covered, key focus areas, key accomplishments, key
  deliverables for the upcoming week. Viewable in-app, exportable as a PDF.
- **Dark mode**, toggled from the hamburger menu (mobile) or sidebar (desktop), persisted
  locally.

Every AI-backed feature that costs a model call is **manual-trigger only** by design —
nothing generates silently in the background. Nothing an LLM produces is ever
auto-persisted; the only exceptions to "derived, not stored" are the per-stakeholder summary
text itself and the raw meeting data — weekly reports, Today's Briefs, Ask Orbit answers, and
both PDF exports are all generated fresh each time and never written to the database.

## Deferred (by design)

- **Semantic / vector search** — keyword search, plus (since v1.9) a full-corpus digest for
  Ask Orbit, is enough at current scale. Vector search is earmarked specifically for a future
  meeting-prep-mode relevance ranking, not needed before then.
- **PDF / Otter file parsing as an input** — paste works; Otter "Export → Text" pastes
  cleanly. (Unrelated to PDF *output*, which the app does extensively — weekly reports and
  meetings can both be exported.)
- **Auth (Google OAuth) & multi-user** — single user for now; protected with Vercel
  deployment password protection. The schema already carries `user_id` for an easy upgrade.
- **Topic threads**, **meeting prep mode** — backlog; see the master context doc §8.

---

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql` for a fresh install. (Upgrading an existing
   pre-v1.3 database instead? Run the migrations in `supabase/migrations/` in order first.)
3. Copy your Project URL and `anon` public key (Project Settings → API).
4. Under Project Settings → API → Data API settings, make sure both the `shared` and `orbit`
   schemas are exposed, and that `anon`/`authenticated` have the needed grants — this is a
   manual step outside SQL and easy to miss on a fresh project.

### 2. Environment
Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...          # server-side only; never exposed to the browser
ORBIT_MODEL=claude-sonnet-4-6  # optional
```

No new environment variables have been added since v1.0 — still just these four.

### 3. Run locally
```
npm install
npm run dev
```
On first load Orbit seeds synthetic (fictional) data so nothing is empty. Open
http://localhost:3000.

---

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel.
2. Add the four env vars above in Project → Settings → Environment Variables.
3. Deploy.
4. **Protect it:** Vercel → Settings → Deployment Protection → enable password
   protection (Pro) so only you can reach it until real auth is added.

Once connected, the release workflow is: branch → commit → push → merge to `main` → push
`main`. Vercel auto-deploys on every push to `main`.

---

## Architecture notes

- **Data model** — two schemas (`shared.stakeholders`, `orbit.meetings`), unchanged since
  v1.4. `meetings` stores its extracted items (expectations, commitments — including their
  own nested progress-update audit trail — concerns, topics, decisions, action items, and the
  raw transcript) as JSONB. No new tables since v1.4; new features have consistently extended
  the existing JSONB shape additively rather than adding schema.
- **One backend route, one AI provider.** `app/api/llm/route.ts` (server-only) proxies the
  Anthropic Messages API for five tasks: extraction, per-stakeholder summary synthesis,
  weekly report narration, Today's Brief priorities, and Ask Orbit's Q&A. Your API key never
  reaches the client. No other LLM provider is called anywhere in the app.
- **Trust** — extraction is never auto-saved. The review step shows each item with the
  verbatim source line it came from; you confirm before it enters the knowledge base. This
  extends to citations: when Ask Orbit points at a source meeting, the app re-resolves that
  citation against real data before showing it as a link — never displays the model's own
  restated text directly.
- **PDF exports are entirely client-side** (`jspdf`, dynamically imported). No server
  involvement, no new backend surface. Meeting exports need no LLM call at all — they're pure
  formatting of data already loaded in the browser.
- **Swapping the LLM** — the route targets the Anthropic Messages API. Point it at another
  provider by editing `callClaude` in `app/api/llm/route.ts`.

### Upgrade path to real auth
Add Supabase Auth, then change the RLS policies from `using (true)` to
`using (auth.uid()::text = user_id)` and set `USER` in `lib/db.ts` to the authenticated
user's id.

---

_Data note: the seed data is fictional. Confirm with your firm's InfoSec/compliance
before putting real confidential meeting content through any hosted AI pipeline — including
Ask Orbit's digest, which is the widest-scope send in the app (every meeting's structured
extraction, on every question asked)._
