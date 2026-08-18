"use client";

import { useState } from "react";
import { CORPUS, CORPUS_STATS } from "@/lib/corpus";
import { DEPT_BY_ID } from "@/lib/departments";
import { initEngine, forceLexical, currentEngine, type EngineId } from "@/lib/embed";
import { triage, DEFAULT_THRESHOLDS, clusterComplete } from "@/lib/triage";
import { dedupeMetrics, routingMetrics, urgencyMetrics } from "@/lib/metrics";
import type { Urgency } from "@/lib/types";
import { Card, Meter, Pill } from "@/components/ui";

interface Row {
  engine: EngineId;
  dedupe: ReturnType<typeof dedupeMetrics>;
  routing: ReturnType<typeof routingMetrics>;
  urgency: ReturnType<typeof urgencyMetrics>;
  ms: number;
}

interface SweepPoint {
  t: number;
  precision: number;
  recall: number;
  f1: number;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function EvaluationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sweep, setSweep] = useState<SweepPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function runAll() {
    setBusy(true);
    setRows([]);
    setSweep([]);
    const out: Row[] = [];

    for (const target of ["neural", "lexical"] as EngineId[]) {
      setNote(
        target === "neural"
          ? "loading all-MiniLM-L6-v2 and scoring 100 labelled complaints…"
          : "scoring the lexical fallback on the same 100…"
      );
      if (target === "lexical") forceLexical();
      else await initEngine(() => {});
      const eng = currentEngine().id;
      if (target === "neural" && eng !== "neural") {
        setNote("model could not be fetched — only the fallback is scored below.");
        continue;
      }
      const res = await triage(CORPUS, eng, DEFAULT_THRESHOLDS[eng]);
      out.push({
        engine: eng,
        dedupe: dedupeMetrics(res),
        routing: routingMetrics(res),
        urgency: urgencyMetrics(res),
        ms: res.ms,
      });
      setRows([...out]);

      if (target === "neural" && eng === "neural") {
        setNote("sweeping the duplicate threshold from 0.36 to 0.80…");
        const pts: SweepPoint[] = [];
        const { embed } = await import("@/lib/embed");
        const vecs = await embed(CORPUS.map((c) => c.text));
        const gold = CORPUS.map((c) => c.gold.group ?? `__${c.id}`);
        for (let t = 0.36; t <= 0.801; t += 0.02) {
          const assign = clusterComplete(vecs, t);
          let tp = 0;
          let fp = 0;
          let fn = 0;
          for (let i = 0; i < CORPUS.length; i++)
            for (let j = i + 1; j < CORPUS.length; j++) {
              const same = gold[i] === gold[j];
              const pred = assign[i] === assign[j];
              if (same && pred) tp++;
              else if (!same && pred) fp++;
              else if (same && !pred) fn++;
            }
          const p = tp + fp ? tp / (tp + fp) : 1;
          const r = tp + fn ? tp / (tp + fn) : 1;
          pts.push({ t, precision: p, recall: r, f1: p + r ? (2 * p * r) / (p + r) : 0 });
        }
        setSweep(pts);
      }
    }
    setNote("");
    setBusy(false);
  }

  const neural = rows.find((r) => r.engine === "neural");
  const best = sweep.length ? sweep.reduce((a, b) => (b.f1 > a.f1 ? b : a)) : null;

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-10">
      <p className="mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
        Measured, not asserted
      </p>
      <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Evaluation</h1>
      <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
        Every number on this page is computed live in your browser when you press the
        button, against {CORPUS_STATS.total} hand-labelled complaints. Nothing is
        hard-coded. If the model gets worse, this page gets worse — which is the only
        way a metric is worth quoting.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={runAll}
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Running…" : rows.length ? "Re-run evaluation" : "Run evaluation"}
        </button>
        {note && <span className="text-[12px] text-ink-3">{note}</span>}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { v: CORPUS_STATS.total, l: "labelled complaints", n: "written in the register they arrive in" },
          { v: CORPUS_STATS.incidents, l: "real incidents behind them", n: "14 were reported more than once" },
          { v: CORPUS_STATS.duplicated, l: "complaints that are re-reports", n: `${pct(CORPUS_STATS.duplicated / CORPUS_STATS.total)} of the queue` },
          { v: CORPUS_STATS.ambiguous, l: "deliberately unroutable", n: "a human could not place these either" },
        ].map((s) => (
          <Card key={s.l} className="p-4">
            <div className="mono text-[26px] font-semibold leading-none tracking-tight">{s.v}</div>
            <div className="mt-2 text-[13px] font-medium">{s.l}</div>
            <div className="mt-1 text-[12px] leading-snug text-ink-3">{s.n}</div>
          </Card>
        ))}
      </div>

      {rows.length > 0 && (
        <>
          <h2 className="mt-12 text-[20px] font-semibold tracking-tight">Head to head</h2>
          <p className="mt-1.5 max-w-[68ch] text-[14px] text-ink-2">
            The lexical fallback is scored on the same set, at its own tuned thresholds.
            It is not a strawman — it is what the desk actually gets when the model
            cannot be downloaded, so it deserves an honest column.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line-2 text-left">
                  <th className="py-2.5 pr-4 font-medium text-ink-3">Metric</th>
                  {rows.map((r) => (
                    <th key={r.engine} className="py-2.5 pr-4 font-medium">
                      {r.engine === "neural" ? "all-MiniLM-L6-v2" : "lexical fallback"}
                    </th>
                  ))}
                  <th className="py-2.5 font-medium text-ink-3">What it means</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    k: "Duplicate grouping F1",
                    f: (r: Row) => pct(r.dedupe.f1),
                    m: "pairwise, over all 4,950 complaint pairs",
                  },
                  {
                    k: "— precision",
                    f: (r: Row) => pct(r.dedupe.precision),
                    m: "of the pairs it merged, how many really were the same incident",
                  },
                  {
                    k: "— recall",
                    f: (r: Row) => pct(r.dedupe.recall),
                    m: "of the true duplicate pairs, how many it caught",
                  },
                  {
                    k: "Incidents found",
                    f: (r: Row) => `${r.dedupe.predIncidents} / ${r.dedupe.goldIncidents}`,
                    m: "predicted vs the true number of real-world incidents",
                  },
                  {
                    k: "Routing accuracy",
                    f: (r: Row) => pct(r.routing.accuracyOnAnswered),
                    m: "on the complaints it was willing to route",
                  },
                  {
                    k: "Routing coverage",
                    f: (r: Row) => pct(r.routing.coverage),
                    m: "share of routable complaints it answered on",
                  },
                  {
                    k: "Abstained on the unroutable",
                    f: (r: Row) =>
                      `${r.routing.ambiguousAbstained}/${r.routing.ambiguousTotal}`,
                    m: "the vague ones it correctly refused to guess",
                  },
                  {
                    k: "Urgency accuracy",
                    f: (r: Row) => pct(r.urgency.accuracy),
                    m: "three-way P1 / P2 / P3",
                  },
                  {
                    k: "P1 recall",
                    f: (r: Row) => pct(r.urgency.p1Recall),
                    m: "the expensive error — a real P1 ranked lower",
                  },
                  {
                    k: "Wall clock",
                    f: (r: Row) => `${r.ms} ms`,
                    m: "100 complaints, in-tab, after model load",
                  },
                ].map((row) => (
                  <tr key={row.k} className="border-b border-line">
                    <td className="py-2.5 pr-4 font-medium">{row.k}</td>
                    {rows.map((r) => (
                      <td key={r.engine} className="mono py-2.5 pr-4">
                        {row.f(r)}
                      </td>
                    ))}
                    <td className="py-2.5 text-[12px] text-ink-3">{row.m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {neural && (
            <>
              <h2 className="mt-12 text-[20px] font-semibold tracking-tight">
                Where it is wrong
              </h2>
              <p className="mt-1.5 max-w-[68ch] text-[14px] text-ink-2">
                Per-desk routing on the labelled set, and the urgency confusion matrix.
                The cell that matters is <span className="mono">P1 → P2</span> and{" "}
                <span className="mono">P1 → P3</span>: a genuine emergency the tool
                pushed down the queue.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <p className="mono mb-3 text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    Routing by desk
                  </p>
                  <ul className="space-y-3">
                    {neural.routing.perDept
                      .sort((a, b) => b.total - a.total)
                      .map((d) => (
                        <li key={d.dept}>
                          <div className="flex items-baseline justify-between text-[13px]">
                            <span>{DEPT_BY_ID[d.dept]?.name ?? d.dept}</span>
                            <span className="mono text-[12px] text-ink-3">
                              {d.correct}/{d.total}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <Meter value={d.correct / d.total} />
                          </div>
                        </li>
                      ))}
                  </ul>
                </Card>

                <Card className="p-5">
                  <p className="mono mb-3 text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    Urgency confusion — rows are truth
                  </p>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-ink-3">
                        <th className="py-1.5 text-left font-medium"> </th>
                        {(["P1", "P2", "P3"] as Urgency[]).map((c) => (
                          <th key={c} className="mono py-1.5 text-right font-medium">
                            → {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(["P1", "P2", "P3"] as Urgency[]).map((r) => (
                        <tr key={r} className="border-t border-line">
                          <td className="mono py-2 font-medium">{r}</td>
                          {(["P1", "P2", "P3"] as Urgency[]).map((c) => {
                            const v = neural.urgency.confusion[r][c];
                            const bad = r === "P1" && c !== "P1" && v > 0;
                            return (
                              <td
                                key={c}
                                className={`mono py-2 text-right ${
                                  r === c
                                    ? "font-semibold text-good"
                                    : bad
                                      ? "font-semibold text-p1"
                                      : "text-ink-3"
                                }`}
                              >
                                {v}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
                    {neural.urgency.p1Missed === 0
                      ? `No true P1 was ranked below P1 in this run (${neural.urgency.p1Total} P1 complaints).`
                      : `${neural.urgency.p1Missed} of ${neural.urgency.p1Total} true P1 complaints were ranked lower. That is the number to argue about, and it is why the tool ranks a queue rather than closing anything.`}
                  </p>
                </Card>
              </div>
            </>
          )}

          {sweep.length > 0 && best && (
            <>
              <h2 className="mt-12 text-[20px] font-semibold tracking-tight">
                Why the threshold is {DEFAULT_THRESHOLDS.neural.dupe}
              </h2>
              <p className="mt-1.5 max-w-[68ch] text-[14px] text-ink-2">
                Swept across the labelled set. Precision falls as the threshold loosens
                because unrelated complaints start merging; recall falls as it tightens
                because re-reports in different words stop matching. We sit slightly
                tight of the F1 peak on purpose — over-merging hides a complaint, and
                that is the failure a resident never finds out about.
              </p>
              <Card className="mt-4 p-5">
                <Sweep points={sweep} chosen={DEFAULT_THRESHOLDS.neural.dupe} />
                <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-brand" /> precision
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-p2" /> recall
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-good" /> F1
                  </span>
                  <span className="ml-auto">
                    F1 peaks at <span className="mono">{best.t.toFixed(2)}</span> (
                    {pct(best.f1)})
                  </span>
                </div>
              </Card>
            </>
          )}

          <Card className="mt-10 p-5">
            <div className="flex items-center gap-2">
              <Pill tone="warn">limits</Pill>
              <h3 className="text-[15px] font-semibold">What these numbers do not show</h3>
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-2">
              <li>
                The corpus is 100 complaints written by us to match the register of real
                ones. It is not a scrape of a live grievance portal, and a labelled set
                its authors wrote will flatter its authors.
              </li>
              <li>
                Duplicate labels assume one incident equals one crew visit. A ward
                officer might reasonably split the Sungam drain and the Sungam flooding
                into two jobs.
              </li>
              <li>
                Urgency is a priority ordering, never a finding. The tool says{" "}
                <em>read this one first</em>; it never says the pothole is dangerous.
              </li>
              <li>
                Urgency errors are lopsided and we did not hide it: the tool over-calls
                P1 far more often than it under-calls it. That is the safe direction, but
                it inflates the P1 lane, and it is the first thing real labels should fix.
              </li>
              <li>
                The desk and severity anchors were written by the same people who wrote
                the corpus. Prototype vectors tuned against a set their author also wrote
                will score better here than on a live inbox. Treat routing accuracy as an
                upper bound.
              </li>
              <li>
                The next honest step is 200 real complaints from one ward, labelled by
                the officer who works that ward, not by us.
              </li>
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}

function Sweep({ points, chosen }: { points: SweepPoint[]; chosen: number }) {
  const W = 720;
  const H = 240;
  const P = { l: 34, r: 12, t: 12, b: 26 };
  const xs = points.map((p) => p.t);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const x = (t: number) => P.l + ((t - xMin) / (xMax - xMin)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v) * (H - P.t - P.b);
  const path = (get: (p: SweepPoint) => number) =>
    points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(get(p)).toFixed(1)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[520px]" role="img"
        aria-label="Precision, recall and F1 against the duplicate threshold">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="var(--color-line)" />
            <text x={P.l - 6} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-3)">
              {g * 100}
            </text>
          </g>
        ))}
        {points
          .filter((_, i) => i % 3 === 0)
          .map((p) => (
            <text key={p.t} x={x(p.t)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-3)">
              {p.t.toFixed(2)}
            </text>
          ))}
        <line
          x1={x(chosen)}
          x2={x(chosen)}
          y1={P.t}
          y2={H - P.b}
          stroke="var(--color-ink-3)"
          strokeDasharray="3 3"
        />
        <text x={x(chosen) + 5} y={P.t + 11} fontSize="10" fill="var(--color-ink-3)">
          chosen {chosen}
        </text>
        <path d={path((p) => p.precision)} fill="none" stroke="var(--color-brand)" strokeWidth="2" />
        <path d={path((p) => p.recall)} fill="none" stroke="var(--color-p2)" strokeWidth="2" />
        <path d={path((p) => p.f1)} fill="none" stroke="var(--color-good)" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    </div>
  );
}
