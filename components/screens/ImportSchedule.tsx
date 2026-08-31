"use client";

import { useRef, useState } from "react";
import { ArrowLeft, AlertCircle, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/bits";
import { useFlow } from "@/components/flow";

// Anthropic's vision input works best (and is auto-downscaled) around ~1568px on the long
// edge — resizing client-side first keeps the upload small and fast on a phone connection
// without needing the model to receive (and Vercel's function body limit to accept) a full
// multi-megabyte photo. JPEG at 0.85 quality is plenty for reading calendar text.
const MAX_DIM = 1568;
const JPEG_QUALITY = 0.85;

async function resizeImage(file: File): Promise<{ base64: string; mediaType: string; previewUrl: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That doesn't look like a valid image."));
    el.src = dataUrl;
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");
  ctx.drawImage(img, 0, 0, w, h);
  const outUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { base64: outUrl.split(",")[1] ?? "", mediaType: "image/jpeg", previewUrl: outUrl };
}

export function ImportScheduleScreen() {
  const { go, scheduleBusy, scheduleErr, runScheduleExtraction } = useFlow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState<{ base64: string; mediaType: string } | null>(null);
  const [localErr, setLocalErr] = useState("");

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalErr("");
    try {
      const { base64, mediaType, previewUrl } = await resizeImage(file);
      setPreview(previewUrl);
      setPending({ base64, mediaType });
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Couldn't process that image.");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-3">
        <button onClick={() => go({ screen: "meetings" })} aria-label="Back to meetings"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Import calendar</div>
      </div>
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted-foreground">
        A photo or screenshot of your Outlook week view. Orbit reads it and shows you what it found before anything is saved — already-recorded meetings are skipped, and if a match looks uncertain you&apos;ll get to decide.
      </p>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      {preview ? (
        <div className="mb-3.5 overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected calendar photo" className="block w-full" />
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mb-3.5 flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/40 py-12 text-muted-foreground"
        >
          <Camera className="h-7 w-7" />
          <span className="text-[13.5px] font-medium">Tap to choose a photo</span>
        </button>
      )}

      {preview && (
        <Button variant="secondary" className="mb-3.5 w-full" onClick={() => fileInputRef.current?.click()}>
          Choose a different photo
        </Button>
      )}

      {(localErr || scheduleErr) && (
        <div className="mb-2.5 flex items-start gap-2 text-[13px] text-warm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{localErr || scheduleErr}</span>
        </div>
      )}

      <Button
        className="w-full"
        disabled={!pending || scheduleBusy}
        onClick={() => pending && runScheduleExtraction(pending.base64, pending.mediaType)}
      >
        {scheduleBusy ? <Spinner className="text-primary-foreground" /> : <Sparkles className="h-[18px] w-[18px]" />}
        {scheduleBusy ? "Reading calendar…" : "Extract meetings"}
      </Button>
    </div>
  );
}
