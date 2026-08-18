export const DEPT_IDS = [
  "roads",
  "lighting",
  "waste",
  "water",
  "sewerage",
  "health",
  "planning",
  "parks",
] as const;

export type DeptId = (typeof DEPT_IDS)[number];

/** Gold label used for complaints a human reader cannot confidently route either. */
export type GoldDept = DeptId | "unclear";

export type Urgency = "P1" | "P2" | "P3";

export type Channel = "whatsapp" | "portal" | "email" | "phone";

export interface Complaint {
  id: string;
  text: string;
  ward: string;
  channel: Channel;
  /** Hand-labelled ground truth. `group` is the real-world incident id, null if unique. */
  gold: {
    dept: GoldDept;
    group: string | null;
    urgency: Urgency;
  };
}

export interface Department {
  id: DeptId;
  name: string;
  desk: string;
  /** Short exemplar phrases averaged into a prototype vector. */
  anchors: string[];
}
