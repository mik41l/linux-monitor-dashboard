import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/utils.js";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger";
  children: ReactNode;
}

export function Button({
  className,
  children,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "default" && "border-cyan-300/30 bg-cyan-300/12 text-cyan-100 hover:bg-cyan-300/18",
        variant === "outline" && "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
        variant === "ghost" && "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.05]",
        variant === "danger" && "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/18",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
