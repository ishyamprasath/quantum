import Link from "next/link";
import { CORPUS_STATS } from "@/lib/corpus";
import { DEPARTMENTS } from "@/lib/departments";
import { Card, Pill, Section } from "@/components/ui";

export default function Home() {
  return (
    <main className="pb-8">
      {/* ---------------- hero ---------------- */}
      <section className="mx-auto max-w-[1180px] px-5 pt-16 sm:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="brand">SDG 16 · strong institutions</Pill>
              <Pill>Code for Communities</Pill>
            </div>
            <h1 className="mt-5 text-[40px] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-[54px]">
              Many voices,
              <br />
              <span className="text-brand-ink">one issue.</span>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">
              A ward officer opens a shared inbox to two hundred complaints. Eleven of
              them are the same pothole. She reads all eleven, opens eleven tickets, and
              the pothole is fixed once and closed once. The other ten stay open for
              weeks with nobody looking at them.
            </p>
            <p className="mt-4 max-w-[56ch] text-[16px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">ONDRU</span> reads that inbox in the
              browser, collapses re-reports of the same incident into one card, routes it
              to a desk, and ranks what is dangerous. When it is not sure, it says so and
              hands the item back.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/triage"
                className="rounded-lg bg-brand px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Open the triage console
              </Link>
              <Link
                href="/evaluation"
                className="rounded-lg border border-line bg-card px-5 py-2.5 text-[14px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
              >
                See the measured numbers
              </Link>
            </div>
          </div>

          <Card className="p-5">
            <p className="mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              What arrives · what the officer should read
            </p>
            <div className="mt-4 space-y-2">
              {[
                "Very big pothole right at the Gandhipuram bus stand junction near the signal…",
                "Road damage complaint: deep crater on the main carriageway at Gandhipuram…",
                "gandhipuram bus stop signal la periya pothole irukku, scooter la poravanga…",
                "Caller reports large pit on road opposite Gandhipuram bus stand…",
              ].map((t, i) => (
                <div
                  key={i}
                  className="truncate rounded-lg border border-line bg-paper px-3 py-2 text-[12px] text-ink-3"
                >
                  {t}
                </div>
              ))}
            </div>
            <div className="my-4 flex items-center gap-2">
              <span className="rule h-px flex-1" />
              <span className="mono text-[10px] uppercase tracking-wider text-ink-3">
                grouped
              </span>
              <span className="rule h-px flex-1" />
            </div>
            <div className="rounded-lg border border-brand/25 bg-brand-soft/60 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mono rounded bg-p1-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-p1">
                  P1 · today
                </span>
                <span className="mono rounded bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-ink">
                  5 reports merged
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed">
                Deep pothole at Gandhipuram bus stand signal, riders skidding.
              </p>
              <p className="mt-2 text-[11px] text-ink-3">
                → Roads &amp; Infrastructure · Assistant Engineer, Highways
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------- the three things ---------------- */}
      <Section
        className="mt-24"
        eyebrow="What it does"
        title="Three jobs, and one refusal"
        lede="Depth on one queue rather than a dashboard of four half-features. Everything below runs on the same 384-dimension sentence embedding, computed in the tab."
      >
        <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "01",
              t: "Group re-reports",
              d: "Complete-linkage clustering on cosine similarity. A complaint joins an incident only if it clears the threshold against every member. Single-linkage would chain unrelated reports together and bury one of them.",
            },
            {
              n: "02",
              t: "Route to a desk",
              d: "Eight prototype vectors, one per municipal desk, built from the phrasing complaints actually use. The decision is the gap between first and second place, not the top score.",
            },
            {
              n: "03",
              t: "Rank the danger",
              d: "Similarity to severity anchors, nudged by a small published hazard lexicon covering open manhole, live wire, children and ambulance access. Reproducible, and a supervisor can read the rule.",
            },
            {
              n: "04",
              t: "Refuse to guess",
              d: "Below the score floor or inside the margin, nothing is assigned. The complaint goes to a visible review lane with the reason. Never dropped, never silently filed.",
              accent: true,
            },
          ].map((c) => (
            <Card
              key={c.n}
              className={`p-5 ${c.accent ? "border-brand/30 bg-brand-soft/40" : ""}`}
            >
              <span className="mono text-[11px] font-semibold text-brand">{c.n}</span>
              <h3 className="mt-2 text-[15px] font-semibold">{c.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{c.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------- the refusal, argued ---------------- */}
      <Section className="mt-20">
        <Card className="overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1fr_1px_1fr]">
            <div className="p-7">
              <Pill tone="warn">the failure case</Pill>
              <h3 className="mt-3 text-[20px] font-semibold tracking-tight">
                A confidently wrong desk costs a week
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                Send a sewage overflow to the roads desk and it does not bounce back. It
                sits in the wrong queue until someone notices, and the resident is told
                it is &ldquo;under process&rdquo;. That is worse than the tool saying
                nothing at all.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                So ONDRU only answers when the best desk clears a floor{" "}
                <em>and</em> beats the runner-up by a margin. Everything else lands in a
                lane the officer can see and count.
              </p>
            </div>
            <div className="hidden bg-line md:block" />
            <div className="bg-paper/70 p-7">
              <p className="mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                Sent to human review
              </p>
              <div className="mt-3 space-y-2">
                {[
                  "please do the needful in our area, problem is going on since long time and nobody is listening",
                  "Same issue as my previous complaint number 20481. Still not resolved.",
                  "Water and road both are issues in this area, also the lights sometimes.",
                ].map((t) => (
                  <div key={t} className="rounded-lg border border-line bg-card p-3">
                    <p className="text-[12.5px] leading-relaxed text-ink-2">{t}</p>
                    <p className="mt-1.5 text-[11px] text-p2">
                      Not routed. No desk cleared the floor
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-ink-3">
                {CORPUS_STATS.ambiguous} complaints in the labelled set are like this on
                purpose. The evaluation scores whether the model refuses them.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      {/* ---------------- desks ---------------- */}
      <Section
        className="mt-20"
        eyebrow="Routing targets"
        title="The eight desks a ward office actually splits work between"
        lede="Not an org chart. Each desk is represented by a prototype vector averaged from five exemplar complaints written the way residents write them."
      >
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <Card key={d.id} className="p-4">
              <h3 className="text-[14px] font-semibold">{d.name}</h3>
              <p className="mt-1 text-[12px] text-ink-3">{d.desk}</p>
              <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                &ldquo;{d.anchors[0]}&rdquo;
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {/* ---------------- honesty ---------------- */}
      <Section className="mt-20">
        <Card className="border-line-2 p-7">
          <h3 className="text-[20px] font-semibold tracking-tight">
            What this is not
          </h3>
          <div className="mt-4 grid gap-x-10 gap-y-4 text-[14px] leading-relaxed text-ink-2 md:grid-cols-2">
            <p>
              <span className="font-medium text-ink">Not a decision.</span> ONDRU
              produces a reading order and a suggested desk. It cannot close a complaint,
              reject one, or tell a resident anything.
            </p>
            <p>
              <span className="font-medium text-ink">Not a finding.</span> A P1 means
              read this first. It does not assert that the road is unsafe. An engineer
              on site decides that, exactly as today.
            </p>
            <p>
              <span className="font-medium text-ink">Not trained on real portal data.</span>{" "}
              The {CORPUS_STATS.total} labelled complaints were written by us to match the
              register real ones arrive in. The next honest step is real complaints from
              one ward, labelled by that ward&rsquo;s officer.
            </p>
            <p>
              <span className="font-medium text-ink">Not sending anything anywhere.</span>{" "}
              The model runs in the browser tab. No API key, no server, no complaint text
              in transit, which is what makes it deployable on a live inbox at all.
            </p>
          </div>
        </Card>
      </Section>
    </main>
  );
}
