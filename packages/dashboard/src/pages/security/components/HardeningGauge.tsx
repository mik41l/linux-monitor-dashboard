import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import type { HardeningReport } from "@monitor/shared";

import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";

function getVariant(status: HardeningReport["status"] | undefined) {
  if (status === "critical") {
    return "destructive";
  }

  if (status === "warning") {
    return "warning";
  }

  if (status === "ok") {
    return "success";
  }

  return "muted";
}

export function HardeningGauge({ report }: { report: HardeningReport | null }) {
  const score = report?.overallScore ?? 0;

  return (
    <Card>
      <CardContent className="grid gap-4 p-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Hardening score</p>
          <h3 className="mt-2 text-xl font-semibold text-white">System posture baseline</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                data={[{ name: "score", value: score, fill: score >= 80 ? "#34d399" : score >= 60 ? "#f59e0b" : "#fb7185" }]}
                endAngle={-270}
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
              >
                <PolarAngleAxis domain={[0, 100]} tick={false} type="number" />
                <RadialBar background cornerRadius={18} dataKey="value" />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-28 flex justify-center">
            <div className="rounded-full border border-white/10 bg-slate-950/70 px-5 py-3 text-center">
              <p className="text-3xl font-semibold text-white">{score}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">/ 100</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Current status</p>
              <p className="mt-1 text-sm text-slate-300">
                {report?.error ?? "Checks are normalized per category and averaged into a single score."}
              </p>
            </div>
            <Badge variant={getVariant(report?.status)}>{report?.status ?? "unavailable"}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(report?.categoryScores ?? {}).map(([category, value]) => (
              <div key={category} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">{category}</p>
                <p className="mt-2 text-lg font-medium text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
