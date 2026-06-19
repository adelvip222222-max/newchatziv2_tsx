"use client";

import type { InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onClear?: () => void;
};

export function SearchInput({ className, value, onClear, placeholder = "Search", ...props }: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={clsx("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3" aria-hidden="true" />
      <input
        {...props}
        value={value}
        type="search"
        placeholder={placeholder}
        className="field h-10 pl-9 pr-9 rtl:pl-9 rtl:pr-9"
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 rtl:left-2 rtl:right-auto dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
