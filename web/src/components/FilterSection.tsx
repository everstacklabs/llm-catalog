import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

export function FilterSection({
  title,
  children,
  count,
  defaultOpen = true,
  collapsible = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-2 border-b py-4 first:pt-0 last:border-0">
      <button
        type="button"
        onClick={() => collapsible && setOpen(!open)}
        className={`flex items-center justify-between text-left ${
          collapsible ? "cursor-pointer hover:text-zinc-900" : "cursor-default"
        }`}
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </h3>
        <div className="flex items-center gap-1.5">
          {count != null && (
            <span className="text-[11px] text-muted tabular-nums">{count}</span>
          )}
          {collapsible && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
      {open && <div className="flex flex-col gap-1">{children}</div>}
    </div>
  );
}

interface CheckboxProps {
  label: string;
  count?: number;
  checked: boolean;
  onChange: (next: boolean) => void;
}

export function FilterCheckbox({ label, count, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-zinc-50">
      <span className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-3.5 rounded border-zinc-300 accent-zinc-900"
        />
        <span className="truncate capitalize">{label}</span>
      </span>
      {count != null && (
        <span className="text-[11px] tabular-nums text-muted">{count}</span>
      )}
    </label>
  );
}

interface RangeProps {
  label: string;
  steps: Array<{ value: number; label: string }>;
  value: number;
  onChange: (n: number) => void;
  direction?: "min" | "max";
}

export function FilterRange({ label, steps, value, onChange, direction = "min" }: RangeProps) {
  const max = steps.length - 1;
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.value === value),
  );
  const safeIdx = idx === -1 ? 0 : idx;
  const showLabel = steps[safeIdx]?.label ?? "Any";
  const isActive = safeIdx > 0;
  return (
    <div className="px-1.5 py-1 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span
          className={`font-medium tabular-nums ${isActive ? "text-zinc-900" : "text-muted"}`}
        >
          {direction === "min" ? "≥ " : "≤ "}
          {showLabel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={safeIdx}
        onChange={(e) => onChange(steps[Number(e.target.value)].value)}
        className="w-full accent-zinc-900"
      />
    </div>
  );
}
