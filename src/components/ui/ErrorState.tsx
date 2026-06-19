import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { clsx } from "clsx";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please retry the request.",
  retryLabel = "Retry",
  onRetry,
  action,
  className
}: ErrorStateProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
        className
      )}
      role="alert"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-red-700 dark:text-red-300">{description}</p> : null}
          </div>
        </div>
        {action ?? (onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900/40"
          >
            <RefreshCw size={16} aria-hidden="true" />
            {retryLabel}
          </button>
        ) : null)}
      </div>
    </div>
  );
}
