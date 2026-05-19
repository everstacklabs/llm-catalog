import { lazy, Suspense, type ComponentType, type SVGProps } from "react";
import { providerColor, providerInitials } from "../lib/format";

// Each lobehub default export is a Mono icon component with brand metadata
// attached as static properties.
type LobeIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }> & {
  colorPrimary: string;
  title: string;
};

// Mapping from our catalog provider slug -> lazy lobehub default export.
// Keeps the rest of the app from blowing up if a provider is unmapped.
const REGISTRY: Record<string, () => Promise<{ default: LobeIcon }>> = {
  anthropic: () => import("@lobehub/icons/es/Anthropic"),
  "aws-bedrock": () => import("@lobehub/icons/es/Bedrock"),
  "azure-openai": () => import("@lobehub/icons/es/Azure"),
  cerebras: () => import("@lobehub/icons/es/Cerebras"),
  cohere: () => import("@lobehub/icons/es/Cohere"),
  deepseek: () => import("@lobehub/icons/es/DeepSeek"),
  fireworks: () => import("@lobehub/icons/es/Fireworks"),
  google: () => import("@lobehub/icons/es/Google"),
  groq: () => import("@lobehub/icons/es/Groq"),
  huggingface: () => import("@lobehub/icons/es/HuggingFace"),
  minimax: () => import("@lobehub/icons/es/Minimax"),
  mistral: () => import("@lobehub/icons/es/Mistral"),
  moonshot: () => import("@lobehub/icons/es/Moonshot"),
  "nvidia-nim": () => import("@lobehub/icons/es/Nvidia"),
  ollama: () => import("@lobehub/icons/es/Ollama"),
  openai: () => import("@lobehub/icons/es/OpenAI"),
  openrouter: () => import("@lobehub/icons/es/OpenRouter"),
  perplexity: () => import("@lobehub/icons/es/Perplexity"),
  qwen: () => import("@lobehub/icons/es/Qwen"),
  together: () => import("@lobehub/icons/es/Together"),
  "vertex-ai": () => import("@lobehub/icons/es/VertexAI"),
  xai: () => import("@lobehub/icons/es/XAI"),
};

// Pre-build lazy components so React preserves identity across renders.
const COMPONENTS: Record<string, ComponentType<{ size: number; color: string }>> = {};
for (const [slug, loader] of Object.entries(REGISTRY)) {
  COMPONENTS[slug] = lazy(async () => {
    const mod = await loader();
    const Icon = mod.default;
    return {
      default: ({ size, color }: { size: number; color: string }) => (
        <Icon size={size} color={color} />
      ),
    };
  });
}

// Brand-color overrides where the lobehub primary isn't ideal as a square bg.
// (e.g. Anthropic primary is cream; OpenAI primary is pure black, etc.)
const BRAND_BG: Record<string, string> = {
  anthropic: "#F0EEE6",
  openai: "#000000",
  "aws-bedrock": "#FF9900",
  "azure-openai": "#0078D4",
  cerebras: "#1B1F23",
  cohere: "#39594D",
  deepseek: "#4D6BFE",
  fireworks: "#5019C5",
  google: "#FFFFFF",
  groq: "#F55036",
  huggingface: "#FFD21E",
  minimax: "#F23F5D",
  mistral: "#FA520F",
  moonshot: "#16191E",
  "nvidia-nim": "#76B900",
  ollama: "#0F172A",
  openrouter: "#6566F1",
  perplexity: "#22B8CD",
  qwen: "#615CED",
  together: "#0F6FFF",
  "vertex-ai": "#4285F4",
  xai: "#000000",
};

function readableForeground(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#FFFFFF";
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // Relative luminance per WCAG
  const lum =
    0.2126 * (r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4) +
    0.7152 * (g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4) +
    0.0722 * (b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4);
  return lum > 0.55 ? "#141413" : "#FFFFFF";
}

interface Props {
  slug: string;
  displayName?: string;
  size?: number;
  shape?: "square" | "circle";
  className?: string;
}

export function ProviderLogo({
  slug,
  displayName,
  size = 32,
  shape = "square",
  className = "",
}: Props) {
  const Lazy = COMPONENTS[slug];
  if (!Lazy) return <Fallback slug={slug} displayName={displayName} size={size} shape={shape} className={className} />;

  const bg = BRAND_BG[slug] ?? "#27272A";
  const fg = readableForeground(bg);
  const radius = shape === "circle" ? "9999px" : `${Math.max(4, size * 0.22)}px`;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size, background: bg, borderRadius: radius }}
      title={displayName || slug}
    >
      <Suspense fallback={null}>
        <Lazy size={Math.round(size * 0.6)} color={fg} />
      </Suspense>
    </div>
  );
}

function Fallback({ slug, displayName, size, shape, className }: Required<Omit<Props, "displayName">> & { displayName?: string }) {
  const bg = providerColor(slug);
  const initials = providerInitials(slug, displayName);
  const radius = shape === "circle" ? "9999px" : `${Math.max(4, size * 0.22)}px`;
  return (
    <div
      className={`flex shrink-0 items-center justify-center font-semibold text-white ring-1 ring-black/5 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: radius,
        fontSize: Math.max(10, size * 0.4),
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
