import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  findProvider,
  loadCatalog,
  providerDisplayName,
  type Catalog,
  type CatalogProvider,
} from "../lib/catalog";
import { ProviderLogo } from "../components/ProviderLogo";
import { Badge } from "../components/Badge";
import { ModelCard } from "../components/ModelCard";

export function ProviderPage() {
  const { provider: providerSlug = "" } = useParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState<"models" | "config" | "templates">("models");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog().then(setCatalog);
  }, []);

  const provider = useMemo(
    () => (catalog ? findProvider(catalog, providerSlug) : undefined),
    [catalog, providerSlug],
  );

  const filteredModels = useMemo(() => {
    if (!provider) return [];
    let models = provider.models;
    if (category && provider.categories?.[category]) {
      const allowed = new Set(provider.categories[category]);
      models = models.filter((m) => allowed.has(m.slug) || allowed.has(m.name || ""));
    }
    if (search) {
      const q = search.toLowerCase();
      models = models.filter((m) =>
        `${m.slug} ${m.display_name || ""} ${m.family || ""}`.toLowerCase().includes(q),
      );
    }
    return models;
  }, [provider, category, search]);

  if (!catalog) return <div className="text-sm text-muted">Loading…</div>;
  if (!provider) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="text-lg font-medium">Provider not found</div>
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to all models
        </Link>
      </div>
    );
  }

  const categoryEntries = Object.entries(provider.categories || {});

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb provider={provider} />

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <ProviderLogo slug={provider.slug} displayName={providerDisplayName(provider)} size={64} />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {providerDisplayName(provider)}
            </h1>
            {provider.provider_type && (
              <Badge tone={provider.provider_type === "static" ? "neutral" : "accent"}>
                {provider.provider_type}
              </Badge>
            )}
          </div>
          {provider.base_url && (
            <code className="w-fit rounded bg-zinc-100 px-2 py-0.5 text-xs">
              {provider.base_url}
            </code>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Stat label="Models" value={provider.models.length} />
            <Stat label="Categories" value={categoryEntries.length} />
            {provider.api_version && <Stat label="API version" value={provider.api_version} />}
            {provider.supports_model_discovery != null && (
              <Stat
                label="Discovery"
                value={provider.supports_model_discovery ? "supported" : "static"}
              />
            )}
          </div>
        </div>
      </header>

      <Tabs current={tab} onChange={setTab} />

      {tab === "models" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder={`Search ${provider.models.length} models…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <div className="text-sm text-muted tabular-nums">
              {filteredModels.length} {filteredModels.length === 1 ? "model" : "models"}
            </div>
          </div>

          {categoryEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <CategoryChip
                label="All"
                count={provider.models.length}
                active={category === null}
                onClick={() => setCategory(null)}
              />
              {categoryEntries.map(([key, items]) => (
                <CategoryChip
                  key={key}
                  label={key.replace(/_/g, " ")}
                  count={items.length}
                  active={category === key}
                  onClick={() => setCategory(category === key ? null : key)}
                />
              ))}
            </div>
          )}

          {filteredModels.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-surface p-12 text-center text-sm text-muted">
              No models matched.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredModels.map((m) => (
                <ModelCard
                  key={m.slug}
                  model={m}
                  providerDisplayName={providerDisplayName(provider)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "config" && <ConfigPanel provider={provider} />}
      {tab === "templates" && <TemplatesPanel provider={provider} />}
    </div>
  );
}

function Breadcrumb({ provider }: { provider: CatalogProvider }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link to="/" className="text-muted hover:text-zinc-900">
        Models
      </Link>
      <ChevronRight />
      <span className="font-medium">{providerDisplayName(provider)}</span>
    </nav>
  );
}

function Tabs({
  current,
  onChange,
}: {
  current: "models" | "config" | "templates";
  onChange: (t: "models" | "config" | "templates") => void;
}) {
  const tabs: Array<{ key: typeof current; label: string }> = [
    { key: "models", label: "Models" },
    { key: "config", label: "Configuration" },
    { key: "templates", label: "Templates" },
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

function ConfigPanel({ provider }: { provider: CatalogProvider }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {provider.auth && (
        <DataCard title="Authentication" data={provider.auth as Record<string, unknown>} />
      )}
      {provider.rate_limits && (
        <DataCard title="Rate limits" data={provider.rate_limits as Record<string, unknown>} />
      )}
      {provider.capabilities && (
        <DataCard
          title="Provider capabilities"
          data={provider.capabilities as Record<string, unknown>}
        />
      )}
      {provider.defaults && (
        <DataCard title="Defaults" data={provider.defaults as Record<string, unknown>} />
      )}
      {provider.model_families && (
        <DataCard
          title="Model families"
          data={provider.model_families as Record<string, unknown>}
          className="md:col-span-2"
        />
      )}
    </div>
  );
}

function TemplatesPanel({ provider }: { provider: CatalogProvider }) {
  const entries = Object.entries(provider.templates || {});
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-surface p-12 text-center text-sm text-muted">
        No templates defined for this provider.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {entries.map(([key, value]) => {
        const v = value as { name?: string; description?: string };
        return (
          <div key={key} className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{v.name || key}</h3>
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{key}</code>
            </div>
            {v.description && <p className="text-sm text-muted">{v.description}</p>}
            <pre className="overflow-auto rounded-md bg-zinc-50 p-3 text-xs">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function DataCard({
  title,
  data,
  className = "",
}: {
  title: string;
  data: Record<string, unknown>;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-surface ${className}`}>
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      <dl className="divide-y text-sm">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-start gap-4 px-4 py-2">
            <dt className="w-1/3 shrink-0 text-muted">{k.replace(/_/g, " ")}</dt>
            <dd className="min-w-0 flex-1 break-words font-mono text-xs">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "bg-surface text-zinc-700 hover:border-zinc-300"
      }`}
    >
      <span className="capitalize">{label}</span>
      <span className={`tabular-nums ${active ? "text-zinc-300" : "text-muted"}`}>{count}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-muted">{label}</span>{" "}
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
