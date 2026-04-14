import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils.js";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "muted";
  children: ReactNode;
}

export function Badge({
  className,
  children,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em]",
        variant === "default" && "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
        variant === "success" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
        variant === "warning" && "border-amber-300/30 bg-amber-300/10 text-amber-100",
        variant === "destructive" && "border-rose-300/30 bg-rose-300/10 text-rose-100",
        variant === "muted" && "border-white/10 bg-white/[0.03] text-slate-300",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
