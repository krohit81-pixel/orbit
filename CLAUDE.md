# Orbit — start here

This file is a pointer, not a substitute — read the two docs below before doing anything
else, every session, even if you (or a prior session) already read them recently.

1. **`../documents/orbit-master-context-v1.17.md`** — product intent, philosophy, guardrails,
   version history. Read this first.
2. **`../documents/engineering-reference-v1.17.md`** — architecture, components, design
   decisions, and its own §15 has the step-by-step build-a-feature checklist.

Before trusting the "v1.17" above, check `../documents/` for a higher-numbered pair — this
project supersedes its own doc pair as it advances (old pairs kept for history, not deleted),
and this pointer file can lag that the same way any doc can.

**Do this before anything else, every session:**
```bash
git pull origin main
```
so you're not working from a stale checkout.

Then follow the master context's own "§0 — Where everything lives" and the engineering
reference's "§15 — Startup Guide" — they cover the rest (how releases ship, when to ask
before building, when to ask before shipping, verification expectations) in more detail than
belongs here.

**One thing this pointer covers that the docs don't:** if something Claude-Code-specific
(not Orbit-specific) is broken — e.g. Remote Control won't enable — that's an account/client
setting, not a repo problem. Don't try to fix it by editing files here; `claude doctor` in an
interactive terminal is the real diagnostic.
