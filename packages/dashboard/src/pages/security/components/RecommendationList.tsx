import { Card, CardContent } from "../../../components/ui/card.js";

export function RecommendationList({ recommendations }: { recommendations: string[] }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Recommendations</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Next remediation steps</h3>
        </div>

        {recommendations.length === 0 ? (
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
            No immediate remediation items were produced from the latest audit set.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                {recommendation}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
