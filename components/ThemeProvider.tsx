"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
// v2.2: how much colour the app uses — independent of light/dark. Calm is the original Teams
// look; Rainbow adds a colour identity per section, person and relationship; Wild adds solid
// fills and gradients on top. Stored per device, like the theme. See globals.css.
export type Look = "calm" | "rainbow" | "wild";
export const LOOKS: Look[] = ["calm", "rainbow", "wild"];
const STORAGE_KEY = "orbit-theme";
const LOOK_KEY = "orbit-look";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  look: Look;
  setLook: (l: Look) => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101013" : "#FBFAF8");
}
function applyLook(look: Look) {
  document.documentElement.classList.toggle("rb", look !== "calm");
  document.documentElement.classList.toggle("wild", look === "wild");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [look, setLookState] = useState<Look>("calm");

  // Pick up whatever the pre-hydration inline script already applied to <html>,
  // so this stays in sync without causing a flash or a mismatch.
  useEffect(() => {
    let stored: string | null = null;
    let storedLook: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
      storedLook = window.localStorage.getItem(LOOK_KEY);
    } catch {
      // storage unavailable — defaults apply
    }
    const initial: Theme = stored === "dark" ? "dark" : "light";
    const initialLook: Look = LOOKS.includes(storedLook as Look) ? (storedLook as Look) : "calm";
    setThemeState(initial);
    setLookState(initialLook);
    apply(initial);
    applyLook(initialLook);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch { /* not persisted */ }
    apply(t);
  };
  const setLook = (l: Look) => {
    setLookState(l);
    try { window.localStorage.setItem(LOOK_KEY, l); } catch { /* not persisted */ }
    applyLook(l);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme, look, setLook }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
