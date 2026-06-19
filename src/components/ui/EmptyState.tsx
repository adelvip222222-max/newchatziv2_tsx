import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { clsx } from "clsx";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon ?? <Inbox size={22} aria-hidden="true" />}
      </div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
