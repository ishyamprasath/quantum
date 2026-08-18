import { Card, Pill, Section } from "@/components/ui";
import { DEFAULT_THRESHOLDS } from "@/lib/triage";
import { HAZARD_LEXICON } from "@/lib/departments";
import { MODEL_ID, NEURAL_DIMS } from "@/lib/embed";

const STAGES = [
  {
    n: "01",
    t: "Normalise",
    d: "Complaints arrive from WhatsApp forwards, a portal form, email and phone notes. Casing, punctuation and transliterated Tamil are left alone — the sentence encoder handles them better than a regex would.",
  },
  {
    n: "02",
    t: "Embed",
    d: `${MODEL_ID}, a 6-layer MiniLM distilled from a larger sentence encoder, int8 quantised to about 23 MB. Mean-pooled over tokens, L2 normalised to ${NEURAL_DIMS} dimensions, so a dot product is the cosine.`,
  },
  {
    n: "03",
    t: "Cluster",
    d: "Complete-linkage agglomerative clustering. All pairs above the threshold are sorted by similarity and merged greedily, but a merge is refused unless every member of both clusters clears the threshold against every member of the other.",
  },
  {
    n: "04",
    t: "Route",
    d: "Eight desk prototypes, each the normalised mean of five exemplar vectors. Cosine against all eight, then a two-part gate: the top score must clear a floor, and it must beat second place by a margin.",
  },
  {
    n: "05",
    t: "Rank",
    d: "Cosine against three severity prototypes, then a signed nudge from a hazard lexicon that a supervisor can read and argue with. No language model writes the priority.",
  },
  {
    n: "06",
    t: "Hand back",
    d: "Anything that fails the gate goes to the review lane with the numeric reason attached. The count is shown on the console, so a desk can see when the tool is struggling instead of trusting it silently.",
  },
];

export default function MethodPage() {
  return (
    <main className="pb-8">
      <Section className="pt-14">
        <p className="mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          How it works
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight">Method</h1>
        <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
          Six stages, all of them in the browser tab. Nothing here is a black box you
          have to take on faith — every threshold below is swept on the labelled set and
          shown on the evaluation page.
        </p>

        <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s) => (
            <Card key={s.n} as="li" className="p-5">
              <span className="mono text-[11px] font-semibold text-brand">{s.n}</span>
              <h2 className="mt-2 text-[15px] font-semibold">{s.t}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{s.d}</p>
            </Card>
          ))}
        </ol>
      </Section>

      <Section className="mt-16" title="The numbers that decide things">
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Thresholds
            </p>
            <table className="mt-3 w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="py-2 font-medium">Gate</th>
                  <th className="py-2 text-right font-medium">Neural</th>
                  <th className="py-2 text-right font-medium">Lexical</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Duplicate cosine", "dupe"],
                  ["Routing score floor", "routeFloor"],
                  ["Routing margin", "routeMargin"],
                ].map(([label, k]) => (
                  <tr key={k} className="border-b border-line">
                    <td className="py-2">{label}</td>
                    <td className="mono py-2 text-right">
                      {DEFAULT_THRESHOLDS.neural[k as keyof typeof DEFAULT_THRESHOLDS.neural]}
                    </td>
                    <td className="mono py-2 text-right text-ink-3">
                      {DEFAULT_THRESHOLDS.lexical[k as keyof typeof DEFAULT_THRESHOLDS.lexical]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
              The two engines get separate thresholds because their similarity
              distributions are not comparable. Reusing one number across both is the
              standard way to make a fallback look broken.
            </p>
          </Card>

          <Card className="p-5">
            <p className="mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Hazard lexicon — the whole of it
            </p>
            <ul className="mt-3 space-y-1.5">
              {HAZARD_LEXICON.map((h) => (
                <li key={h.label} className="flex items-baseline justify-between text-[13px]">
                  <span className={h.weight > 0 ? "" : "text-ink-3"}>{h.label}</span>
                  <span
                    className={`mono text-[12px] ${h.weight > 0 ? "text-p1" : "text-ink-3"}`}
                  >
                    {h.weight > 0 ? "+" : ""}
                    {h.weight.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
              Nine rules, printed in full. If the tool ranks something oddly, an officer
              can point at the line that did it — which is not true of a priority a
              language model wrote.
            </p>
          </Card>
        </div>
      </Section>

      <Section className="mt-16">
        <Card className="p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="brand">design note</Pill>
            <h2 className="text-[20px] font-semibold tracking-tight">
              Why complete linkage, when single linkage is faster
            </h2>
          </div>
          <div className="mt-4 grid gap-6 text-[14px] leading-relaxed text-ink-2 md:grid-cols-2">
            <div>
              <p>
                Single linkage merges A and C whenever some B sits between them. On this
                corpus that is not hypothetical: the Ukkadam sewage overflow and the
                Sungam blocked drain both talk about drain water on a road, and a
                mid-similarity complaint about a broken drain slab will bridge them.
              </p>
              <p className="mt-3">
                Merged, one of those two incidents disappears behind the other. The crew
                goes to Ukkadam, the ticket closes, and the Sungam report closes with
                it — and nobody involved ever learns that happened.
              </p>
            </div>
            <div>
              <p>
                Complete linkage costs more comparisons and refuses more merges. It
                produces a few extra cards on the console, which an officer can see and
                dismiss in a second.
              </p>
              <p className="mt-3">
                Splitting one incident into two cards wastes about thirty seconds. Merging
                two incidents into one loses a complaint. For this queue those errors are
                not symmetric, so the algorithm should not treat them as if they were.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      <Section className="mt-16" title="Stack">
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Next.js 16 · App Router", d: "TypeScript, React 19, static export-friendly. Deployed on Vercel." },
            { t: "transformers.js v3", d: "ONNX Runtime Web, WASM backend, int8 weights, cached by the browser after first load." },
            { t: "No backend", d: "There is no API route, no database and no key. The evaluation runs client-side too." },
            { t: "Tailwind v4", d: "One light theme, tuned for a screen in an office with bad lighting." },
          ].map((s) => (
            <Card key={s.t} className="p-4">
              <h3 className="text-[14px] font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{s.d}</p>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
