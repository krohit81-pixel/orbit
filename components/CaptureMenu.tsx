"use client";

import { Camera, FileText } from "lucide-react";
import { CloseButton, Modal } from "@/components/bits";
import { useFlow } from "@/components/flow";

// The one "Capture" entry point (v2.0): paste a transcript or import a calendar photo. Both
// lead into the existing review-before-save flows unchanged.
export function CaptureMenu() {
  const { setOverlay, go } = useFlow();
  const close = () => setOverlay(null);
  const option = "flex w-full items-start gap-3 rounded-[10px] border border-border p-3.5 text-left hover:border-primary hover:bg-secondary";
  return (
    <Modal onClose={close} label="Add to Orbit">
      <div className="flex items-center gap-2 px-4 pb-1.5 pt-3.5">
        <span className="font-semibold">Add to Orbit</span>
        <span className="flex-1" />
        <CloseButton onClick={close} />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-1.5">
        <button className={option} onClick={() => { close(); go({ screen: "capture" }); }}>
          <FileText className="mt-px h-[18px] w-[18px] shrink-0 text-accent-foreground" />
          <span><span className="block font-semibold">Paste notes or a transcript</span>
            <span className="text-[13px] text-muted-foreground">Extract a summary, decisions and actions, then review before saving.</span></span>
        </button>
        <button className={option} onClick={() => { close(); go({ screen: "importSchedule" }); }}>
          <Camera className="mt-px h-[18px] w-[18px] shrink-0 text-accent-foreground" />
          <span><span className="block font-semibold">Import a calendar photo</span>
            <span className="text-[13px] text-muted-foreground">Add upcoming meetings from a photo of your Outlook week.</span></span>
        </button>
      </div>
    </Modal>
  );
}
