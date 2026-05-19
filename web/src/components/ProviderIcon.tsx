import { providerColor, providerInitials } from "../lib/format";

interface Props {
  slug: string;
  displayName?: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ slug, displayName, size = 32, className = "" }: Props) {
  const color = providerColor(slug);
  const initials = providerInitials(slug, displayName);
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.max(10, size * 0.4),
        letterSpacing: "-0.02em",
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
