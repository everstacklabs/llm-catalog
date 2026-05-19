import { useEffect, useState } from "react";
import {
  formatLargeNumber,
  formatUsd,
  loadModelMetrics,
  type ModelMetrics,
  type Window,
} from "../lib/metrics";
import { ChartCard } from "./charts/ChartCard";
import {
  CostChart,
  LatencyChart,
  RequestsChart,
  ThroughputChart,
  TokensChart,
  TopConsumersTable,
} from "./charts/UsageCharts";

const WINDOWS: Array<{ key: Window; label: string }> = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

interface Props {
  provider: string;
  slug: string;
}

export function ModelActivity({ provider, slug }: Props) {
  const [window, setWindow] = useState<Window>("30d");
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadModelMetrics({ provider, slug, window }).then((m) => {
      if (!cancelled) {
        setMetrics(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [provider, slug, window]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Usage activity</h2>
          <p className="text-xs text-muted">
            Aggregated from gateway logs. Mock data shown until the es-core metrics endpoint ships.
          </p>
        </div>
        <WindowPicker value={window} onChange={setWindow} />
      </div>

      <TotalsStrip metrics={metrics} loading={loading} />

      {metrics && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Requests"
              subtitle={`Total ${formatLargeNumber(metrics.totals.requests)} over ${window}`}
            >
              <RequestsChart series={metrics.series} granularity={metrics.granularity} />
            </ChartCard>
            <ChartCard
              title="Tokens"
              subtitle={`${formatLargeNumber(metrics.totals.inputTokens)} in · ${formatLargeNumber(
                metrics.totals.outputTokens,
              )} out`}
            >
              <TokensChart series={metrics.series} granularity={metrics.granularity} />
            </ChartCard>
            <ChartCard
              title="Latency"
              subtitle={`p50 ${metrics.totals.medianLatencyMs}ms · p95/p99 trended`}
            >
              <LatencyChart series={metrics.series} granularity={metrics.granularity} />
            </ChartCard>
            <ChartCard
              title="Throughput"
              subtitle={`Median ${metrics.totals.medianThroughputTokPerSec} tok/s`}
            >
              <ThroughputChart series={metrics.series} granularity={metrics.granularity} />
            </ChartCard>
            <ChartCard
              title="Cost"
              subtitle={`Total ${formatUsd(metrics.totals.costUsd)} over ${window}`}
              className="lg:col-span-2"
            >
              <CostChart series={metrics.series} granularity={metrics.granularity} />
            </ChartCard>
          </div>

          <ChartCard
            title="Top consumers"
            subtitle="Ranked by request volume. Apps, keys, or projects routing to this model."
          >
            <TopConsumersTable metrics={metrics} />
          </ChartCard>
        </>
      )}
    </div>
  );
}

function WindowPicker({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  return (
    <div className="flex shrink-0 rounded-md border bg-surface p-0.5 text-xs">
      {WINDOWS.map((w) => (
        <button
          key={w.key}
          onClick={() => onChange(w.key)}
          className={`rounded px-2.5 py-1 font-medium transition ${
            value === w.key ? "bg-zinc-900 text-white" : "text-muted hover:text-zinc-900"
          }`}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

function TotalsStrip({ metrics, loading }: { metrics: ModelMetrics | null; loading: boolean }) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border bg-zinc-50" />
        ))}
      </div>
    );
  }
  const t = metrics.totals;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label="Total requests" value={formatLargeNumber(t.requests)} />
      <Tile label="Total spend" value={formatUsd(t.costUsd)} />
      <Tile label="Median latency" value={`${t.medianLatencyMs}ms`} accent={latencyAccent(t.medianLatencyMs)} />
      <Tile
        label="Uptime"
        value={`${t.uptimePct.toFixed(2)}%`}
        accent={t.uptimePct >= 99.9 ? "good" : t.uptimePct >= 99 ? "ok" : "bad"}
      />
    </div>
  );
}

function latencyAccent(ms: number): "good" | "ok" | "bad" {
  if (ms < 500) return "good";
  if (ms < 1500) return "ok";
  return "bad";
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "good" | "ok" | "bad";
}) {
  const dot =
    accent === "good"
      ? "bg-emerald-500"
      : accent === "ok"
        ? "bg-amber-500"
        : accent === "bad"
          ? "bg-rose-500"
          : null;
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
        {dot && <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />}
        {label}
      </div>
      <div className="text-2xl font-medium tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
