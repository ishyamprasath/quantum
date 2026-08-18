import { DEPARTMENTS, URGENCY_ANCHORS, HAZARD_LEXICON } from "./departments";
import { cosine, mean, embed, type EngineId } from "./embed";
import type { Complaint, DeptId, Urgency } from "./types";

export interface Thresholds {
  /** cosine above which two complaints are the same incident */
  dupe: number;
  /** minimum similarity to the best department before we are willing to route */
  routeFloor: number;
  /** minimum gap between best and second-best department */
  routeMargin: number;
}

/**
 * Defaults are the values picked by the sweep on the labelled corpus
 * (see /evaluation). They differ per engine because the two vector spaces have
 * completely different similarity distributions -- reusing one number for both
 * is the classic way to make a fallback look broken.
 */
export const DEFAULT_THRESHOLDS: Record<EngineId, Thresholds> = {
  neural: { dupe: 0.54, routeFloor: 0.35, routeMargin: 0.04 },
  lexical: { dupe: 0.35, routeFloor: 0.12, routeMargin: 0.04 },
};

export interface DeptScore {
  dept: DeptId;
  score: number;
}

export interface TriagedItem {
  complaint: Complaint;
  /** null when the model abstained -- the item goes to the review lane. */
  dept: DeptId | null;
  deptScores: DeptScore[];
  margin: number;
  urgency: Urgency;
  urgencyScore: number;
  hazards: string[];
  /** id of the merged incident this complaint belongs to */
  incident: string;
  abstained: boolean;
  abstainReason: string | null;
}

export interface Incident {
  id: string;
  members: TriagedItem[];
  /** representative complaint - the one closest to the cluster centroid */
  lead: TriagedItem;
  dept: DeptId | null;
  urgency: Urgency;
  size: number;
  /** mean pairwise cosine inside the cluster, shown so a clerk can judge it */
  cohesion: number;
}

export interface TriageResult {
  items: TriagedItem[];
  incidents: Incident[];
  review: TriagedItem[];
  engine: EngineId;
  thresholds: Thresholds;
  ms: number;
}

/* ------------------------------------------------------------------ */
/* clustering                                                          */
/* ------------------------------------------------------------------ */

/**
 * Complete-linkage agglomerative clustering.
 *
 * Single-linkage is the cheap choice and it is wrong here: A~B and B~C chains
 * A to C even when A and C are unrelated, so an unrelated complaint gets
 * swallowed into an incident and silently closed with it. Complete linkage
 * requires a candidate to clear the threshold against *every* existing member,
 * which costs more comparisons and refuses more merges. For a queue where a
 * missed complaint is the expensive error, that is the right trade.
 */
