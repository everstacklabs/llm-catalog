import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  count?: number;
}

export function FilterSection({ title, children, count }: Props) {
  return (
    <div className="flex flex-col gap-2 border-b py-4 first:pt-0 last:border-0">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {count != null && <span className="text-[11px] text-muted tabular-nums">{count}</span>}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
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
          className="size-3.5 rounded border-zinc-300"
        />
        <span className="truncate">{label}</span>
      </span>
      {count != null && (
        <span className="text-[11px] tabular-nums text-muted">{count}</span>
      )}
    </label>
  );
}
