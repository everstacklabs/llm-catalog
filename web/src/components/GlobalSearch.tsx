import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  loadCatalog,
  modelDisplayName,
  providerDisplayName,
  type Catalog,
  type CatalogModel,
  type CatalogProvider,
} from "../lib/catalog";
import { ProviderLogo } from "./ProviderLogo";
import { formatCostPerMillion, formatTokens } from "../lib/format";

type ProviderHit = { kind: "provider"; provider: CatalogProvider };
type ModelHit = { kind: "model"; provider: CatalogProvider; model: CatalogModel };
type Hit = ProviderHit | ModelHit;

const MAX_PROVIDER_HITS = 6;
const MAX_MODEL_HITS = 12;

interface Props {
  variant?: "header" | "inline";
}

export function GlobalSearch({ variant = "header" }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCatalog().then(setCatalog);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => setActive(0), [query]);

  const hits = useMemo<{ providers: ProviderHit[]; models: ModelHit[]; flat: Hit[] }>(() => {
    if (!catalog) return { providers: [], models: [], flat: [] };
    const q = query.trim().toLowerCase();

    let providers: ProviderHit[] = [];
    let models: ModelHit[] = [];

    if (q) {
      providers = catalog.providers
        .filter((p) => `${p.slug} ${providerDisplayName(p)}`.toLowerCase().includes(q))
        .slice(0, MAX_PROVIDER_HITS)
        .map((p) => ({ kind: "provider", provider: p }));

      for (const p of catalog.providers) {
        for (const m of p.models) {
          const hay =
            `${m.slug} ${m.display_name || ""} ${m.name || ""} ${m.family || ""}`.toLowerCase();
          if (hay.includes(q)) models.push({ kind: "model", provider: p, model: m });
          if (models.length >= MAX_MODEL_HITS * 2) break;
        }
        if (models.length >= MAX_MODEL_HITS * 2) break;
      }
      models = models
        .sort((a, b) => {
          const aExact = (a.model.slug.toLowerCase() === q ? -1 : 0) + (a.model.slug.toLowerCase().startsWith(q) ? -0.5 : 0);
          const bExact = (b.model.slug.toLowerCase() === q ? -1 : 0) + (b.model.slug.toLowerCase().startsWith(q) ? -0.5 : 0);
          return aExact - bExact;
        })
        .slice(0, MAX_MODEL_HITS);
    } else {
      providers = catalog.providers
        .slice()
        .sort((a, b) => b.models.length - a.models.length)
        .slice(0, MAX_PROVIDER_HITS)
        .map((p) => ({ kind: "provider", provider: p }));
      const popular = catalog.providers
        .flatMap((p) => p.models.map((m) => ({ p, m })))
        .filter(({ m }) => (m.cost?.input_per_1k ?? Infinity) < 10)
        .slice(0, MAX_MODEL_HITS);
      models = popular.map(({ p, m }) => ({ kind: "model", provider: p, model: m }));
    }

    return { providers, models, flat: [...providers, ...models] };
  }, [catalog, query]);

  function navigateTo(hit: Hit) {
    if (hit.kind === "provider") navigate(`/${hit.provider.slug}`);
    else navigate(`/${hit.provider.slug}/${hit.model.slug}`);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits.flat[active];
      if (hit) navigateTo(hit);
    }
  }

  const isHeader = variant === "header";

  return (
    <div ref={rootRef} className={`relative ${isHeader ? "w-full max-w-md" : "w-full"}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={isHeader ? "Search models or providers…" : "Search 377 models, providers, families…"}
          className={`w-full rounded-lg border bg-surface pl-9 pr-14 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
            isHeader ? "py-1.5" : "py-2.5"
          }`}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon />
        </span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          ⌘K
        </kbd>
      </div>

      {open && catalog && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border bg-surface shadow-xl">
          {hits.flat.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No matches for <span className="font-mono">{query}</span>
            </div>
          ) : (
            <>
              {hits.providers.length > 0 && (
                <Group label="Providers">
                  {hits.providers.map((hit, i) => (
                    <ProviderRow
                      key={hit.provider.slug}
                      hit={hit}
                      active={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => navigateTo(hit)}
                    />
                  ))}
                </Group>
              )}
              {hits.models.length > 0 && (
                <Group label={query ? "Models" : "Popular models"}>
                  {hits.models.map((hit, i) => {
                    const idx = hits.providers.length + i;
                    return (
                      <ModelRow
                        key={`${hit.provider.slug}/${hit.model.slug}`}
                        hit={hit}
                        active={active === idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => navigateTo(hit)}
                      />
                    );
                  })}
                </Group>
              )}
              <FooterHints />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-0">
      <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function ProviderRow({
  hit,
  active,
  onClick,
  onMouseEnter,
}: {
  hit: ProviderHit;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const p = hit.provider;
  return (
    <Link
      to={`/${p.slug}`}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseEnter={onMouseEnter}
      className={`mx-1.5 flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
        active ? "bg-zinc-100" : ""
      }`}
    >
      <ProviderLogo slug={p.slug} displayName={providerDisplayName(p)} size={26} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{providerDisplayName(p)}</div>
        <div className="truncate text-xs text-muted">{p.base_url || `${p.models.length} models`}</div>
      </div>
      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
        {p.models.length}
      </span>
    </Link>
  );
}

function ModelRow({
  hit,
  active,
  onClick,
  onMouseEnter,
}: {
  hit: ModelHit;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const { provider: p, model: m } = hit;
  return (
    <Link
      to={`/${p.slug}/${m.slug}`}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseEnter={onMouseEnter}
      className={`mx-1.5 flex items-center gap-3 rounded-md px-2 py-2 text-sm ${
        active ? "bg-zinc-100" : ""
      }`}
    >
      <ProviderLogo slug={p.slug} displayName={providerDisplayName(p)} size={24} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{modelDisplayName(m)}</div>
        <div className="truncate text-xs text-muted">
          {providerDisplayName(p)} · <span className="font-mono">{m.slug}</span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-[11px] tabular-nums text-muted sm:flex">
        {m.limits?.max_tokens != null && <span>{formatTokens(m.limits.max_tokens)} ctx</span>}
        {m.cost?.input_per_1k != null && <span>{formatCostPerMillion(m.cost.input_per_1k)}/M</span>}
      </div>
    </Link>
  );
}

function FooterHints() {
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-zinc-50/70 px-3 py-2 text-[10px] text-muted">
      <div className="flex items-center gap-3">
        <Hint k="↵" label="open" />
        <Hint k="↑↓" label="navigate" />
        <Hint k="esc" label="close" />
      </div>
      <div>⌘K to focus anywhere</div>
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border bg-surface px-1 py-px font-mono text-[10px]">{k}</kbd>
      <span>{label}</span>
    </span>
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
