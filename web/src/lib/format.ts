export function formatTokens(n?: number): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

// Cost arrives as USD per 1K tokens. Most catalogs display per 1M tokens.
export function formatCostPerMillion(per1k?: number): string {
  if (per1k == null) return "-";
  const per1m = per1k * 1000;
  if (per1m >= 100) return `$${per1m.toFixed(0)}`;
  if (per1m >= 1) return `$${per1m.toFixed(2)}`;
  return `$${per1m.toFixed(per1m >= 0.1 ? 2 : 3)}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97757",
  google: "#4285f4",
  "vertex-ai": "#4285f4",
  mistral: "#ff7000",
  cohere: "#39bda7",
  "aws-bedrock": "#ff9900",
  "azure-openai": "#0078d4",
  groq: "#f55036",
  together: "#0f6fff",
  perplexity: "#1f5b6e",
  xai: "#000000",
  deepseek: "#4d6bfe",
  fireworks: "#ff5d27",
  openrouter: "#6366f1",
  huggingface: "#ffb000",
  ollama: "#0f172a",
  cerebras: "#f5a623",
  qwen: "#8b5cf6",
  moonshot: "#0ea5e9",
  minimax: "#ef4444",
  "nvidia-nim": "#76b900",
};

export function providerColor(slug: string): string {
  return PROVIDER_COLORS[slug] || "#64748b";
}

export function providerInitials(slug: string, displayName?: string): string {
  const source = displayName || slug;
  const words = source.split(/[\s\-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
