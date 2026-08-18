// Offline threshold sweep. Not part of the app -- run with `node tune.mts`.
import { pipeline, env } from "@huggingface/transformers";
import { CORPUS } from "./src/lib/corpus.ts";
import { DEPARTMENTS, URGENCY_ANCHORS, HAZARD_LEXICON } from "./src/lib/departments.ts";
import type { Urgency } from "./src/lib/types.ts";

env.allowLocalModels = false;

const cos = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};
const l2 = (v: Float32Array) => {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s) || 1;
  return v.map((x) => x / n) as Float32Array;
};
const mean = (vs: Float32Array[]) => {
  const o = new Float32Array(vs[0].length);
  for (const v of vs) for (let i = 0; i < v.length; i++) o[i] += v[i];
  return l2(o.map((x) => x / vs.length) as Float32Array);
};

const pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
async function embed(texts: string[]): Promise<Float32Array[]> {
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const s = texts.slice(i, i + 16);
    const r = await pipe(s, { pooling: "mean", normalize: true });
    const dim = r.dims[r.dims.length - 1];
    const d = r.data as Float32Array;
    for (let j = 0; j < s.length; j++)
      out.push(l2(Float32Array.from(d.slice(j * dim, (j + 1) * dim))));
  }
  return out;
}

function clusterComplete(vectors: Float32Array[], threshold: number): number[] {
  const n = vectors.length;
  const assign = new Array<number>(n).fill(-1);
  const clusters: number[][] = [];
  const pairs: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const s = cos(vectors[i], vectors[j]);
      if (s >= threshold) pairs.push([s, i, j]);
    }
  pairs.sort((a, b) => b[0] - a[0]);
  for (const [, i, j] of pairs) {
    const ci = assign[i], cj = assign[j];
    if (ci === -1 && cj === -1) { clusters.push([i, j]); assign[i] = assign[j] = clusters.length - 1; }
    else if (ci !== -1 && cj === -1) {
      if (clusters[ci].every((m) => cos(vectors[m], vectors[j]) >= threshold)) { clusters[ci].push(j); assign[j] = ci; }
    } else if (ci === -1 && cj !== -1) {
      if (clusters[cj].every((m) => cos(vectors[m], vectors[i]) >= threshold)) { clusters[cj].push(i); assign[i] = cj; }
    } else if (ci !== cj) {
      const a = clusters[ci], b = clusters[cj];
      if (a.every((x) => b.every((y) => cos(vectors[x], vectors[y]) >= threshold))) {
        for (const m of b) assign[m] = ci;
        clusters[ci] = a.concat(b);
        clusters[cj] = [];
      }
    }
  }
  for (let i = 0; i < n; i++) if (assign[i] === -1) { clusters.push([i]); assign[i] = clusters.length - 1; }
  return assign;
}

const texts = CORPUS.map((c) => c.text);
const vecs = await embed(texts);
const gold = CORPUS.map((c) => c.gold.group ?? `__${c.id}`);

console.log("\n=== DUPE THRESHOLD SWEEP ===");
console.log("thr\tprec\trecall\tF1\tclusters");
let bestF1 = { t: 0, f1: 0 };
for (let t = 0.4; t <= 0.9001; t += 0.02) {
  const a = clusterComplete(vecs, t);
  let tp = 0, fp = 0, fn = 0;
  for (let i = 0; i < CORPUS.length; i++)
    for (let j = i + 1; j < CORPUS.length; j++) {
      const same = gold[i] === gold[j], pred = a[i] === a[j];
      if (same && pred) tp++; else if (!same && pred) fp++; else if (same && !pred) fn++;
    }
  const p = tp + fp ? tp / (tp + fp) : 1;
  const r = tp + fn ? tp / (tp + fn) : 1;
  const f1 = p + r ? (2 * p * r) / (p + r) : 0;
  if (f1 > bestF1.f1) bestF1 = { t, f1 };
  console.log(`${t.toFixed(2)}\t${(p * 100).toFixed(1)}\t${(r * 100).toFixed(1)}\t${(f1 * 100).toFixed(1)}\t${new Set(a).size}`);
}
console.log("best F1 at", bestF1.t.toFixed(2), (bestF1.f1 * 100).toFixed(1));

// ---- routing ----
const deptAnchors = DEPARTMENTS.flatMap((d) => d.anchors);
const av = await embed(deptAnchors);
let c = 0;
const protos = DEPARTMENTS.map((d) => {
  const v = mean(av.slice(c, c + d.anchors.length));
  c += d.anchors.length;
  return { dept: d.id, vec: v };
});

