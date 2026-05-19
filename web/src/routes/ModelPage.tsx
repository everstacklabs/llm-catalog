import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  findModel,
  findProvider,
  loadCatalog,
  modelDisplayName,
  providerDisplayName,
  type Catalog,
  type CatalogModel,
  type CatalogProvider,
} from "../lib/catalog";
import { ProviderLogo } from "../components/ProviderLogo";
import { Badge } from "../components/Badge";
import { formatCostPerMillion, formatDate, formatTokens, titleCase } from "../lib/format";

const ModelActivity = lazy(() =>
  import("../components/ModelActivity").then((m) => ({ default: m.ModelActivity })),
);

type Tab = "overview" | "activity" | "api";

export function ModelPage() {
  const { provider: providerSlug = "", model: modelSlug = "" } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    loadCatalog().then(setCatalog);
  }, []);

  const { provider, model, related } = useMemo(() => {
    if (!catalog) return { provider: null, model: null, related: [] as CatalogModel[] };
    const p = findProvider(catalog, providerSlug) || null;
    const m = p ? findModel(p, modelSlug) || null : null;
    const r = p && m
      ? p.models
          .filter((x) => x.slug !== m.slug && (x.family === m.family || sharesCapability(x, m)))
          .slice(0, 6)
      : [];
    return { provider: p, model: m, related: r };
  }, [catalog, providerSlug, modelSlug]);

  if (!catalog) return <div className="text-sm text-muted">Loading…</div>;
  if (!provider) return notFound("Provider");
  if (!model) return notFound("Model", provider);

  const capabilities = model.capabilities || [];
  const inputMods = model.modalities?.input || [];
  const outputMods = model.modalities?.output || [];

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb provider={provider} model={model} />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <ProviderLogo slug={provider.slug} displayName={providerDisplayName(provider)} size={64} />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{modelDisplayName(model)}</h1>
            <StatusBadge status={model.status} />
            {model.family && <Badge>{model.family}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Link to={`/${provider.slug}`} className="hover:text-zinc-900">
              {providerDisplayName(provider)}
            </Link>
            <span>·</span>
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{model.slug}</code>
          </div>
          {model.description && (
            <p className="max-w-3xl text-zinc-700">{String(model.description)}</p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Context window"
          value={formatTokens(model.limits?.max_tokens ?? model.limits?.max_input_tokens)}
          sub="tokens"
        />
        <KpiTile
          label="Max output"
          value={formatTokens(
            model.limits?.max_completion_tokens ?? model.limits?.max_output_tokens,
          )}
          sub="tokens"
        />
        <KpiTile
          label="Input price"
          value={formatCostPerMillion(model.cost?.input_per_1k)}
          sub="per 1M tokens"
        />
        <KpiTile
          label="Output price"
          value={formatCostPerMillion(model.cost?.output_per_1k)}
          sub="per 1M tokens"
        />
      </div>

      <Tabs current={tab} onChange={setTab} />

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Section title="Capabilities" className="lg:col-span-2">
              {capabilities.length === 0 ? (
                <Empty>No capabilities listed.</Empty>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((c) => (
                    <Badge key={c} tone="accent" className="px-2 py-1 text-xs">
                      {titleCase(c)}
                    </Badge>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Modalities">
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted">Input</div>
                  <div className="flex flex-wrap gap-1">
                    {inputMods.length ? (
                      inputMods.map((m) => <Badge key={m}>{m}</Badge>)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted">Output</div>
                  <div className="flex flex-wrap gap-1">
                    {outputMods.length ? (
                      outputMods.map((m) => <Badge key={m}>{m}</Badge>)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Pricing breakdown" className="lg:col-span-2">
              <PricingTable model={model} />
            </Section>

            <Section title="Details">
              <dl className="divide-y text-sm">
                <DataRow label="Model ID" value={<code className="font-mono text-xs">{model.slug}</code>} />
                <DataRow label="Family" value={model.family || "—"} />
                <DataRow label="Status" value={model.status || "stable"} />
                <DataRow label="Knowledge cutoff" value={formatDate(model.knowledge_cutoff)} />
                <DataRow label="Release date" value={formatDate(model.release_date)} />
              </dl>
            </Section>
          </div>

          {related.length > 0 && (
            <Section title={`More from ${providerDisplayName(provider)}`}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {related.map((m) => (
                  <Link
                    key={m.slug}
                    to={`/${provider.slug}/${m.slug}`}
                    className="flex items-center gap-3 rounded-xl border bg-surface p-3 transition hover:border-zinc-300 hover:shadow-sm"
                  >
                    <ProviderLogo
                      slug={provider.slug}
                      displayName={providerDisplayName(provider)}
                      size={28}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{modelDisplayName(m)}</div>
                      <div className="truncate text-xs text-muted">
                        {formatTokens(m.limits?.max_tokens)} ctx ·{" "}
                        {formatCostPerMillion(m.cost?.input_per_1k)} in
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {tab === "activity" && (
        <Suspense fallback={<div className="py-12 text-center text-sm text-muted">Loading charts…</div>}>
          <ModelActivity provider={provider.slug} slug={model.slug} />
        </Suspense>
      )}

      {tab === "api" && (
        <Section title="Usage example">
          <UsageExample provider={provider} model={model} />
        </Section>
      )}
    </div>
  );
}

function Tabs({ current, onChange }: { current: Tab; onChange: (t: Tab) => void }) {
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "activity", label: "Activity" },
    { key: "api", label: "API" },
  ];
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
            current === t.key
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-muted hover:text-zinc-900"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function sharesCapability(a: CatalogModel, b: CatalogModel) {
  const ac = new Set(a.capabilities || []);
  return (b.capabilities || []).some((c) => ac.has(c));
}

function Breadcrumb({ provider, model }: { provider: CatalogProvider; model: CatalogModel }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      <Link to="/" className="text-muted hover:text-zinc-900">
        Models
      </Link>
      <ChevronRight />
      <Link to={`/${provider.slug}`} className="text-muted hover:text-zinc-900">
        {providerDisplayName(provider)}
      </Link>
      <ChevronRight />
      <span className="truncate font-medium">{modelDisplayName(model)}</span>
    </nav>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-3 rounded-xl border bg-surface p-5 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "stable") return <Badge tone="success">stable</Badge>;
  if (status === "deprecated") return <Badge tone="warning">{status}</Badge>;
  return <Badge>{status}</Badge>;
}

function PricingTable({ model }: { model: CatalogModel }) {
  const c = model.cost;
  if (!c) return <Empty>No pricing data available.</Empty>;
  const rows: Array<[string, number | undefined, string]> = [
    ["Input", c.input_per_1k, "per 1M tokens"],
    ["Output", c.output_per_1k, "per 1M tokens"],
    ["Cache read", c.cache_read_per_1k, "per 1M tokens"],
    ["Cache write", c.cache_write_per_1k, "per 1M tokens"],
  ];
  if (c.per_image) rows.push(["Per image", c.per_image, "USD"]);
  if (c.per_minute) rows.push(["Per minute", c.per_minute, "USD"]);
  const visible = rows.filter(([, v]) => v != null);
  if (visible.length === 0) return <Empty>No pricing data available.</Empty>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wider text-muted">
          <th className="py-2 font-medium">Item</th>
          <th className="py-2 font-medium">Price</th>
          <th className="py-2 font-medium">Unit</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {visible.map(([label, value, unit]) => (
          <tr key={label}>
            <td className="py-2">{label}</td>
            <td className="py-2 font-medium tabular-nums">
              {label.startsWith("Per ") ? `$${value}` : formatCostPerMillion(value)}
            </td>
            <td className="py-2 text-muted">{unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsageExample({ provider, model }: { provider: CatalogProvider; model: CatalogModel }) {
  const url = provider.base_url || "https://api.provider.com/v1";
  const code = `curl ${url}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $${(provider.auth?.env_var as string) || "API_KEY"}" \\
  -d '{
    "model": "${model.slug}",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`;
  return (
    <pre className="overflow-auto rounded-lg border bg-zinc-50 p-4 text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="flex-1">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted">{children}</div>;
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function notFound(what: string, provider?: CatalogProvider) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="text-lg font-medium">{what} not found</div>
      <Link
        to={provider ? `/${provider.slug}` : "/"}
        className="text-sm text-blue-600 hover:underline"
      >
        ← Back
      </Link>
    </div>
  );
}
