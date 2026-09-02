"use client";
import { createContext, useContext } from "react";
import type { PendingMeetingReview, ReviewModel, ScheduleReviewItem } from "@/lib/types";

export type View =
  | { screen: "home" }
  | { screen: "people" }
  | { screen: "meetings" }
  | { screen: "search" }
  | { screen: "addStakeholder" }
  | { screen: "capture" }
  | { screen: "review" }
  | { screen: "stakeholder"; id: string }
  | { screen: "editStakeholder"; id: string }
  | { screen: "meeting"; id: string }
  | { screen: "editMeeting"; id: string }
  | { screen: "meetingPrint"; id: string }
  | { screen: "weeklyReport" }
  | { screen: "importSchedule" }
  | { screen: "scheduleReview" }
  | { screen: "pendingReviews" };

export interface Flow {
  view: View;
  go: (v: View) => void;
  draft: string;
  setDraft: (s: string) => void;
  meetingDate: string;
  setMeetingDate: (s: string) => void;
  busy: boolean;
  err: string;
  review: ReviewModel | null;
  setReview: (r: ReviewModel | null) => void;
  runExtraction: () => Promise<void>;
  loadSample: () => void;
  commit: () => Promise<void>;
  // Schedule-import wizard (v1.15) — deliberately separate state from the transcript
  // capture/review flow above (different input shape, different review model), following
  // the same "one flow object holds every screen's cross-cutting state" convention rather
  // than introducing a second context for one more wizard.
  scheduleBusy: boolean;
  scheduleErr: string;
  scheduleReview: ScheduleReviewItem[] | null;
  scheduleUnchangedCount: number;
  scheduleSkippedPastCount: number;
  setScheduleReview: (items: ScheduleReviewItem[]) => void;
  runScheduleExtraction: (imageBase64: string, mediaType: string) => Promise<void>;
  commitSchedule: () => Promise<void>;
  // Overnight meeting close-out review queue (v1.16) — reuses `review`/`setReview`/`commit`
  // above rather than a parallel review model: opening the queue just points `review` at the
  // current PendingMeetingReview's built ReviewModel, and `commit()` (in Orbit.tsx) checks
  // `view.screen === "pendingReviews"` to know it should also clear the staging row and
  // advance to the next one instead of returning to the capture screen.
  pendingQueue: PendingMeetingReview[];
  pendingIndex: number;
  openPendingReviews: () => void;
  skipPendingReview: () => Promise<void>;
}

export const FlowCtx = createContext<Flow | null>(null);
export function useFlow(): Flow {
  const c = useContext(FlowCtx);
  if (!c) throw new Error("useFlow must be used within provider");
  return c;
}