console.log("\n=== ROUTING GATE SWEEP (floor / margin) ===");
console.log("floor\tmargin\tcover\tacc\tabstain-on-unclear");
for (const floor of [0.1, 0.15, 0.2, 0.25, 0.3, 0.35]) {
  for (const margin of [0.0, 0.02, 0.04, 0.06, 0.08]) {
    let ans = 0, right = 0, ambAbs = 0, ambTot = 0, routable = 0;
    CORPUS.forEach((cm, i) => {
      const sc = protos.map((p) => ({ d: p.dept, s: cos(vecs[i], p.vec) })).sort((a, b) => b.s - a.s);
      const abst = sc[0].s < floor || sc[0].s - sc[1].s < margin;
      if (cm.gold.dept === "unclear") { ambTot++; if (abst) ambAbs++; }
      else { routable++; if (!abst) { ans++; if (sc[0].d === cm.gold.dept) right++; } }
    });
    console.log(`${floor}\t${margin}\t${((ans / routable) * 100).toFixed(0)}%\t${((right / ans) * 100).toFixed(1)}%\t${ambAbs}/${ambTot}`);
  }
}

// ---- urgency ----
const ua = await embed((["P1", "P2", "P3"] as Urgency[]).flatMap((u) => URGENCY_ANCHORS[u]));
let k = 0;
const up = {} as Record<Urgency, Float32Array>;
for (const u of ["P1", "P2", "P3"] as Urgency[]) {
  up[u] = mean(ua.slice(k, k + URGENCY_ANCHORS[u].length));
  k += URGENCY_ANCHORS[u].length;
}

function urg(i: number, scale: number) {
  const t = CORPUS[i].text;
  const b: Record<Urgency, number> = { P1: cos(vecs[i], up.P1), P2: cos(vecs[i], up.P2), P3: cos(vecs[i], up.P3) };
  let bump = 0;
  for (const h of HAZARD_LEXICON) if (h.re.test(t)) bump += h.weight;
  b.P1 += bump * scale;
  b.P3 -= bump * scale * 0.5;
  return (["P1", "P2", "P3"] as Urgency[]).reduce((x, y) => (b[x] >= b[y] ? x : y));
}

console.log("\n=== URGENCY LEXICON SCALE ===");
console.log("scale\tacc\tP1recall\tconfusion P1→(P1,P2,P3)");
for (const scale of [0, 0.5, 1, 1.5, 2, 3, 4]) {
  let right = 0;
  const cm: Record<string, number> = { P1P1: 0, P1P2: 0, P1P3: 0 };
  CORPUS.forEach((cp, i) => {
    const p = urg(i, scale);
    if (p === cp.gold.urgency) right++;
    if (cp.gold.urgency === "P1") cm["P1" + p]++;
  });
  const p1t = cm.P1P1 + cm.P1P2 + cm.P1P3;
  console.log(`${scale}\t${right}%\t${((cm.P1P1 / p1t) * 100).toFixed(1)}%\t(${cm.P1P1},${cm.P1P2},${cm.P1P3})`);
}

console.log("\n=== FULL CONFUSION @ scale 2 ===");
const L: Urgency[] = ["P1", "P2", "P3"];
const M: Record<string, number> = {};
const wrong: string[] = [];
CORPUS.forEach((cp, i) => {
  const p = urg(i, 2);
  M[cp.gold.urgency + "->" + p] = (M[cp.gold.urgency + "->" + p] ?? 0) + 1;
  if (p !== cp.gold.urgency) wrong.push(`${cp.id} gold=${cp.gold.urgency} pred=${p} :: ${cp.text.slice(0, 90)}`);
});
for (const a of L) console.log(a, L.map((b) => `${b}:${M[a + "->" + b] ?? 0}`).join("  "));
console.log("\n-- misclassified --");
wrong.slice(0, 45).forEach((w) => console.log(w));

