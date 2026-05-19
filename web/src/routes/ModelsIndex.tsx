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
import { FilterSection, FilterCheckbox } from "../components/FilterSection";

interface Filters {
  providers: Set<string>;
  capabilities: Set<string>;
  modalities: Set<string>;
  status: Set<string>;
  search: string;
}

function emptyFilters(): Filters {
  return {
    providers: new Set(),
    capabilities: new Set(),
    modalities: new Set(),
    status: new Set(),
    search: "",
  };
}

function modelMatches(m: CatalogModel, f: Filters): boolean {
  if (f.providers.size && !f.providers.has(m.provider)) return false;
  if (f.capabilities.size) {
    const caps = new Set(m.capabilities || []);
    for (const c of f.capabilities) if (!caps.has(c)) return false;
  }
  if (f.modalities.size) {
    const mods = new Set([...(m.modalities?.input || []), ...(m.modalities?.output || [])]);
    for (const x of f.modalities) if (!mods.has(x)) return false;
  }
  if (f.status.size && !f.status.has(m.status || "stable")) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${m.slug} ${m.display_name || ""} ${m.name || ""} ${m.family || ""} ${m.provider}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function countBy<T, K extends string>(items: T[], key: (x: T) => K | K[] | undefined): Map<K, number> {
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

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((e) => setErr(String(e)));
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

  const filtered = useMemo(() => allModels.filter((m) => modelMatches(m, filters)), [allModels, filters]);

  const facets = useMemo(() => {
    if (!catalog) return null;
    return {
      providers: countBy(allModels, (m) => m.provider),
      capabilities: countBy(allModels, (m) => m.capabilities as string[] | undefined),
      modalities: countBy(allModels, (m) => {
        const mods = new Set([
          ...(m.modalities?.input || []),
          ...(m.modalities?.output || []),
        ]);
        return Array.from(mods) as string[];
      }),
      status: countBy(allModels, (m) => (m.status || "stable") as string),
    };
  }, [catalog, allModels]);

  if (err) return <div className="text-red-600">Error: {err}</div>;
  if (!catalog || !facets) return <LoadingState />;

  function toggle(set: keyof Filters, key: string) {
    setFilters((f) => {
      const next = { ...f, [set]: new Set(f[set] as Set<string>) };
      const s = next[set] as Set<string>;
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return next;
    });
  }

  const activeCount =
    filters.providers.size +
    filters.capabilities.size +
    filters.modalities.size +
    filters.status.size +
    (filters.search ? 1 : 0);

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
                  Clear all
                </button>
              )}
            </div>

            <FilterSection title="Provider" count={facets.providers.size}>
              {Array.from(facets.providers.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([slug, count]) => {
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
            </FilterSection>

            <FilterSection title="Capability">
              {Array.from(facets.capabilities.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([key, count]) => (
                  <FilterCheckbox
                    key={key}
                    label={key.replace(/_/g, " ")}
                    count={count}
                    checked={filters.capabilities.has(key)}
                    onChange={() => toggle("capabilities", key)}
                  />
                ))}
            </FilterSection>

            <FilterSection title="Modality">
              {Array.from(facets.modalities.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => (
                  <FilterCheckbox
                    key={key}
                    label={key}
                    count={count}
                    checked={filters.modalities.has(key)}
                    onChange={() => toggle("modalities", key)}
                  />
                ))}
            </FilterSection>

            <FilterSection title="Status">
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

function Stat({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
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
