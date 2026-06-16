# Orbit

Your AI chief of staff. Orbit turns meeting transcripts into living stakeholder
intelligence — what each person cares about, what they expect from you, what
you've committed to, and **how the relationship has evolved over time**.

Single-user V1.1. Next.js (App Router) + TypeScript + Tailwind + shadcn-style UI,
with **Supabase** as the data layer and server-side LLM extraction. Deployable to
Vercel.

## New in V1.1

- **Edit & delete** for stakeholders and meetings. Deleting a stakeholder uses
  **detach-and-keep**: their meetings stay, references to them are cleared (never
  silently guts a meeting). Deletes ask for confirmation.
- **Editable meeting dates** (set when adding, change anytime). Trajectory and all
  intelligence re-order to the real date automatically; the extractor resolves
  relative due-dates against the meeting date, not today.
- **Editable due dates** on commitments.
- **Home is person-first**: open commitments grouped by stakeholder.
- **Cleaner dates**: due dates render as quiet aligned text; color is reserved for
  overdue only.
- **Today's date** in the top bar, and a **"Synthesized {date}"** stamp on each
  stakeholder's AI summary.

> **Upgrading a V1 database?** Run this once in the Supabase SQL editor:
> `alter table stakeholders add column if not exists summary_generated_at timestamptz;`
> (Fresh installs get it from `schema.sql` automatically.)


---

## What's in V1

- **Home** — what needs your attention: recent meetings, your open commitments
  grouped by due date (Overdue / This week / Upcoming), recently updated people.
- **People** — stakeholder cards; manual add (name, title, relationship, optional
  "reports to" for the org map). Relationship taxonomy: Sponsor, Functional lead,
  My manager, Peer, Reports to me, Vendor, Future hire, Other.
- **Stakeholder intelligence** — synthesized summary (regenerated on demand),
  what they care about, **trajectory** (the evolution of the relationship across
  every interaction, with new vs. recurring concerns flagged), open expectations
  and commitments.
- **Meetings** — paste a transcript → AI extraction → **review before commit**
  (toggle off anything wrong; every item shows its source quote) → saved.
- **Search** — punctuation/word-order tolerant keyword search across everything.

## Deferred (by design)

- **Semantic / vector search** (pgvector + embeddings) — V1 uses keyword search.
- **PDF / Otter file parsing** — V1 accepts pasted text. Otter "Export → Text"
  pastes cleanly today.
- **Auth (Google OAuth) & multi-user** — single user for now; protect with Vercel
  password protection. The schema already carries `user_id` for an easy upgrade.
- **Topic threads** — cross-topic timelines (a strong V1.5).
- Dark mode.

---

## Setup

### 1. Supabase
1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/schema.sql`.
3. Copy your Project URL and `anon` public key (Project Settings → API).

### 2. Environment
Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...          # server-side only; never exposed to the browser
ORBIT_MODEL=claude-sonnet-4-6  # optional
```

### 3. Run locally
```
npm install
npm run dev
```
On first load Orbit seeds synthetic data so nothing is empty. Open
http://localhost:3000.

---

## Deploy to Vercel
1. Push this folder to a Git repo and import it in Vercel.
2. Add the four env vars above in Project → Settings → Environment Variables.
3. Deploy.
4. **Protect it:** Vercel → Settings → Deployment Protection → enable password
   protection (Pro) so only you can reach it until real auth is added.

---

## Architecture notes

- **Data model** — two tables. `stakeholders` is relational; `meetings` stores its
  extracted items (expectations, commitments, concerns, topics, etc.) as JSONB.
  Toggling a commitment updates that meeting's `commitments` JSONB. This keeps the
  schema small and is a clean base for the deferred features.
- **Extraction** runs in `app/api/llm/route.ts` (server-only) so your API key never
  reaches the client. Same route handles trajectory "Regenerate" synthesis.
- **Trust** — extraction is never auto-saved. The review step shows each item with
  the verbatim source line it came from; you confirm before it enters the KB.
- **Swapping the LLM** — the route targets the Anthropic Messages API. Point it at
  another provider by editing `callClaude` in `app/api/llm/route.ts`.

### Upgrade path to real auth
Add Supabase Auth, then change the RLS policies in `schema.sql` from
`using (true)` to `using (auth.uid()::text = user_id)` and set `USER` in
`lib/db.ts` to the authenticated user's id.

---

_Data note: the seed data is fictional. Confirm with your firm's InfoSec/compliance
before putting real confidential meeting content through any hosted AI pipeline._