console.log("\n=== P1 GATE GRID (w1, margin) ===");
console.log("w1\tmarg\tacc\tP1rec\tP1->P3\tP2->P1");
for (const w1 of [0, 0.5, 1, 1.5, 2]) {
  for (const m of [0, 0.01, 0.02, 0.03, 0.04, 0.06]) {
    let right = 0, p1p1 = 0, p1t = 0, p1p3 = 0, p2p1 = 0;
    CORPUS.forEach((cp, i) => {
      const t = cp.text;
      let bump = 0;
      for (const h of HAZARD_LEXICON) if (h.re.test(t)) bump += h.weight;
      const s1 = cos(vecs[i], up.P1) + w1 * bump;
      const s2 = cos(vecs[i], up.P2);
      const s3 = cos(vecs[i], up.P3) - w1 * bump * 0.5;
      let p: Urgency;
      if (s1 > s2 + m && s1 > s3 + m) p = "P1";
      else p = s3 > s2 ? "P3" : "P2";
      if (p === cp.gold.urgency) right++;
      if (cp.gold.urgency === "P1") { p1t++; if (p === "P1") p1p1++; if (p === "P3") p1p3++; }
      if (cp.gold.urgency === "P2" && p === "P1") p2p1++;
    });
    console.log(`${w1}\t${m}\t${right}%\t${((p1p1/p1t)*100).toFixed(1)}%\t${p1p3}\t${p2p1}`);
  }
}

// ---------- lexical fallback, same corpus, its own thresholds ----------
const STOP = new Set(["the","a","an","is","are","was","were","and","or","but","in","on","at","to","for","of","it","this","that","there","here","has","have","had","not","no","be","been","we","our","us","i","my","me","you","your","please","kindly","sir","madam","request","requesting","very","so","also","from","with","by","as","they","them","their","he","she"]);
const tok = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(x=>x.length>2 && !STOP.has(x));
const hsh = (s: string) => { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return Math.abs(h); };
const LD = 512;
function lex(text: string): Float32Array {
  const v = new Float32Array(LD);
  const ts = tok(text);
  for (const t of ts) { v[hsh(t)%LD]+=1; for(let i=0;i+3<=t.length;i++) v[hsh(t.slice(i,i+3))%LD]+=0.35; }
  for (let i=0;i<ts.length-1;i++) v[hsh(ts[i]+"_"+ts[i+1])%LD]+=0.6;
  return l2(v);
}
const lvecs = CORPUS.map(c => lex(c.text));
console.log("\n=== LEXICAL DUPE SWEEP ===");
console.log("thr\tprec\trecall\tF1\tclusters");
let lbest = { t: 0, f1: 0 };
for (let t = 0.2; t <= 0.8001; t += 0.05) {
  const a = clusterComplete(lvecs, t);
  let tp=0,fp=0,fn=0;
  for (let i=0;i<CORPUS.length;i++) for (let j=i+1;j<CORPUS.length;j++) {
    const same = gold[i]===gold[j], pred = a[i]===a[j];
    if (same&&pred) tp++; else if(!same&&pred) fp++; else if(same&&!pred) fn++;
  }
  const p = tp+fp?tp/(tp+fp):1, r = tp+fn?tp/(tp+fn):1;
  const f1 = p+r?(2*p*r)/(p+r):0;
  if (f1>lbest.f1) lbest={t,f1};
  console.log(`${t.toFixed(2)}\t${(p*100).toFixed(1)}\t${(r*100).toFixed(1)}\t${(f1*100).toFixed(1)}\t${new Set(a).size}`);
}
console.log("lexical best F1 at", lbest.t.toFixed(2), (lbest.f1*100).toFixed(1));

const lav = DEPARTMENTS.flatMap(d=>d.anchors).map(lex);
let lc = 0;
const lprotos = DEPARTMENTS.map(d => { const v = mean(lav.slice(lc, lc+d.anchors.length)); lc+=d.anchors.length; return {dept:d.id, vec:v}; });
console.log("\n=== LEXICAL ROUTING GATE ===");
console.log("floor\tmarg\tcover\tacc\tabst");
for (const floor of [0.02,0.05,0.08,0.12,0.16,0.2]) for (const m of [0,0.01,0.02,0.04]) {
  let ans=0,right=0,aa=0,at=0,ro=0;
  CORPUS.forEach((cm,i)=>{
    const sc = lprotos.map(p=>({d:p.dept,s:cos(lvecs[i],p.vec)})).sort((a,b)=>b.s-a.s);
    const ab = sc[0].s<floor || sc[0].s-sc[1].s<m;
    if (cm.gold.dept==="unclear"){at++;if(ab)aa++;} else {ro++;if(!ab){ans++;if(sc[0].d===cm.gold.dept)right++;}}
  });
  console.log(`${floor}\t${m}\t${((ans/ro)*100).toFixed(0)}%\t${ans?((right/ans)*100).toFixed(1):"-"}%\t${aa}/${at}`);
}
