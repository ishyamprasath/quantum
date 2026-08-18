"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CORPUS } from "@/lib/corpus";
import { DEPT_BY_ID, DEPARTMENTS } from "@/lib/departments";
import { initEngine, forceLexical, currentEngine, type EngineId } from "@/lib/embed";
import { triage, DEFAULT_THRESHOLDS, type TriageResult, type Incident } from "@/lib/triage";
import { effortSaved, parseCsv } from "@/lib/metrics";
import type { Complaint } from "@/lib/types";
import { Card, Pill, UrgencyTag, Meter } from "@/components/ui";

type Phase = "idle" | "loading" | "running" | "done" | "error";

export default function TriagePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ phase: "", loaded: 0, total: 0 });
  const [result, setResult] = useState<TriageResult | null>(null);
  const [engine, setEngine] = useState<EngineId>("neural");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Complaint[]>(CORPUS);
  const [dataLabel, setDataLabel] = useState("labelled sample · 100 complaints");
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = useCallback(
    async (useLexical: boolean, rows: Complaint[]) => {
      setPhase("loading");
      setError(null);
      setResult(null);
      setOpen(null);
      try {
        let eng: EngineId = "lexical";
        if (useLexical) {
          forceLexical();
          setProgress({ phase: "lexical engine", loaded: 1, total: 1 });
        } else {
          const st = await initEngine((p) => setProgress(p));
          eng = st.id;
        }
        eng = currentEngine().id;
        setEngine(eng);
        setPhase("running");
        const res = await triage(rows, eng, DEFAULT_THRESHOLDS[eng], (p) => setProgress(p));
        setResult(res);
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("error");
      }
    },
    []
  );

  const onUpload = async (f: File) => {
    const text = await f.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      setError("No usable rows. Expected a CSV with a `text` (or `complaint`) column.");
      setPhase("error");
      return;
    }
    setData(rows);
    setDataLabel(`${f.name} · ${rows.length} rows`);
    run(engine === "lexical", rows);
  };

  const effort = result ? effortSaved(result) : null;

  const shown = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return result.incidents;
    if (filter === "dupes") return result.incidents.filter((i) => i.size > 1);
    if (filter === "review") return result.incidents.filter((i) => i.dept === null);
    return result.incidents.filter((i) => i.urgency === filter);
  }, [result, filter]);

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
            Ward grievance desk
          </p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Triage console</h1>
          <p className="mt-2 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
            One morning&rsquo;s inbox, grouped into the incidents behind it. Every
            complaint stays visible. Grouping changes what the officer reads first;
            it never deletes anything.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => run(false, data)}
            disabled={phase === "loading" || phase === "running"}
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {phase === "done" ? "Re-run triage" : "Run triage"}
          </button>
          <button
            onClick={() => run(true, data)}
            disabled={phase === "loading" || phase === "running"}
            className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink disabled:opacity-40"
            title="Show what the desk gets when the model cannot be downloaded"
          >
            Run degraded
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
          >
            Upload CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink-3">
        <span className="mono">{dataLabel}</span>
        {result && (
          <>
            <span className="rule h-px w-6" />
            <span>
              engine{" "}
              <span className="mono text-ink-2">
                {result.engine === "neural" ? "all-MiniLM-L6-v2 (int8)" : "lexical n-gram"}
              </span>
            </span>
            <span className="rule h-px w-6" />
            <span>
              <span className="mono text-ink-2">{result.ms}ms</span> end to end
            </span>
          </>
        )}
      </div>

      {(phase === "loading" || phase === "running") && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">
              {phase === "loading" ? "Fetching the model into this tab…" : "Embedding and grouping…"}
            </span>
            <span className="mono text-[12px] text-ink-3">
              {progress.total
                ? `${Math.round((progress.loaded / progress.total) * 100)}%`
                : "…"}
            </span>
          </div>
          <div className="mt-3">
            <Meter value={progress.total ? progress.loaded / progress.total : 0.05} />
          </div>
          <p className="mono mt-2 truncate text-[11px] text-ink-3">{progress.phase}</p>
        </Card>
      )}

      {phase === "error" && (
        <Card className="mt-6 border-p1/30 bg-p1-soft p-5 text-[13px] text-p1">{error}</Card>
      )}

      {phase === "idle" && (
        <Card className="mt-6 p-8 text-center">
          <p className="text-[15px] font-medium">Nothing has been sent anywhere.</p>
          <p className="mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">
            Press <span className="font-medium text-ink">Run triage</span> and the model
            downloads into this tab (≈23 MB, once). The complaint text never leaves your
            machine, which is what makes it usable on a live grievance inbox.
          </p>
        </Card>
      )}

      {result && effort && (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="mono text-[26px] font-semibold leading-none tracking-tight">
                {effort.before} <span className="text-ink-3">→</span>{" "}
                <span className="text-brand-ink">{effort.after}</span>
              </div>
              <div className="mt-2 text-[13px] font-medium">Tickets to read</div>
              <div className="mt-1 text-[12px] text-ink-3">
                {effort.removed} were re-reports of an incident already in the queue
              </div>
            </Card>
            <Card className="p-4">
              <div className="mono text-[26px] font-semibold leading-none tracking-tight text-p1">
                {result.incidents.filter((i) => i.urgency === "P1").length}
              </div>
              <div className="mt-2 text-[13px] font-medium">P1 incidents</div>
              <div className="mt-1 text-[12px] text-ink-3">safety or health, act today</div>
            </Card>
            <Card className="p-4">
              <div className="mono text-[26px] font-semibold leading-none tracking-tight text-p2">
                {result.review.length}
              </div>
              <div className="mt-2 text-[13px] font-medium">Sent to human review</div>
              <div className="mt-1 text-[12px] text-ink-3">
                the model declined to route these
              </div>
            </Card>
            <Card className="p-4">
              <div className="mono text-[26px] font-semibold leading-none tracking-tight">
                {Math.round(effort.minutesBefore - effort.minutesAfter)}
                <span className="text-[15px] font-normal text-ink-3"> min</span>
              </div>
              <div className="mt-2 text-[13px] font-medium">Reading time avoided</div>
              <div className="mt-1 text-[12px] text-ink-3">
                assuming {2.5} min per ticket, our assumption and not a measurement
              </div>
            </Card>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {[
              { k: "all", l: `All incidents (${result.incidents.length})` },
              { k: "P1", l: `P1 (${result.incidents.filter((i) => i.urgency === "P1").length})` },
              { k: "P2", l: `P2 (${result.incidents.filter((i) => i.urgency === "P2").length})` },
              { k: "P3", l: `P3 (${result.incidents.filter((i) => i.urgency === "P3").length})` },
              {
                k: "dupes",
                l: `Merged (${result.incidents.filter((i) => i.size > 1).length})`,
              },
              {
                k: "review",
                l: `Needs review (${result.incidents.filter((i) => i.dept === null).length})`,
              },
            ].map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                  filter === f.k
                    ? "border-brand bg-brand-soft text-brand-ink"
                    : "border-line bg-card text-ink-2 hover:border-line-2"
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {shown.map((inc) => (
              <IncidentRow
                key={inc.id}
                inc={inc}
                open={open === inc.id}
                onToggle={() => setOpen(open === inc.id ? null : inc.id)}
              />
            ))}
          </ul>

          {result.review.length > 0 && (
            <section className="mt-12">
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight">
                  Needs human review
                </h2>
                <Pill tone="warn">{result.review.length}</Pill>
              </div>
              <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
                These are not failures, they are the point. Anything the model cannot
                place confidently lands here, visible and counted, instead of being
                assigned to whichever desk happened to score highest. A wrong desk costs
                a week; an honest &ldquo;I don&rsquo;t know&rdquo; costs a glance.
              </p>
              <ul className="mt-4 space-y-2">
                {result.review.map((it) => (
                  <Card key={it.complaint.id} as="li" className="p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                      <span className="mono">{it.complaint.id}</span>
                      <span>·</span>
                      <span>{it.complaint.ward}</span>
                      <span>·</span>
                      <span className="capitalize">{it.complaint.channel}</span>
                      <UrgencyTag u={it.urgency} compact />
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed">{it.complaint.text}</p>
                    <p className="mt-2 rounded-md bg-p2-soft px-2.5 py-1.5 text-[12px] text-p2">
                      Not routed. {it.abstainReason}
                    </p>
                  </Card>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function IncidentRow({
  inc,
  open,
  onToggle,
}: {
  inc: Incident;
  open: boolean;
  onToggle: () => void;
}) {
  const dept = inc.dept ? DEPT_BY_ID[inc.dept] : null;
  return (
    <Card as="li" className="overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyTag u={inc.urgency} />
          {inc.size > 1 ? (
            <Pill tone="brand">{inc.size} reports merged</Pill>
          ) : (
            <Pill>single report</Pill>
          )}
          {dept ? (
            <span className="text-[12px] text-ink-2">
              → {dept.name} <span className="text-ink-3">· {dept.desk}</span>
            </span>
          ) : (
            <Pill tone="warn">needs human review</Pill>
          )}
          <span className="mono ml-auto text-[11px] text-ink-3">{inc.id}</span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink">{inc.lead.complaint.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
          <span className="mono">{inc.lead.complaint.ward}</span>
          {inc.size > 1 && (
            <span className="mono">cohesion {inc.cohesion.toFixed(3)}</span>
          )}
          {inc.lead.hazards.map((h) => (
            <span key={h} className="rounded bg-p1-soft px-1.5 py-0.5 text-p1">
              {h}
            </span>
          ))}
          <span className="ml-auto text-brand">{open ? "hide detail" : "show detail"}</span>
        </div>
      </button>

      {open && (
        <div className="fade-up border-t border-line bg-paper/60 px-4 py-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mono mb-2 text-[10px] uppercase tracking-[0.12em] text-ink-3">
                {inc.size > 1 ? `All ${inc.size} reports of this incident` : "The report"}
              </p>
              <ul className="space-y-2">
                {inc.members.map((m) => (
                  <li key={m.complaint.id} className="rounded-lg border border-line bg-card p-3">
                    <div className="flex items-center gap-2 text-[11px] text-ink-3">
                      <span className="mono">{m.complaint.id}</span>
                      <span className="capitalize">{m.complaint.channel}</span>
                      <span>{m.complaint.ward}</span>
                      {m.complaint.id === inc.lead.complaint.id && (
                        <Pill tone="brand">representative</Pill>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                      {m.complaint.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mono mb-2 text-[10px] uppercase tracking-[0.12em] text-ink-3">
                Why this desk
              </p>
              <ul className="space-y-1.5">
                {inc.lead.deptScores.slice(0, 4).map((s, i) => (
                  <li key={s.dept} className="text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className={i === 0 ? "font-medium" : "text-ink-2"}>
                        {DEPARTMENTS.find((d) => d.id === s.dept)?.name}
                      </span>
                      <span className="mono text-ink-3">{s.score.toFixed(3)}</span>
                    </div>
                    <div className="mt-1">
                      <Meter value={(s.score + 0.1) / 0.9} tone={i === 0 ? "brand" : "warn"} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
                Decided by the gap between first and second place ({inc.lead.margin.toFixed(3)}),
                not by the top score alone. A confident-looking number with a close
                runner-up is exactly the case worth sending to a human.
              </p>
              {inc.lead.abstainReason && (
                <p className="mt-2 rounded-md bg-p2-soft px-2.5 py-1.5 text-[12px] text-p2">
                  {inc.lead.abstainReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
