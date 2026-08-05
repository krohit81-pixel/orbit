"use client";
import { createContext, useContext } from "react";
import type { ReviewModel } from "@/lib/types";

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
  | { screen: "weeklyReport" };

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
}

export const FlowCtx = createContext<Flow | null>(null);
export function useFlow(): Flow {
  const c = useContext(FlowCtx);
  if (!c) throw new Error("useFlow must be used within provider");
  return c;
}
