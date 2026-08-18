import type { TriageResult } from "./triage";
import type { Complaint, Urgency } from "./types";

export interface DedupeMetrics {
  /** pairwise, over all C(n,2) pairs */
  precision: number;
  recall: number;
  f1: number;
  truePairs: number;
  predPairs: number;
  hitPairs: number;
  goldIncidents: number;
  predIncidents: number;
}

export interface RoutingMetrics {
  /** share of routable complaints the model was willing to answer on */
  coverage: number;
  /** accuracy on the ones it answered */
  accuracyOnAnswered: number;
  /** of the deliberately ambiguous items, how many it correctly refused */
  abstainRecall: number;
  /** of everything it refused, how many really were ambiguous */
  abstainPrecision: number;
  answered: number;
  correct: number;
  ambiguousTotal: number;
  ambiguousAbstained: number;
  abstainedTotal: number;
  perDept: Array<{ dept: string; total: number; correct: number }>;
}

export interface UrgencyMetrics {
  accuracy: number;
  /** the error that matters: a real P1 the model called P2 or P3 */
  p1Recall: number;
  p1Missed: number;
  p1Total: number;
  confusion: Record<Urgency, Record<Urgency, number>>;
}

function pairKey(a: number, b: number) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function dedupeMetrics(res: TriageResult): DedupeMetrics {
  const items = res.items;
  const n = items.length;
  const goldGroup = items.map((i) => i.complaint.gold.group ?? `__${i.complaint.id}`);
  const predGroup = items.map((i) => i.incident);

  const truth = new Set<string>();
  const pred = new Set<string>();
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (goldGroup[i] === goldGroup[j]) truth.add(pairKey(i, j));
      if (predGroup[i] === predGroup[j]) pred.add(pairKey(i, j));
    }

  let hit = 0;
  for (const p of pred) if (truth.has(p)) hit++;

  const precision = pred.size ? hit / pred.size : 1;
  const recall = truth.size ? hit / truth.size : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    precision,
    recall,
    f1,
    truePairs: truth.size,
    predPairs: pred.size,
    hitPairs: hit,
    goldIncidents: new Set(goldGroup).size,
    predIncidents: new Set(predGroup).size,
  };
}

export function routingMetrics(res: TriageResult): RoutingMetrics {
  const routable = res.items.filter((i) => i.complaint.gold.dept !== "unclear");
  const ambiguous = res.items.filter((i) => i.complaint.gold.dept === "unclear");

  const answered = routable.filter((i) => !i.abstained);
  const correct = answered.filter((i) => i.dept === i.complaint.gold.dept);
  const ambiguousAbstained = ambiguous.filter((i) => i.abstained);
  const abstainedTotal = res.items.filter((i) => i.abstained).length;

  const perDept = new Map<string, { total: number; correct: number }>();
  for (const i of routable) {
    const g = i.complaint.gold.dept;
    const e = perDept.get(g) ?? { total: 0, correct: 0 };
    e.total++;
    if (i.dept === g) e.correct++;
    perDept.set(g, e);
  }

  return {
    coverage: routable.length ? answered.length / routable.length : 0,
    accuracyOnAnswered: answered.length ? correct.length / answered.length : 0,
    abstainRecall: ambiguous.length ? ambiguousAbstained.length / ambiguous.length : 0,
    abstainPrecision: abstainedTotal ? ambiguousAbstained.length / abstainedTotal : 0,
    answered: answered.length,
    correct: correct.length,
    ambiguousTotal: ambiguous.length,
    ambiguousAbstained: ambiguousAbstained.length,
    abstainedTotal,
    perDept: [...perDept.entries()].map(([dept, v]) => ({ dept, ...v })),
  };
}

export function urgencyMetrics(res: TriageResult): UrgencyMetrics {
  const levels: Urgency[] = ["P1", "P2", "P3"];
  const confusion = Object.fromEntries(
    levels.map((a) => [a, Object.fromEntries(levels.map((b) => [b, 0]))])
  ) as UrgencyMetrics["confusion"];

  for (const i of res.items) confusion[i.complaint.gold.urgency][i.urgency]++;

  const total = res.items.length;
  const right = levels.reduce((s, l) => s + confusion[l][l], 0);
  const p1Total = levels.reduce((s, l) => s + confusion.P1[l], 0);
  const p1Missed = confusion.P1.P2 + confusion.P1.P3;

  return {
    accuracy: total ? right / total : 0,
    p1Recall: p1Total ? confusion.P1.P1 / p1Total : 0,
    p1Missed,
    p1Total,
    confusion,
  };
}

/** Hand-labelled effort model, stated as an assumption rather than a claim. */
export const MINUTES_PER_COMPLAINT = 2.5;

export function effortSaved(res: TriageResult) {
  const before = res.items.length;
  const after = res.incidents.length;
  return {
    before,
    after,
    removed: before - after,
    reductionPct: before ? (before - after) / before : 0,
    minutesBefore: before * MINUTES_PER_COMPLAINT,
    minutesAfter: after * MINUTES_PER_COMPLAINT,
  };
}

export function parseCsv(text: string): Complaint[] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  if (!rows.length) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const textIdx = header.findIndex((h) => ["text", "complaint", "description", "body"].includes(h));
  const col = textIdx === -1 ? 0 : textIdx;
  const wardIdx = header.findIndex((h) => ["ward", "zone", "area"].includes(h));

  return rows
    .slice(textIdx === -1 ? 0 : 1)
    .map((r) => (r[col] ?? "").trim())
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.length > 5)
    .map(({ t, i }) => ({
      id: `U${String(i + 1).padStart(3, "0")}`,
      text: t,
      ward: wardIdx >= 0 ? (rows[i + 1]?.[wardIdx] ?? "—") : "—",
      channel: "portal" as const,
      gold: { dept: "unclear" as const, group: null, urgency: "P3" as const },
    }));
}
