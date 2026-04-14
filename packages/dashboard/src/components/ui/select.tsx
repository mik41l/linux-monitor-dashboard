import type { SelectHTMLAttributes } from "react";

import { cn } from "../../lib/utils.js";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-full border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-300/30",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
