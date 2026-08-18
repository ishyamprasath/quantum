"use client";

/**
 * Embedding layer.
 *
 * Everything runs in the browser tab. There is no inference server, no API key
 * and no complaint text leaving the machine -- which is the only reason a ward
 * office can point this at a live grievance inbox without a data-sharing note.
 *
 * Two engines:
 *   neural  - all-MiniLM-L6-v2 (6-layer transformer, 384-dim sentence
 *             embeddings) via transformers.js, int8 quantised, ~23 MB, cached
 *             by the browser after first load.
 *   lexical - hashed character n-gram TF-IDF, 512-dim. Deterministic, zero
 *             download. Used automatically when the model cannot be fetched,
 *             so the desk still gets grouping on a bad connection instead of a
 *             spinner. The evaluation page scores both, honestly.
 */

export type EngineId = "neural" | "lexical";

export interface EngineStatus {
  id: EngineId;
  label: string;
  detail: string;
}

export type ProgressFn = (p: { phase: string; loaded: number; total: number }) => void;

export const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const NEURAL_DIMS = 384;
export const LEXICAL_DIMS = 512;

/* ------------------------------------------------------------------ */
/* lexical fallback                                                     */
/* ------------------------------------------------------------------ */

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "and", "or", "but", "in", "on",
  "at", "to", "for", "of", "it", "this", "that", "there", "here", "has", "have",
  "had", "not", "no", "be", "been", "we", "our", "us", "i", "my", "me", "you",
  "your", "please", "kindly", "sir", "madam", "request", "requesting", "very",
  "so", "also", "from", "with", "by", "as", "they", "them", "their", "he", "she",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Hashed unigram + trigram-of-characters TF vector, L2 normalised. */
function lexicalVector(text: string): Float32Array {
  const v = new Float32Array(LEXICAL_DIMS);
  const toks = tokenize(text);
  for (const t of toks) {
    v[hash(t) % LEXICAL_DIMS] += 1;
    // character trigrams give partial credit across spelling variants
    for (let i = 0; i + 3 <= t.length; i++) {
      v[hash(t.slice(i, i + 3)) % LEXICAL_DIMS] += 0.35;
    }
  }
  for (let i = 0; i < toks.length - 1; i++) {
    v[hash(toks[i] + "_" + toks[i + 1]) % LEXICAL_DIMS] += 0.6;
  }
  return l2(v);
}

/* ------------------------------------------------------------------ */
/* vector helpers                                                       */
/* ------------------------------------------------------------------ */

export function l2(v: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  const n = Math.sqrt(s) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

/** Vectors are always L2-normalised, so the dot product is the cosine. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function mean(vs: Float32Array[]): Float32Array {
  const out = new Float32Array(vs[0].length);
  for (const v of vs) for (let i = 0; i < v.length; i++) out[i] += v[i];
  for (let i = 0; i < out.length; i++) out[i] /= vs.length;
  return l2(out);
}

/* ------------------------------------------------------------------ */
/* engine                                                              */
/* ------------------------------------------------------------------ */

type Extractor = (
  texts: string[],
  opts: { pooling: "mean"; normalize: boolean }
) => Promise<{ dims: number[]; data: Float32Array | number[] }>;

let extractor: Extractor | null = null;
let loadPromise: Promise<Extractor | null> | null = null;
let engine: EngineId = "lexical";
let engineDetail = "not initialised";

export function currentEngine(): EngineStatus {
  return {
    id: engine,
    label: engine === "neural" ? "all-MiniLM-L6-v2" : "lexical fallback",
    detail: engineDetail,
  };
}

/**
 * Loads the transformer once. If anything at all goes wrong -- offline, CDN
 * blocked, no WASM -- we fall back rather than fail, and say so in the UI.
 */
export async function initEngine(onProgress?: ProgressFn): Promise<EngineStatus> {
  if (extractor) return currentEngine();
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const tf = await import("@huggingface/transformers");
        tf.env.allowLocalModels = false;
        if (tf.env.backends?.onnx?.wasm) {
          tf.env.backends.onnx.wasm.proxy = false;
        }
        const pipe = await tf.pipeline("feature-extraction", MODEL_ID, {
          dtype: "q8",
          progress_callback: (p: unknown) => {
            const e = p as { status?: string; loaded?: number; total?: number; file?: string };
            if (e.status === "progress" && e.total) {
              onProgress?.({
                phase: e.file ?? "model",
                loaded: e.loaded ?? 0,
                total: e.total,
              });
            }
          },
        });
        engine = "neural";
        engineDetail = "int8 quantised, running in this tab";
        return pipe as unknown as Extractor;
      } catch (err) {
        engine = "lexical";
        engineDetail =
          "model unavailable (" +
          (err instanceof Error ? err.message.slice(0, 60) : "unknown") +
          "), using deterministic n-gram vectors";
        return null;
      }
    })();
  }
  extractor = await loadPromise;
  if (!extractor) {
    engine = "lexical";
    if (engineDetail === "not initialised") engineDetail = "using deterministic n-gram vectors";
  }
  return currentEngine();
}

/** Force the lexical path, so the demo can show the degraded mode on purpose. */
export function forceLexical() {
  extractor = null;
  loadPromise = null;
  engine = "lexical";
  engineDetail = "forced by operator, deterministic n-gram vectors";
}

export async function embed(
  texts: string[],
  onProgress?: ProgressFn
): Promise<Float32Array[]> {
  if (!extractor) {
    return texts.map(lexicalVector);
  }
  const out: Float32Array[] = [];
  const BATCH = 16;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await extractor(slice, { pooling: "mean", normalize: true });
    const dim = res.dims[res.dims.length - 1];
    const data = res.data as Float32Array;
    for (let j = 0; j < slice.length; j++) {
      out.push(l2(Float32Array.from(data.slice(j * dim, (j + 1) * dim))));
    }
    onProgress?.({ phase: "embedding", loaded: Math.min(i + BATCH, texts.length), total: texts.length });
    // yield so the progress bar actually paints
    await new Promise((r) => setTimeout(r, 0));
  }
  return out;
}
