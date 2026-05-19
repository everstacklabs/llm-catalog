import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, right, children, className = "" }: Props) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border bg-surface p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className="min-h-[200px]">{children}</div>
    </div>
  );
}
