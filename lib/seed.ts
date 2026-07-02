import type { Meeting, Stakeholder } from "./types";
import { isoIn, uid } from "./utils";

export interface SeedData { stakeholders: Stakeholder[]; meetings: Meeting[] }

// Fictional data so a fresh deploy isn't empty.
export function seedData(): SeedData {
  const s1 = "seed_maya", s2 = "seed_david", s3 = "seed_priya";
  const stakeholders: Stakeholder[] = [
    {
      id: s1, name: "Maya Chen", title: "Group Chief Risk Officer",
      relationship: "Sponsor", reportsTo: null,
      summary:
        "Your sponsor and the relationship that most shapes your first 90 days. Maya is board-facing and rewards governance clarity over speed; she remembers slips. Lead with proof, not plans.",
    },
    {
      id: s2, name: "David Okafor", title: "Head of Platform Engineering",
      relationship: "Functional lead", reportsTo: null,
      summary: "A delivery partner currently constrained by headcount. Engaging him early on staffing unblocks the work he cares about.",
    },
    {
      id: s3, name: "Priya Nair", title: "Head of Talent",
      relationship: "Peer", reportsTo: null,
      summary: "Holds firm views on hiring quality over pace. An ally for the senior-hire bar you want to set in Pune.",
    },
  ];
  const meetings: Meeting[] = [
    {
      id: uid(), title: "Intro & Risk Landscape", date: isoIn(-34),
      summary: "First substantive conversation. Maya framed governance as an emerging worry and asked you to get close to the board's expectations.",
      topics: ["Risk governance", "Board readiness"], mentioned: [s1],
      expectations: [],
      commitments: [],
      concerns: [{ id: uid(), text: "Governance clarity is thin right now", stakeholderId: s1, source: "I'm not sure the governance story holds up" }],
      decisions: [], actionItems: [],
    },
    {
      id: uid(), title: "Q2 Risk Strategy Review", date: isoIn(-12),
      summary: "Reviewed the quarter's posture. Maya pressed again on governance clarity and board-readiness; agreed a risk-appetite summary would follow.",
      topics: ["Risk governance", "Board readiness", "Execution"], mentioned: [s1],
      expectations: [{ id: uid(), text: "A clear risk-appetite summary for the board", stakeholderId: s1, source: "the board wants the risk picture in one page", status: "open" }],
      commitments: [{ id: uid(), text: "Share risk-appetite summary", ownerId: "me", owedToId: s1, due: "This week", dueDate: isoIn(4), source: "I'll get you the one-pager", status: "open" }],
      concerns: [{ id: uid(), text: "Governance keeps slipping; can't happen again", stakeholderId: s1, source: "we can't slip again on this" }],
      decisions: ["Risk-appetite summary precedes the board pack"], actionItems: ["Draft one-page risk appetite"],
    },
    {
      id: uid(), title: "AI Governance & Hiring Review", date: isoIn(-2),
      summary: "Governance is now board-facing and time-bound. Maya owns the ask upward and set it as the priority over hiring; a new concern about board scrutiny appeared.",
      topics: ["AI governance", "Board readiness", "Hiring"], mentioned: [s1],
      expectations: [{ id: uid(), text: "AI governance proposal finalised before quarter-end", stakeholderId: s1, source: "I need the governance proposal finalised", status: "open" }],
      commitments: [{ id: uid(), text: "Deliver AI governance proposal", ownerId: "me", owedToId: s1, due: "By the 30th", dueDate: isoIn(15), source: "I'll get you the proposal by the 30th", status: "open" }],
      concerns: [{ id: uid(), text: "Board scrutiny on governance is rising", stakeholderId: s1, source: "the board is asking hard questions now" }],
      decisions: ["Governance proposal prioritised first, hiring roadmap second"], actionItems: [],
    },
    {
      id: uid(), title: "Technology Steering Committee", date: isoIn(-8),
      summary: "Platform roadmap is gated on hiring. David flagged two senior gaps; staffing plan requested before dates firm up.",
      topics: ["Platform stability", "Hiring", "Delivery timelines"], mentioned: [s2],
      expectations: [{ id: uid(), text: "A staffing plan for the platform team", stakeholderId: s2, source: "give me a plan before we commit dates", status: "open" }],
      commitments: [],
      concerns: [{ id: uid(), text: "Dates are unrealistic without headcount", stakeholderId: s2, source: "we're blocked until hiring picks up" }],
      decisions: [], actionItems: ["Map open platform roles"],
    },
  ];
  return { stakeholders, meetings };
}

export const SAMPLE_TRANSCRIPT = `Maya: Before quarter-end I need the AI governance proposal finalised — the board is asking.
Rohit: I'll get you the governance proposal by the 30th.
Maya: My real worry is we keep slipping on governance clarity. That can't happen again.
David: On the platform side we're blocked until hiring picks up — we need two senior engineers.
Rohit: Understood. I'll share the updated hiring roadmap with you next week.
Priya: Quality of hires matters more than speed here. Let's not rush the senior roles.
Maya: Agreed. Decision: governance proposal first, hiring roadmap second. And loop in Kenji from Tokyo on the board ask.`;
