import type { ReactNode } from "react";
import { clsx } from "clsx";

type DataToolbarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DataToolbar({ search, filters, actions, className }: DataToolbarProps) {
  return (
    <div className={clsx("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {search ? <div className="w-full sm:max-w-sm">{search}</div> : null}
        {filters}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
