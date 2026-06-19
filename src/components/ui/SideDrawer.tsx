"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

type SideDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
};

const widthBySize = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl"
};

export function SideDrawer({ open, title, description, children, footer, onClose, size = "md" }: SideDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="side-drawer-title">
      <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} aria-label="Close drawer backdrop" />
      <aside
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 rtl:left-0 rtl:right-auto rtl:border-l-0 rtl:border-r",
          widthBySize[size]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="side-drawer-title" className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close drawer"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">{footer}</footer> : null}
      </aside>
    </div>
  );
}
