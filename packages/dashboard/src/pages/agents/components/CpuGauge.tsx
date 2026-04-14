import { Cpu } from "lucide-react";

import { Card, CardContent } from "../../../components/ui/card.js";

export function CpuGauge({ value }: { value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">CPU</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value.toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-cyan-100">
            <Cpu className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/6">
          <div
            className="h-2 rounded-full bg-cyan-300"
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
