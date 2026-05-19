import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  loadCatalog,
  providerDisplayName,
  type Catalog,
  type CatalogModel,
  type CatalogProvider,
} from "../lib/catalog";
import { ModelCard } from "../components/ModelCard";
import { ProviderLogo } from "../components/ProviderLogo";
import { FilterSection, FilterCheckbox, FilterRange } from "../components/FilterSection";
import { formatCostPerMillion, formatTokens, titleCase } from "../lib/format";

interface Filters {
  inputModalities: Set<string>;
  features: Set<string>;
  series: Set<string>;
  providers: Set<string>;
  status: Set<string>;
  minContext: number;
  maxInputPrice: number;
  search: string;
}

const CONTEXT_STEPS = [
  { value: 0, label: "Any" },
  { value: 4_000, label: "4K" },
  { value: 8_000, label: "8K" },
  { value: 16_000, label: "16K" },
  { value: 32_000, label: "32K" },
  { value: 64_000, label: "64K" },
  { value: 128_000, label: "128K" },
  { value: 200_000, label: "200K" },
  { value: 1_000_000, label: "1M" },
];

const PRICE_STEPS = [
  { value: Infinity, label: "Any" },
  { value: 50, label: "$50" },
  { value: 20, label: "$20" },
  { value: 10, label: "$10" },
  { value: 5, label: "$5" },
  { value: 2, label: "$2" },
  { value: 1, label: "$1" },
  { value: 0.5, label: "$0.50" },
  { value: 0.1, label: "$0.10" },
  { value: 0, label: "Free" },
];

// Capabilities that we surface as "Supported features".
// Anything not in this list still works but is treated as a feature too.
const FEATURE_ORDER = [
  "chat",
  "function_calling",
  "vision",
  "reasoning",
  "embeddings",
  "extended_thinking",
  "computer_use",
  "coding",
  "long_context",
  "audio",
  "streaming",
  "fine_tuning",
  "prompt_caching",
  "structured_output",
  "json_mode",
];

function emptyFilters(): Filters {
  return {
    inputModalities: new Set(),
    features: new Set(),
    series: new Set(),
    providers: new Set(),
    status: new Set(),
    minContext: 0,
    maxInputPrice: Infinity,
    search: "",
  };
}

function familyOf(m: CatalogModel): string {
  if (m.family && m.family !== "other") return m.family;
  // Heuristic fallback from slug for "other" families
  const s = m.slug.toLowerCase();
  if (s.startsWith("gpt-5") || s.startsWith("o1") || s.startsWith("o3") || s.startsWith("o4"))
    return "gpt-5";
  if (s.startsWith("gpt-4")) return "gpt-4";
  if (s.startsWith("gpt-3")) return "gpt-3.5";
  if (s.startsWith("claude")) return "claude";
  if (s.startsWith("gemini")) return "gemini";
  if (s.startsWith("llama")) return "llama";
  if (s.startsWith("mistral") || s.startsWith("mixtral")) return "mistral";
  if (s.startsWith("qwen")) return "qwen";
  if (s.startsWith("deepseek")) return "deepseek";
  return m.family || "other";
}

