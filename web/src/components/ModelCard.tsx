import { Link } from "react-router-dom";
import type { CatalogModel } from "../lib/catalog";
import { modelDisplayName } from "../lib/catalog";
import { formatCostPerMillion, formatTokens } from "../lib/format";
import { ProviderLogo } from "./ProviderLogo";
import { Badge } from "./Badge";

interface Props {
  model: CatalogModel;
  providerDisplayName: string;
}

export function ModelCard({ model, providerDisplayName }: Props) {
  const ctx = model.limits?.max_tokens ?? model.limits?.max_input_tokens;
  const out = model.limits?.max_completion_tokens ?? model.limits?.max_output_tokens;
  const inputCost = model.cost?.input_per_1k;
  const outputCost = model.cost?.output_per_1k;
  const caps = (model.capabilities || []).slice(0, 3);
  const extraCaps = (model.capabilities || []).length - caps.length;

  return (
    <Link
      to={`/${model.provider}/${model.slug}`}
      className="group flex flex-col gap-3 rounded-xl border bg-surface p-4 transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <ProviderLogo slug={model.provider} displayName={providerDisplayName} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-zinc-900 group-hover:text-blue-700">
            {modelDisplayName(model)}
          </div>
          <div className="truncate text-xs text-muted">
            {providerDisplayName} · <span className="font-mono">{model.slug}</span>
          </div>
        </div>
        {model.status && model.status !== "stable" && (
          <Badge tone={model.status === "deprecated" ? "warning" : "neutral"}>
            {model.status}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {caps.map((c) => (
          <Badge key={c} tone="accent">
            {c.replace(/_/g, " ")}
          </Badge>
        ))}
        {extraCaps > 0 && <Badge>+{extraCaps}</Badge>}
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <div>
          <div className="text-muted">Context</div>
          <div className="font-medium tabular-nums">{formatTokens(ctx)}</div>
        </div>
        <div>
          <div className="text-muted">Input</div>
          <div className="font-medium tabular-nums">{formatCostPerMillion(inputCost)}</div>
        </div>
        <div>
          <div className="text-muted">Output</div>
          <div className="font-medium tabular-nums">{formatCostPerMillion(outputCost)}</div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {out ? `Max output ${formatTokens(out)} · ` : ""}USD / 1M tokens
      </div>
    </Link>
  );
}
