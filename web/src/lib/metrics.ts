// Contract for the future es-core /metrics endpoint. Designed so es-core
// can implement against this shape and the dashboard swaps `mockMetrics`
// for `fetch()` without UI changes.
//
//   GET /api/metrics/models/:provider/:slug?window=30d&granularity=day
//
// All series share the same `t` timeline so charts can be aligned without
// re-bucketing on the client.

export type Window = "24h" | "7d" | "30d" | "90d";
export type Granularity = "hour" | "day";

export interface MetricsRequest {
  provider: string;
  slug: string;
  window: Window;
  granularity?: Granularity;
}

export interface TimePoint {
  t: string; // ISO timestamp at bucket start
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  throughputTokPerSec: number;
  errorRate: number; // 0..1
}

export interface TopConsumer {
  id: string; // app/key/project id
  name: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface ModelMetrics {
  provider: string;
  slug: string;
  window: Window;
  granularity: Granularity;
  generatedAt: string;
  totals: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    medianLatencyMs: number;
    medianThroughputTokPerSec: number;
    uptimePct: number; // 0..100
    errorRate: number; // 0..1
  };
  series: TimePoint[];
  topConsumers: TopConsumer[];
}

const USE_MOCK = true;

export async function loadModelMetrics(req: MetricsRequest): Promise<ModelMetrics> {
  if (USE_MOCK) return mockMetrics(req);
  const res = await fetch(
    `/api/metrics/models/${req.provider}/${req.slug}?window=${req.window}&granularity=${req.granularity ?? defaultGranularity(req.window)}`,
  );
  if (!res.ok) throw new Error(`metrics ${res.status}`);
  return (await res.json()) as ModelMetrics;
}

function defaultGranularity(w: Window): Granularity {
  return w === "24h" ? "hour" : "day";
}

// ----- Mock implementation ------------------------------------------------
// Deterministic from slug so charts are stable per model during dev.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function mockMetrics(req: MetricsRequest): ModelMetrics {
  const granularity = req.granularity ?? defaultGranularity(req.window);
  const buckets =
    req.window === "24h" ? 24 : req.window === "7d" ? 7 : req.window === "30d" ? 30 : 90;
  const stepMs = granularity === "hour" ? 3600_000 : 86400_000;
  const r = rng(hash(`${req.provider}/${req.slug}`));

  // Per-model baselines so different models look distinguishable.
  const baseReq = 100 + Math.floor(r() * 8000);
  const trend = (r() - 0.4) * 0.05; // slope
  const baseInTok = 800 + r() * 4000;
  const baseOutTok = 400 + r() * 2500;
  const baseP50 = 150 + r() * 1200;
  const baseTokPs = 30 + r() * 90;
  const baseErr = r() * 0.012;
  const baseCostPerKReq = 0.4 + r() * 4.5;

  const now = Date.now();
  const start = now - buckets * stepMs;

  const series: TimePoint[] = [];
  for (let i = 0; i < buckets; i++) {
    const t = new Date(start + i * stepMs).toISOString();
    const seasonal = 1 + 0.15 * Math.sin((i / buckets) * Math.PI * 2);
    const noise = 0.85 + r() * 0.3;
    const growth = 1 + trend * i;
    const requests = Math.max(1, Math.round(baseReq * seasonal * noise * growth));
    const inputTokens = Math.round(requests * baseInTok * (0.9 + r() * 0.2));
    const outputTokens = Math.round(requests * baseOutTok * (0.9 + r() * 0.2));
    const latencyP50Ms = Math.round(baseP50 * (0.9 + r() * 0.25));
    const latencyP95Ms = Math.round(latencyP50Ms * (1.8 + r() * 0.6));
    const latencyP99Ms = Math.round(latencyP95Ms * (1.3 + r() * 0.5));
    const throughputTokPerSec = +(baseTokPs * (0.85 + r() * 0.35)).toFixed(1);
    const errorRate = Math.max(0, baseErr * (0.5 + r()));
    const costUsd = +(requests * baseCostPerKReq * 0.001).toFixed(4);
    series.push({
      t,
      requests,
      inputTokens,
      outputTokens,
      costUsd,
      latencyP50Ms,
      latencyP95Ms,
      latencyP99Ms,
      throughputTokPerSec,
      errorRate,
    });
  }

  const totals = series.reduce(
    (acc, p) => {
      acc.requests += p.requests;
      acc.inputTokens += p.inputTokens;
      acc.outputTokens += p.outputTokens;
      acc.costUsd += p.costUsd;
      acc.medianLatencyMs += p.latencyP50Ms;
      acc.medianThroughputTokPerSec += p.throughputTokPerSec;
      acc.errorRate += p.errorRate;
      return acc;
    },
    {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      medianLatencyMs: 0,
      medianThroughputTokPerSec: 0,
      uptimePct: 0,
      errorRate: 0,
    },
  );
  totals.medianLatencyMs = Math.round(totals.medianLatencyMs / series.length);
  totals.medianThroughputTokPerSec = +(totals.medianThroughputTokPerSec / series.length).toFixed(1);
  totals.errorRate = +(totals.errorRate / series.length).toFixed(4);
  totals.uptimePct = +(100 - totals.errorRate * 100).toFixed(2);
  totals.costUsd = +totals.costUsd.toFixed(2);

  const customerNames = [
    "ChatPlayground",
    "CodeSidekick",
    "SupportBot",
    "DataPilot",
    "DocsSummarizer",
    "DraftAssist",
    "InboxIntel",
    "VoiceAgent",
    "Internal/eval",
    "Internal/qa",
    "research-cluster",
    "growth-experiments",
  ];
  const topConsumers: TopConsumer[] = [];
  let remaining = totals.requests;
  for (let i = 0; i < 6; i++) {
    const share = i === 5 ? remaining / totals.requests : 0.35 / (i + 1) + r() * 0.05;
    const reqs = Math.round(totals.requests * Math.min(share, remaining / totals.requests));
    remaining -= reqs;
    const inT = Math.round(reqs * baseInTok);
    const outT = Math.round(reqs * baseOutTok);
    topConsumers.push({
      id: `app_${hash(customerNames[i] + req.slug)}`,
      name: customerNames[i],
      requests: reqs,
      inputTokens: inT,
      outputTokens: outT,
      costUsd: +(reqs * baseCostPerKReq * 0.001).toFixed(2),
    });
  }
  topConsumers.sort((a, b) => b.requests - a.requests);

  return {
    provider: req.provider,
    slug: req.slug,
    window: req.window,
    granularity,
    generatedAt: new Date().toISOString(),
    totals,
    series,
    topConsumers,
  };
}

export function formatBucketLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(3)}`;
}
