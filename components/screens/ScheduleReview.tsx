"use client";

import { ArrowLeft, Check, CircleDot, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eyebrow, SectionTitle } from "@/components/bits";
import { useFlow } from "@/components/flow";
import { cn, fmtFull, fmtTime12h } from "@/lib/utils";
import type { ExtractedScheduleItem, ScheduleReviewItem } from "@/lib/types";

function timeRange(it: { startTime: string | null; endTime: string | null }): string | null {
  const start = fmtTime12h(it.startTime);
  const end = fmtTime12h(it.endTime);
  if (start && end) return `${start} – ${end}`;
  return start;
}

function EntrySummary({ e }: { e: ExtractedScheduleItem }) {
  const time = timeRange(e);
  return (
    <>
      <div className="font-semibold leading-snug">{e.title}</div>
      <div className="mt-0.5 text-[12.5px] text-muted-foreground">
        {fmtFull(e.date)}{time ? ` · ${time}` : ""}
      </div>
      {e.attendees.length > 0 && <div className="mt-1 text-[12.5px] text-muted-foreground/80">{e.attendees.join(", ")}</div>}
      {e.location && <div className="mt-0.5 text-[12px] text-muted-foreground/70">{e.location}</div>}
    </>
  );
}

export function ScheduleReviewScreen() {
  const { go, scheduleReview, setScheduleReview, scheduleUnchangedCount, commitSchedule } = useFlow();

  if (!scheduleReview) return <div className="py-10 text-center text-muted-foreground">Nothing to review.</div>;

  const patch = (id: string, next: Partial<ScheduleReviewItem>) => {
    setScheduleReview(scheduleReview.map((it) => (it._id === id ? { ...it, ...next } : it)));
  };

  const newItems = scheduleReview.filter((it) => it.kind === "new");
  const updatedItems = scheduleReview.filter((it) => it.kind === "updated");
  const uncertainItems = scheduleReview.filter((it) => it.kind === "uncertain");
  const includedCount = scheduleReview.filter((it) => it.include).length;

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button className="mt-0.5" onClick={onClick}>
      {on ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--ring))]" /> : <CircleDot className="h-5 w-5 text-muted-foreground/60" />}
    </button>
  );

  if (scheduleReview.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-3 py-2 pb-3">
          <button onClick={() => go({ screen: "meetings" })} aria-label="Back to meetings"><ArrowLeft className="h-5 w-5" /></button>
          <div className="text-[26px] font-bold tracking-tight">Review</div>
        </div>
        <div className="py-10 text-center text-muted-foreground">
          {scheduleUnchangedCount > 0
            ? `Already up to date — all ${scheduleUnchangedCount} meeting${scheduleUnchangedCount === 1 ? "" : "s"} from this photo ${scheduleUnchangedCount === 1 ? "is" : "are"} already recorded.`
            : "Nothing found in that photo."}
        </div>
        <Button className="w-full" onClick={() => go({ screen: "meetings" })}>Back to Meetings</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 py-2 pb-2">
        <button onClick={() => go({ screen: "importSchedule" })} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
        <div className="text-[26px] font-bold tracking-tight">Review</div>
      </div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-muted-foreground">
        Nothing is saved yet.
        {scheduleUnchangedCount > 0 && ` ${scheduleUnchangedCount} meeting${scheduleUnchangedCount === 1 ? "" : "s"} from this photo ${scheduleUnchangedCount === 1 ? "was" : "were"} already up to date and skipped.`}
      </p>

      {newItems.length > 0 && (
        <>
          <SectionTitle>New meetings ({newItems.filter((i) => i.include).length})</SectionTitle>
          {newItems.map((it) => (
            <Card key={it._id} className={cn("mb-2.5", !it.include && "opacity-45")}><CardContent className="flex items-start gap-2.5">
              <Toggle on={it.include} onClick={() => patch(it._id, { include: !it.include })} />
              <div className="flex-1"><EntrySummary e={it.extracted} /></div>
            </CardContent></Card>
          ))}
        </>
      )}

      {updatedItems.length > 0 && (
        <>
          <SectionTitle>Time or date changed ({updatedItems.filter((i) => i.include).length})</SectionTitle>
          {updatedItems.map((it) => (
            <Card key={it._id} className={cn("mb-2.5", !it.include && "opacity-45")}><CardContent className="flex items-start gap-2.5">
              <Toggle on={it.include} onClick={() => patch(it._id, { include: !it.include })} />
              <div className="flex-1">
                <div className="font-semibold leading-snug">{it.extracted.title}</div>
                <div className="mt-1 text-[12.5px] text-muted-foreground">
                  <span className="line-through opacity-70">
                    {fmtFull(it.existing!.date)}{timeRange(it.existing!) ? ` · ${timeRange(it.existing!)}` : ""}
                  </span>
                  <span className="mx-1.5">→</span>
                  <span className="font-medium text-foreground">
                    {fmtFull(it.extracted.date)}{timeRange(it.extracted) ? ` · ${timeRange(it.extracted)}` : ""}
                  </span>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </>
      )}

      {uncertainItems.length > 0 && (
        <>
          <SectionTitle>Not sure — please confirm ({uncertainItems.filter((i) => i.include).length})</SectionTitle>
          <p className="mb-2 text-[12.5px] leading-relaxed text-muted-foreground">
            These look like they might be the same meeting as one already recorded, but the title or date changed enough that Orbit isn&apos;t confident. Pick one.
          </p>
          {uncertainItems.map((it) => (
            <Card key={it._id} className="mb-2.5"><CardContent>
              <Eyebrow>From the photo</Eyebrow>
              <div className="mt-1"><EntrySummary e={it.extracted} /></div>
              <div className="mt-2.5 border-t border-border pt-2.5">
                <Eyebrow>Possibly the same as</Eyebrow>
                <div className="mt-1 text-[13px] font-medium">{it.existing!.title}</div>
                <div className="text-[12px] text-muted-foreground">
                  {fmtFull(it.existing!.date)}{timeRange(it.existing!) ? ` · ${timeRange(it.existing!)}` : ""}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => patch(it._id, { include: true, resolution: "update" })}
                  className={cn("rounded-md border px-2 py-2 text-[12px] font-semibold", it.include && it.resolution === "update" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}
                >
                  Same, update
                </button>
                <button
                  onClick={() => patch(it._id, { include: true, resolution: "new" })}
                  className={cn("rounded-md border px-2 py-2 text-[12px] font-semibold", it.include && it.resolution === "new" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}
                >
                  New occurrence
                </button>
                <button
                  onClick={() => patch(it._id, { include: false })}
                  className={cn("rounded-md border px-2 py-2 text-[12px] font-semibold", !it.include ? "border-warm bg-warm text-warm-foreground" : "border-border text-muted-foreground")}
                >
                  Ignore
                </button>
              </div>
            </CardContent></Card>
          ))}
        </>
      )}

      <Button className="mt-2 w-full" onClick={commitSchedule} disabled={includedCount === 0}>
        <Check className="h-[18px] w-[18px]" /> Save {includedCount} meeting{includedCount === 1 ? "" : "s"}
      </Button>
      <Button variant="secondary" className="mt-2.5 w-full" onClick={() => go({ screen: "importSchedule" })}>
        Back to photo
      </Button>
    </div>
  );
}
