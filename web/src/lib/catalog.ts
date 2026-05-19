export type Modality = "text" | "image" | "audio" | "video" | "pdf" | string;

export interface ModelCost {
  input_per_1k?: number;
  output_per_1k?: number;
  cache_read_per_1k?: number;
  cache_write_per_1k?: number;
  per_image?: number;
  per_minute?: number;
}

export interface ModelLimits {
  max_tokens?: number;
  max_completion_tokens?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
}

export interface CatalogModel {
  slug: string;
  provider: string;
  name?: string;
  display_name?: string;
  family?: string;
  status?: string;
  description?: string;
  cost?: ModelCost;
  limits?: ModelLimits;
  capabilities?: string[];
  modalities?: {
    input?: Modality[];
    output?: Modality[];
  };
  knowledge_cutoff?: string;
  release_date?: string;
  [key: string]: unknown;
}

export interface CatalogProvider {
  slug: string;
  name?: string;
  display_name?: string;
  base_url?: string;
  api_version?: string;
  provider_type?: string;
  supports_model_discovery?: boolean;
  auth?: Record<string, unknown>;
  rate_limits?: Record<string, unknown>;
  capabilities?: Record<string, boolean>;
  model_families?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  categories?: Record<string, string[]>;
  templates?: Record<string, unknown>;
  models: CatalogModel[];
  [key: string]: unknown;
}

export interface Catalog {
  version: string;
  generated_at: string;
  total_providers: number;
  total_models: number;
  providers: CatalogProvider[];
}

let cache: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}catalog.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load catalog: ${r.status}`);
      return r.json() as Promise<Catalog>;
    });
  }
  return cache;
}

export function providerDisplayName(p: Pick<CatalogProvider, "slug" | "display_name" | "name">) {
  return p.display_name || p.name || p.slug;
}

export function modelDisplayName(m: Pick<CatalogModel, "slug" | "display_name" | "name">) {
  return m.display_name || m.name || m.slug;
}

export function findProvider(catalog: Catalog, slug: string) {
  return catalog.providers.find((p) => p.slug === slug);
}

export function findModel(provider: CatalogProvider, slug: string) {
  return provider.models.find((m) => m.slug === slug);
}

export function allCapabilities(catalog: Catalog): string[] {
  const set = new Set<string>();
  for (const p of catalog.providers)
    for (const m of p.models) for (const c of m.capabilities || []) set.add(c);
  return Array.from(set).sort();
}

export function allModalities(catalog: Catalog): string[] {
  const set = new Set<string>();
  for (const p of catalog.providers)
    for (const m of p.models) {
      for (const x of m.modalities?.input || []) set.add(x);
      for (const x of m.modalities?.output || []) set.add(x);
    }
  return Array.from(set).sort();
}
