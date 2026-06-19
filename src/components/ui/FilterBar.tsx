import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { clsx } from "clsx";

type FilterBarProps = {
  children: ReactNode;
  label?: string;
  actions?: ReactNode;
  className?: string;
};

export function FilterBar({ children, label = "Filters", actions, className }: FilterBarProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>{label}</span>
        </div>
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
