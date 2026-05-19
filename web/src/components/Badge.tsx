import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
  accent: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
};

export function Badge({ children, tone = "neutral", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
