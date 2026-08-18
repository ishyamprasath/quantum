# ONDRU — many voices, one issue

On-device AI triage for a municipal grievance desk.

**Track:** SDG 16 · Peace, Justice & Strong Institutions
**Event:** Code for Communities / Tech for Good 2026

A ward officer opens a shared inbox to two hundred complaints. Eleven of them are the
same pothole. She reads all eleven, opens eleven tickets, and the pothole is fixed once
and closed once — the other ten stay open for weeks with nobody looking at them.

ONDRU reads that inbox **in the browser tab**, collapses re-reports of the same incident
into one card, routes it to a desk, ranks what is dangerous, and — when it is not
confident — refuses to guess and hands the item back to a human.

---

## Measured, not asserted

Every number below is recomputed live on `/evaluation` against 100 hand-labelled
complaints. Nothing is hard-coded; if the model gets worse, the page gets worse.

| Metric | all-MiniLM-L6-v2 | lexical fallback |
|---|---|---|
| Duplicate grouping F1 (pairwise, 4,950 pairs) | **76.3%** | 60.0% |
| — precision | 84.9% | 85.7% |
| — recall | 69.2% | 46.2% |
| Incidents found (true = 65) | 68 | 75 |
| Routing accuracy (on answered) | **96.2%** | 86.9% |
| Routing coverage | 83.9% | 65.6% |
| Correctly abstained on the unroutable | **7 / 7** | 5 / 7 |
| Urgency accuracy (3-way) | 61.0% | 50.0% |
| P1 recall | 84.6% | 84.6% |
| Wall clock, 100 complaints, in-tab | ~6.8 s | ~24 ms |

On the sample inbox: **100 complaints → 68 incidents**, 38 flagged P1, 22 sent to human
review.

### What these numbers do not show

- The corpus is 100 complaints **written by us** to match the register real ones arrive
  in. It is not a scrape of a live portal, and a labelled set its authors wrote will
  flatter its authors.
- The desk and severity anchors were written by the same people. Treat routing accuracy
  as an **upper bound**.
- Urgency errors are lopsided: the tool over-calls P1 far more often than it under-calls
  it. That is the safe direction, but it inflates the P1 lane. It never demotes a true P1
  to routine (P1→P3 = 0).
- The next honest step is 200 real complaints from one ward, labelled by the officer who
  works that ward.

---

## How it works

Six stages, all in the browser tab. No API route, no database, no key.

1. **Normalise** — text is left as it arrives: WhatsApp forwards, portal forms, email,
   phone notes, transliterated Tamil, misspellings.
2. **Embed** — `Xenova/all-MiniLM-L6-v2` via transformers.js, int8 quantised (~23 MB,
   cached after first load). Mean-pooled, L2-normalised to 384 dims, so a dot product is
   the cosine.
3. **Cluster** — **complete-linkage** agglomerative clustering at cosine ≥ 0.54.
4. **Route** — 8 desk prototype vectors (mean of 5 exemplars each). Two-part gate: top
   score ≥ 0.35 **and** ≥ 0.04 clear of second place.
5. **Rank** — cosine against 3 severity prototypes, plus a signed 9-rule hazard lexicon
   that is printed in full on `/method`. No language model writes the priority.
6. **Hand back** — anything failing the gate goes to a visible review lane with the
   numeric reason attached.

### Why complete linkage

Single linkage merges A and C whenever some B sits between them. On this corpus that is
not hypothetical — the Ukkadam sewage overflow and the Sungam blocked drain both describe
drain water on a road, and a mid-similarity complaint about a broken drain slab bridges
them. Merged, one incident disappears behind the other, the crew goes to one address, and
both tickets close.

Splitting one incident into two cards wastes about thirty seconds. Merging two incidents
into one loses a complaint. Those errors are not symmetric, so the algorithm does not
treat them as if they were.

### Why it abstains

Send a sewage overflow to the roads desk and it does not bounce back — it sits in the
wrong queue until someone notices, and the resident is told it is "under process". A
confidently wrong desk costs a week; an honest "I don't know" costs a glance. 7 of the
100 labelled complaints are deliberately unroutable (`"please do the needful in our
area"`), and the evaluation scores whether the model refuses them.

---

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:3000. Nothing is sent anywhere — the model downloads into the
tab on first run.

Thresholds were picked by sweep, not by taste. To reproduce:

```bash
node tune.mts
```

That prints the full duplicate-threshold sweep, the routing floor/margin grid and the
urgency lexicon grid used to choose every constant in `src/lib/triage.ts`.

## Layout

| Path | What it is |
|---|---|
| `src/lib/corpus.ts` | 100 hand-labelled complaints + the labelling protocol |
| `src/lib/departments.ts` | 8 desk prototypes, 3 severity prototypes, hazard lexicon |
| `src/lib/embed.ts` | transformers.js engine + deterministic lexical fallback |
| `src/lib/triage.ts` | clustering, routing gate, urgency scoring |
| `src/lib/metrics.ts` | pairwise dedupe / routing / urgency scoring, CSV parsing |
| `src/app/triage` | the console |
| `src/app/evaluation` | live metrics + threshold sweep |
| `src/app/method` | every constant, printed |
| `tune.mts` | offline sweep used to pick the constants |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
`@huggingface/transformers` v3 on ONNX Runtime Web. Deployed on Vercel as static pages —
there is no server-side inference to pay for.

## Deliverables

| | |
|---|---|
| Live app | https://quantum-pi-blush.vercel.app |
| Source | https://github.com/ishyamprasath/quantum |
| Slide deck | [`docs/ONDRU_PPT.pdf`](docs/ONDRU_PPT.pdf) or [`.pptx`](docs/ONDRU_PPT.pptx), 9 slides |
| Demo video | [3:12 walkthrough](https://drive.google.com/file/d/1wskAFJJ6Vx5H08E7pGRBakwX2vZdtDsc/view?usp=sharing), recorded against the live deployment |

## Scope

ONDRU produces a **reading order** and a **suggested desk**. It cannot close a complaint,
reject one, or tell a resident anything. A P1 means *read this first* — it does not assert
that the road is unsafe. An engineer on site decides that, exactly as today.