export function clusterComplete(vectors: Float32Array[], threshold: number): number[] {
  const n = vectors.length;
  const assign = new Array<number>(n).fill(-1);
  const clusters: number[][] = [];

  const pairs: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = cosine(vectors[i], vectors[j]);
      if (s >= threshold) pairs.push([s, i, j]);
    }
  }
  pairs.sort((a, b) => b[0] - a[0]);

  for (const [, i, j] of pairs) {
    const ci = assign[i];
    const cj = assign[j];
    if (ci === -1 && cj === -1) {
      clusters.push([i, j]);
      assign[i] = assign[j] = clusters.length - 1;
    } else if (ci !== -1 && cj === -1) {
      if (clusters[ci].every((m) => cosine(vectors[m], vectors[j]) >= threshold)) {
        clusters[ci].push(j);
        assign[j] = ci;
      }
    } else if (ci === -1 && cj !== -1) {
      if (clusters[cj].every((m) => cosine(vectors[m], vectors[i]) >= threshold)) {
        clusters[cj].push(i);
        assign[i] = cj;
      }
    } else if (ci !== cj) {
      const a = clusters[ci];
      const b = clusters[cj];
      const ok = a.every((x) => b.every((y) => cosine(vectors[x], vectors[y]) >= threshold));
      if (ok) {
        for (const m of b) assign[m] = ci;
        clusters[ci] = a.concat(b);
        clusters[cj] = [];
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (assign[i] === -1) {
      clusters.push([i]);
      assign[i] = clusters.length - 1;
    }
  }
  return assign;
}

/* ------------------------------------------------------------------ */
/* urgency                                                             */
/* ------------------------------------------------------------------ */

function urgencyFrom(
  vec: Float32Array,
  text: string,
  anchors: Record<Urgency, Float32Array>
): { urgency: Urgency; score: number; hazards: string[] } {
  const base: Record<Urgency, number> = {
    P1: cosine(vec, anchors.P1),
    P2: cosine(vec, anchors.P2),
    P3: cosine(vec, anchors.P3),
  };
  const hazards: string[] = [];
  let bump = 0;
  for (const h of HAZARD_LEXICON) {
    if (h.re.test(text)) {
      bump += h.weight;
      if (h.weight > 0) hazards.push(h.label);
    }
  }
  // Weight picked by grid search on the labelled set: it maximises P1 recall
  // without ever pushing a true P1 down to P3. See /evaluation.
  base.P1 += bump * 2;
  base.P3 -= bump;

  const urgency = (Object.keys(base) as Urgency[]).reduce((a, b) =>
    base[a] >= base[b] ? a : b
  );
  return { urgency, score: base[urgency], hazards };
}

/* ------------------------------------------------------------------ */
/* main entry                                                          */
/* ------------------------------------------------------------------ */

export async function triage(
  complaints: Complaint[],
  engine: EngineId,
  thresholds: Thresholds,
  onProgress?: (p: { phase: string; loaded: number; total: number }) => void
): Promise<TriageResult> {
  const t0 = performance.now();

  // Prototype vectors for the eight desks and the three severity bands.
  const deptAnchorTexts = DEPARTMENTS.flatMap((d) => d.anchors);
  const urgAnchorTexts = (["P1", "P2", "P3"] as Urgency[]).flatMap((u) => URGENCY_ANCHORS[u]);

  onProgress?.({ phase: "prototypes", loaded: 0, total: 1 });
  const anchorVecs = await embed([...deptAnchorTexts, ...urgAnchorTexts]);

  let cursor = 0;
  const deptProtos = DEPARTMENTS.map((d) => {
    const vs = anchorVecs.slice(cursor, cursor + d.anchors.length);
    cursor += d.anchors.length;
    return { dept: d.id, vec: mean(vs) };
  });
  const urgProtos = {} as Record<Urgency, Float32Array>;
  for (const u of ["P1", "P2", "P3"] as Urgency[]) {
    const k = URGENCY_ANCHORS[u].length;
    urgProtos[u] = mean(anchorVecs.slice(cursor, cursor + k));
    cursor += k;
  }

  const vecs = await embed(
    complaints.map((c) => c.text),
    onProgress
  );

  const assign = clusterComplete(vecs, thresholds.dupe);

  const items: TriagedItem[] = complaints.map((c, i) => {
    const scores = deptProtos
      .map((p) => ({ dept: p.dept, score: cosine(vecs[i], p.vec) }))
      .sort((a, b) => b.score - a.score);
    const margin = scores[0].score - scores[1].score;

    let dept: DeptId | null = scores[0].dept;
    let abstainReason: string | null = null;
    if (scores[0].score < thresholds.routeFloor) {
      dept = null;
      abstainReason = `no desk scored above ${thresholds.routeFloor.toFixed(2)}. The text does not describe a specific issue`;
    } else if (margin < thresholds.routeMargin) {
      dept = null;
      abstainReason = `top two desks are ${margin.toFixed(3)} apart, so it could be ${scores[0].dept} or ${scores[1].dept}`;
    }

    const u = urgencyFrom(vecs[i], c.text, urgProtos);

    return {
      complaint: c,
      dept,
      deptScores: scores,
      margin,
      urgency: u.urgency,
      urgencyScore: u.score,
      hazards: u.hazards,
      incident: `I${String(assign[i] + 1).padStart(3, "0")}`,
      abstained: dept === null,
      abstainReason,
    };
  });

  // group into incidents
  const byIncident = new Map<string, TriagedItem[]>();
  for (const it of items) {
    const arr = byIncident.get(it.incident) ?? [];
    arr.push(it);
    byIncident.set(it.incident, arr);
  }

  const idxOf = new Map(items.map((it, i) => [it.complaint.id, i]));
  const incidents: Incident[] = [...byIncident.entries()].map(([id, members]) => {
    const memberVecs = members.map((m) => vecs[idxOf.get(m.complaint.id)!]);
    const centroid = mean(memberVecs.map((v) => Float32Array.from(v)));
    let bestI = 0;
    let bestS = -2;
    memberVecs.forEach((v, i) => {
      const s = cosine(v, centroid);
      if (s > bestS) {
        bestS = s;
        bestI = i;
      }
    });

    let pairSum = 0;
    let pairN = 0;
    for (let i = 0; i < memberVecs.length; i++)
      for (let j = i + 1; j < memberVecs.length; j++) {
        pairSum += cosine(memberVecs[i], memberVecs[j]);
        pairN++;
      }

    // the incident inherits the highest urgency and the majority desk
    const rank: Record<Urgency, number> = { P1: 3, P2: 2, P3: 1 };
    const urgency = members.reduce<Urgency>(
      (a, m) => (rank[m.urgency] > rank[a] ? m.urgency : a),
      "P3"
    );
    const tally = new Map<string, number>();
    for (const m of members) if (m.dept) tally.set(m.dept, (tally.get(m.dept) ?? 0) + 1);
    const dept =
      tally.size === 0
        ? null
        : ([...tally.entries()].sort((a, b) => b[1] - a[1])[0][0] as DeptId);

    return {
      id,
      members,
      lead: members[bestI],
      dept,
      urgency,
      size: members.length,
      cohesion: pairN ? pairSum / pairN : 1,
    };
  });

  const rank: Record<Urgency, number> = { P1: 3, P2: 2, P3: 1 };
  incidents.sort(
    (a, b) => rank[b.urgency] - rank[a.urgency] || b.size - a.size || a.id.localeCompare(b.id)
  );

  return {
    items,
    incidents,
    review: items.filter((i) => i.abstained),
    engine,
    thresholds,
    ms: Math.round(performance.now() - t0),
  };
}
