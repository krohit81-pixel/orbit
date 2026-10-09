"use client";

import { AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHead, Spinner } from "@/components/bits";
import { useFlow } from "@/components/flow";

export function CaptureScreen() {
  const { back, draft, setDraft, meetingDate, setMeetingDate, busy, err, runExtraction, loadSample } = useFlow();
  return (
    <div className="max-w-[720px]">
      <button onClick={back} className="mb-2.5 inline-flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
      <PageHead eyebrow="Capture" title="Add a meeting" />
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Paste notes or a transcript (an Otter export, a TXT file, or a quick recap). Orbit pulls out the summary, decisions, actions and anything to watch, then shows you everything before it&apos;s saved.
        </p>
        <label className="flex items-center gap-2.5">
          <span className="text-[12.5px] font-semibold text-muted-foreground/70">Meeting date</span>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="rounded-lg border border-border bg-card px-2.5 py-1.5 outline-none focus:border-primary" />
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Transcript or notes"
          placeholder="Paste the transcript or your notes here…"
          className="min-h-[280px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 leading-relaxed outline-none focus:border-primary"
        />
        {err && (
          <div className="flex items-start gap-2 text-[13px] text-warm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{err}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !draft.trim()} onClick={runExtraction}>
            {busy ? <><Spinner /> Reading…</> : <><Sparkles className="h-4 w-4" /> Extract</>}
          </Button>
          {err && <Button variant="secondary" onClick={loadSample}>Load sample result</Button>}
        </div>
      </div>
    </div>
  );
}
