"use client";

import { Component, type ReactNode } from "react";

// v2.1: a render error on one screen used to blank the entire app (Next's default "Application
// error" page), with nothing saved and no way back but reloading. This catches it at the screen
// level, keeps the shell and navigation working, and says what happened. Orbit.tsx keys it by the
// current view, so moving to any other screen resets it.
export class ScreenBoundary extends Component<{ children: ReactNode; onHome: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[orbit] screen crashed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-[520px] rounded-xl border border-border bg-card px-5 py-5">
        <div className="text-[16px] font-semibold">This screen hit a problem</div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          Nothing was saved from this screen. Your other data is unaffected. Go back and try again; if it happens again, the detail below helps track it down.
        </p>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary px-3 py-2 text-[12px] text-muted-foreground">{this.state.error.message}</pre>
        <button
          onClick={() => { this.setState({ error: null }); this.props.onHome(); }}
          className="mt-4 rounded-lg bg-primary px-3.5 py-2 text-[13.5px] font-semibold text-primary-foreground"
        >
          Back to Today
        </button>
      </div>
    );
  }
}
