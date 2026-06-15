"use client";

import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFlow } from "@/components/flow";

export function CaptureScreen() {
  const { go, draft, setDraft, busy, err, runExtraction, loadSample } = useFlow();
  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3">
        <button onClick={() => go({ screen: "meetings" })}><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Add meeting</div>
      </div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-muted-foreground">
        Paste a transcript or notes (Otter export, TXT, or a quick recap). Orbit extracts the intelligence — then you review it before anything is saved.
      </p>
      <Textarea rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
      {err && (
        <div className="mt-2.5 flex items-start gap-2 text-[13px] text-warm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}
      <Button className="mt-3.5 w-full" disabled={busy || !draft.trim()} onClick={runExtraction}>
        <Sparkles className="h-[18px] w-[18px]" /> {busy ? "Extracting…" : "Extract intelligence"}
      </Button>
      {err && (
        <Button variant="secondary" className="mt-2.5 w-full" onClick={loadSample}>
          Load sample result
        </Button>
      )}
    </div>
  );
}
