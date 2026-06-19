import { clsx } from "clsx";

type LoadingStateProps = {
  title?: string;
  rows?: number;
  className?: string;
};

export function LoadingState({ title = "Loading", rows = 5, className }: LoadingStateProps) {
  return (
    <div className={clsx("rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40", className)} aria-busy="true">
      <span className="sr-only">{title}</span>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
