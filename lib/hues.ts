import type { CSSProperties } from "react";

// Colour identities for the optional Rainbow / Wild looks (v2.2). Each hue maps to three CSS
// variables the look stylesheet (globals.css) reads: --h (the hue itself, for tints and text),
// --hf (a deeper fill that keeps white text readable in both themes) and --hi (the text colour
// to use on that fill). In the Calm look nothing reads these variables, so setting them is
// harmless — components can always pass a hue and let the active look decide what to do.
export type HueKey = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "indigo" | "violet" | "pink";

const PEOPLE_HUES: HueKey[] = ["violet", "orange", "teal", "pink", "blue", "green", "indigo", "red", "yellow"];

export function hueStyle(key: HueKey | null | undefined): CSSProperties | undefined {
  if (!key) return undefined;
  return {
    ["--h" as string]: `var(--c-${key})`,
    ["--hf" as string]: `var(--f-${key})`,
    ["--hi" as string]: key === "yellow" ? "#2b2000" : "#fff",
  } as CSSProperties;
}

// A person keeps the same colour everywhere (avatar, chips, meeting date blocks). Hashed from
// the name rather than the id so calendar attendees (plain names) match their stakeholder.
export function personHue(name: string): HueKey {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PEOPLE_HUES[h % PEOPLE_HUES.length];
}

export const RELATIONSHIP_HUE: Record<string, HueKey> = {
  Sponsor: "violet",
  "Functional lead": "blue",
  "My manager": "indigo",
  Peer: "teal",
  "Reports to me": "green",
  Vendor: "orange",
  "Future hire": "pink",
  Other: "pink",
};
