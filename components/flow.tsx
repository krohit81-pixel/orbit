"use client";
import { createContext, useContext } from "react";
import type { PendingMeetingReview, ReviewModel, ScheduleReviewItem } from "@/lib/types";

// v2.0: the Actions list can be opened pre-filtered from Today's counts and panels.
export type ActionDirFilter = "all" | "out" | "in";
export type ActionWhenFilter = "open" | "overdue" | "week" | "awaiting";

export type View =
  | { screen: "home" }
  | { screen: "actions"; dir?: ActionDirFilter; when?: ActionWhenFilter }
  | { screen: "people" }
  | { screen: "meetings"; tab?: "past" | "upcoming" }
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

// Which commitment the action drawer is showing (v2.0). Looked up live from the store on every
// render, so the drawer always reflects the latest saved state.
export interface ActionRef { meetingId: string; commitmentId: string; followUp?: boolean }

export interface Flow {
  view: View;
  // go() remembers where you came from so back() can return there; nav() is for top-level
  // tabs and starts a fresh history.
  go: (v: View) => void;
  nav: (v: View) => void;
  back: () => void;
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
  committing: boolean;
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
  // v2.0 overlays: the action drawer, the search/ask palette, and the capture menu.
  action: ActionRef | null;
  openAction: (ref: ActionRef) => void;
  closeAction: () => void;
  overlay: "palette" | "capture" | null;
  setOverlay: (o: "palette" | "capture" | null) => void;
}

export const FlowCtx = createContext<Flow | null>(null);
export function useFlow(): Flow {
  const c = useContext(FlowCtx);
  if (!c) throw new Error("useFlow must be used within provider");
  return c;
}