function modelMatches(m: CatalogModel, f: Filters): boolean {
  if (f.providers.size && !f.providers.has(m.provider)) return false;
  if (f.features.size) {
    const caps = new Set(m.capabilities || []);
    for (const c of f.features) if (!caps.has(c)) return false;
  }
  if (f.inputModalities.size) {
    const mods = new Set(m.modalities?.input || []);
    for (const x of f.inputModalities) if (!mods.has(x)) return false;
  }
  if (f.series.size && !f.series.has(familyOf(m))) return false;
  if (f.status.size && !f.status.has(m.status || "stable")) return false;
  if (f.minContext > 0) {
    const ctx = m.limits?.max_tokens ?? m.limits?.max_input_tokens ?? 0;
    if (ctx < f.minContext) return false;
  }
  if (f.maxInputPrice !== Infinity) {
    const price = m.cost?.input_per_1k != null ? m.cost.input_per_1k * 1000 : null;
    if (price == null || price > f.maxInputPrice) return false;
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${m.slug} ${m.display_name || ""} ${m.name || ""} ${m.family || ""} ${m.provider}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function countBy<T, K extends string>(
  items: T[],
  key: (x: T) => K | K[] | undefined,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const it of items) {
    const k = key(it);
    if (k == null) continue;
    const keys = Array.isArray(k) ? k : [k];
    for (const x of keys) out.set(x, (out.get(x) || 0) + 1);
  }
  return out;
}

export function ModelsIndex() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);
  const [showAllProviders, setShowAllProviders] = useState(false);

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((e) => setErr(String(e)));
  }, []);

  const allModels = useMemo<CatalogModel[]>(
    () => (catalog ? catalog.providers.flatMap((p) => p.models) : []),
    [catalog],
  );

  const providerMap = useMemo<Map<string, CatalogProvider>>(() => {
    const map = new Map<string, CatalogProvider>();
    catalog?.providers.forEach((p) => map.set(p.slug, p));
    return map;
  }, [catalog]);

  const filtered = useMemo(
    () => allModels.filter((m) => modelMatches(m, filters)),
    [allModels, filters],
  );

  const facets = useMemo(() => {
    if (!catalog) return null;
    return {
      inputModalities: countBy(allModels, (m) => (m.modalities?.input || []) as string[]),
      features: countBy(allModels, (m) => m.capabilities as string[] | undefined),
      series: countBy(allModels, (m) => familyOf(m)),
      providers: countBy(allModels, (m) => m.provider),
      status: countBy(allModels, (m) => (m.status || "stable") as string),
    };
  }, [catalog, allModels]);

  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (!catalog || !facets) return <LoadingState />;

  function toggle(key: keyof Filters, value: string) {
    setFilters((f) => {
      const next = { ...f, [key]: new Set(f[key] as Set<string>) };
      const s = next[key] as Set<string>;
      if (s.has(value)) s.delete(value);
      else s.add(value);
      return next;
    });
  }

  const activeCount =
    filters.inputModalities.size +
    filters.features.size +
    filters.series.size +
    filters.providers.size +
    filters.status.size +
    (filters.minContext > 0 ? 1 : 0) +
    (filters.maxInputPrice !== Infinity ? 1 : 0) +
    (filters.search ? 1 : 0);

  // Order features by curated list first, then by remaining facet count.
  const orderedFeatures = (() => {
    const seen = new Set<string>();
    const out: Array<[string, number]> = [];
    for (const key of FEATURE_ORDER) {
      const c = facets.features.get(key);
      if (c != null) {
        out.push([key, c]);
        seen.add(key);
      }
    }
    Array.from(facets.features.entries())
      .filter(([k]) => !seen.has(k))
      .sort((a, b) => b[1] - a[1])
      .forEach((entry) => out.push(entry));
    return out;
  })();

  const orderedSeries = Array.from(facets.series.entries()).sort((a, b) => b[1] - a[1]);
  const orderedProviders = Array.from(facets.providers.entries()).sort((a, b) => b[1] - a[1]);

  const featuresVisible = showAllFeatures ? orderedFeatures : orderedFeatures.slice(0, 8);
  const seriesVisible = showAllSeries ? orderedSeries : orderedSeries.slice(0, 8);
  const providersVisible = showAllProviders ? orderedProviders : orderedProviders.slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <Hero catalog={catalog} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">Filters</h2>
              {activeCount > 0 && (
                <button
                  onClick={() => setFilters(emptyFilters())}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear all ({activeCount})
                </button>
              )}
            </div>

            <FilterSection title="Input modalities">
              {Array.from(facets.inputModalities.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <FilterCheckbox
                    key={key}
                    label={key}
                    count={count}
                    checked={filters.inputModalities.has(key)}
                    onChange={() => toggle("inputModalities", key)}
                  />
                ))}
            </FilterSection>

            <FilterSection title="Context length">
              <FilterRange
                label="Minimum"
                steps={CONTEXT_STEPS}
                value={filters.minContext}
                direction="min"
                onChange={(n) => setFilters((f) => ({ ...f, minContext: n }))}
              />
            </FilterSection>

            <FilterSection title="Input price">
              <FilterRange
                label="Per 1M tokens"
                steps={PRICE_STEPS}
                value={filters.maxInputPrice}
                direction="max"
                onChange={(n) => setFilters((f) => ({ ...f, maxInputPrice: n }))}
              />
            </FilterSection>

            <FilterSection title="Supported features">
              {featuresVisible.map(([key, count]) => (
                <FilterCheckbox
                  key={key}
                  label={titleCase(key)}
                  count={count}
                  checked={filters.features.has(key)}
                  onChange={() => toggle("features", key)}
                />
              ))}
              {orderedFeatures.length > 8 && (
                <button
                  onClick={() => setShowAllFeatures((v) => !v)}
                  className="mt-1 px-1.5 py-1 text-left text-xs text-blue-600 hover:underline"
                >
                  {showAllFeatures
                    ? "Show less"
                    : `Show ${orderedFeatures.length - 8} more`}
                </button>
              )}
            </FilterSection>

            <FilterSection title="Series" defaultOpen={false}>
              {seriesVisible.map(([key, count]) => (
                <FilterCheckbox
                  key={key}
                  label={key}
                  count={count}
                  checked={filters.series.has(key)}
                  onChange={() => toggle("series", key)}
                />
              ))}
              {orderedSeries.length > 8 && (
                <button
                  onClick={() => setShowAllSeries((v) => !v)}
                  className="mt-1 px-1.5 py-1 text-left text-xs text-blue-600 hover:underline"
                >
                  {showAllSeries ? "Show less" : `Show ${orderedSeries.length - 8} more`}
                </button>
              )}
            </FilterSection>

            <FilterSection title="Provider" defaultOpen={false}>
              {providersVisible.map(([slug, count]) => {
                const p = providerMap.get(slug);
                return (
                  <FilterCheckbox
                    key={slug}
                    label={p ? providerDisplayName(p) : slug}
                    count={count}
                    checked={filters.providers.has(slug)}
                    onChange={() => toggle("providers", slug)}
                  />
                );
              })}
              {orderedProviders.length > 8 && (
                <button
                  onClick={() => setShowAllProviders((v) => !v)}
                  className="mt-1 px-1.5 py-1 text-left text-xs text-blue-600 hover:underline"
                >
                  {showAllProviders
                    ? "Show less"
                    : `Show ${orderedProviders.length - 8} more`}
                </button>
              )}
            </FilterSection>

            <FilterSection title="Status" defaultOpen={false}>
              {Array.from(facets.status.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <FilterCheckbox
                    key={key}
                    label={key}
                    count={count}
                    checked={filters.status.has(key)}
                    onChange={() => toggle("status", key)}
                  />
                ))}
            </FilterSection>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="search"
                placeholder="Search models, providers, families…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="w-full rounded-lg border bg-surface px-3.5 py-2 pl-9 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <SearchIcon />
              </span>
            </div>
            <div className="text-sm text-muted tabular-nums">
              {filtered.length} of {allModels.length} models
            </div>
          </div>

          <ActiveFilterChips
            filters={filters}
            providerMap={providerMap}
            onClear={() => setFilters(emptyFilters())}
            onRemove={(kind, key) => {
              setFilters((f) => {
                if (kind === "minContext") return { ...f, minContext: 0 };
                if (kind === "maxInputPrice") return { ...f, maxInputPrice: Infinity };
                if (kind === "search") return { ...f, search: "" };
                const next = { ...f, [kind]: new Set(f[kind] as Set<string>) };
                (next[kind] as Set<string>).delete(key as string);
                return next;
              });
            }}
          />

          <ProviderStrip catalog={catalog} />

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-surface p-12 text-center">
              <div className="text-sm text-muted">No models match your filters.</div>
              <button
                onClick={() => setFilters(emptyFilters())}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, 120).map((m) => {
                const p = providerMap.get(m.provider);
                return (
                  <ModelCard
                    key={`${m.provider}/${m.slug}`}
                    model={m}
                    providerDisplayName={p ? providerDisplayName(p) : m.provider}
                  />
                );
              })}
            </div>
          )}

          {filtered.length > 120 && (
            <div className="text-center text-sm text-muted">
              Showing first 120 of {filtered.length} matches. Refine filters to narrow further.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Hero({ catalog }: { catalog: Catalog }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-medium tracking-tight">Model Catalog</h1>
      <p className="max-w-2xl text-muted">
        Browse every model and provider configured in the catalog. Pricing, context windows,
        capabilities, and modalities. Synced from the source-of-truth YAML.
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Stat label="Providers" value={catalog.total_providers} />
        <Stat label="Models" value={catalog.total_models} />
        <Stat label="Catalog version" value={catalog.version} mono />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-muted">{label}</span>{" "}
      <span className={`font-medium tabular-nums ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function ProviderStrip({ catalog }: { catalog: Catalog }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {catalog.providers.map((p) => (
        <Link
          key={p.slug}
          to={`/${p.slug}`}
          className="flex shrink-0 items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-sm transition hover:border-zinc-300 hover:shadow-sm"
        >
          <ProviderLogo slug={p.slug} displayName={providerDisplayName(p)} size={20} />
          <span>{providerDisplayName(p)}</span>
          <span className="text-xs tabular-nums text-muted">{p.models.length}</span>
        </Link>
      ))}
    </div>
  );
}

function ActiveFilterChips({
  filters,
  providerMap,
  onClear,
  onRemove,
}: {
  filters: Filters;
  providerMap: Map<string, CatalogProvider>;
  onClear: () => void;
  onRemove: (kind: keyof Filters, key?: string) => void;
}) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  filters.inputModalities.forEach((m) =>
    chips.push({
      key: `mod:${m}`,
      label: `input: ${m}`,
      onRemove: () => onRemove("inputModalities", m),
    }),
  );
  filters.features.forEach((c) =>
    chips.push({
      key: `feat:${c}`,
      label: titleCase(c),
      onRemove: () => onRemove("features", c),
    }),
  );
  filters.series.forEach((s) =>
    chips.push({
      key: `ser:${s}`,
      label: `series: ${s}`,
      onRemove: () => onRemove("series", s),
    }),
  );
  filters.providers.forEach((p) => {
    const prov = providerMap.get(p);
    chips.push({
      key: `prov:${p}`,
      label: prov ? providerDisplayName(prov) : p,
      onRemove: () => onRemove("providers", p),
    });
  });
  filters.status.forEach((s) =>
    chips.push({ key: `st:${s}`, label: s, onRemove: () => onRemove("status", s) }),
  );
  if (filters.minContext > 0) {
    chips.push({
      key: "ctx",
      label: `context ≥ ${formatTokens(filters.minContext)}`,
      onRemove: () => onRemove("minContext"),
    });
  }
  if (filters.maxInputPrice !== Infinity) {
    chips.push({
      key: "price",
      label: `input ≤ ${formatCostPerMillion(filters.maxInputPrice / 1000)} /M`,
      onRemove: () => onRemove("maxInputPrice"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.onRemove}
          className="group flex items-center gap-1 rounded-full border bg-zinc-50 py-1 pl-2.5 pr-1.5 text-xs font-medium hover:border-zinc-400"
        >
          <span className="lowercase">{c.label}</span>
          <span className="grid size-3.5 place-items-center rounded-full text-muted group-hover:bg-zinc-200 group-hover:text-zinc-900">
            ×
          </span>
        </button>
      ))}
      <button
        onClick={onClear}
        className="ml-1 text-xs text-blue-600 hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
      <div className="h-4 w-96 animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border bg-zinc-50" />
        ))}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" strokeLinecap="round" />
    </svg>
  );
}
