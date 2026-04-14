import type { ReactNode } from "react";

interface StatCardProps {
  eyebrow: string;
  title: string;
  value: string;
  icon: ReactNode;
  accent: string;
}

export function StatCard({ accent, eyebrow, icon, title, value }: StatCardProps) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-base font-medium text-white">{title}</h2>
          <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border px-3 py-3 ${accent}`}>{icon}</div>
      </div>
    </article>
  );
}

