import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  Granularity,
  ModelMetrics,
  TimePoint,
} from "../../lib/metrics";
import {
  formatBucketLabel,
  formatLargeNumber,
  formatUsd,
} from "../../lib/metrics";

const GRID = "#e4e4e7";
const AXIS = "#71717a";

interface TimelineProps {
  series: TimePoint[];
  granularity: Granularity;
}

export function RequestsChart({ series, granularity }: TimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-req" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatBucketLabel(v, granularity)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={formatLargeNumber}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<TooltipContent granularity={granularity} />} />
        <Area
          type="monotone"
          dataKey="requests"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#g-req)"
          name="Requests"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TokensChart({ series, granularity }: TimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatBucketLabel(v, granularity)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={formatLargeNumber}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<TooltipContent granularity={granularity} />} />
        <Legend
          verticalAlign="top"
          align="right"
          height={22}
          iconType="square"
          wrapperStyle={{ fontSize: 11, color: AXIS }}
        />
        <Bar dataKey="inputTokens" stackId="t" fill="#6366f1" name="Input" radius={[0, 0, 0, 0]} />
        <Bar dataKey="outputTokens" stackId="t" fill="#a855f7" name="Output" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LatencyChart({ series, granularity }: TimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatBucketLabel(v, granularity)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={(n) => `${formatLargeNumber(n)}ms`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<TooltipContent granularity={granularity} suffix="ms" />} />
        <Legend
          verticalAlign="top"
          align="right"
          height={22}
          iconType="line"
          wrapperStyle={{ fontSize: 11, color: AXIS }}
        />
        <Line type="monotone" dataKey="latencyP50Ms" stroke="#10b981" strokeWidth={2} dot={false} name="p50" />
        <Line type="monotone" dataKey="latencyP95Ms" stroke="#f59e0b" strokeWidth={2} dot={false} name="p95" />
        <Line type="monotone" dataKey="latencyP99Ms" stroke="#ef4444" strokeWidth={2} dot={false} name="p99" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ThroughputChart({ series, granularity }: TimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-tp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatBucketLabel(v, granularity)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={(n) => `${formatLargeNumber(n)} t/s`}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<TooltipContent granularity={granularity} suffix=" tok/s" />} />
        <Area
          type="monotone"
          dataKey="throughputTokPerSec"
          stroke="#14b8a6"
          strokeWidth={2}
          fill="url(#g-tp)"
          name="Throughput"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CostChart({ series, granularity }: TimelineProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="g-cost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatBucketLabel(v, granularity)}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={formatUsd}
          tick={{ fill: AXIS, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<TooltipContent granularity={granularity} usd />} />
        <Area
          type="monotone"
          dataKey="costUsd"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#g-cost)"
          name="Cost"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopConsumersTable({ metrics }: { metrics: ModelMetrics }) {
  const totalReqs = metrics.totals.requests;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pr-4 font-medium">Consumer</th>
            <th className="py-2 pr-4 font-medium">Share</th>
            <th className="py-2 pr-4 font-medium tabular-nums">Requests</th>
            <th className="py-2 pr-4 font-medium tabular-nums">Tokens</th>
            <th className="py-2 font-medium tabular-nums">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {metrics.topConsumers.map((c) => {
            const share = totalReqs > 0 ? c.requests / totalReqs : 0;
            return (
              <tr key={c.id}>
                <td className="py-2 pr-4">
                  <div className="font-medium">{c.name}</div>
                  <div className="font-mono text-[11px] text-muted">{c.id}</div>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted">
                      {(share * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-4 tabular-nums">{formatLargeNumber(c.requests)}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {formatLargeNumber(c.inputTokens + c.outputTokens)}
                </td>
                <td className="py-2 tabular-nums">{formatUsd(c.costUsd)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TooltipContent({
  active,
  payload,
  label,
  granularity,
  suffix,
  usd,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  granularity: Granularity;
  suffix?: string;
  usd?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-surface px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-medium">
        {label ? formatBucketLabel(label, granularity) : ""}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: p.color }}
            aria-hidden
          />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto font-medium tabular-nums">
            {usd
              ? formatUsd(Number(p.value || 0))
              : `${formatLargeNumber(Number(p.value || 0))}${suffix || ""}`}
          </span>
        </div>
      ))}
    </div>
  );
}
