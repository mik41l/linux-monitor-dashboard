import { Activity, Clock3, Radio, Signal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { cn } from "../../lib/utils.js";

const MAX_STREAM_ITEMS = 80;

interface LiveFeedItem {
  id: string;
  type: string;
  receivedAt: string;
  agentId?: string;
  detail: string;
}

interface LiveMessageDetail {
  type: string;
  data?: unknown;
}

function getFrameLabel(type: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (type === "metric") return t("frameMetric");
  if (type === "event") return t("frameEvent");
  if (type === "alert") return t("frameAlert");
  if (type === "sshd-audit") return t("frameSshd");
  if (type === "port-scan") return t("framePortScan");
  if (type === "firewall-audit") return t("frameFirewall");
  if (type === "hardening-report") return t("frameHardening");
  if (type === "login-activity") return t("frameLogin");
  if (type === "summary") return t("frameSummary");
  return type;
}

function getFrameTone(type: string) {
  if (type === "alert") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  if (type === "event") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (type === "metric") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (type.includes("audit") || type.includes("scan") || type.includes("hardening")) {
    return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  }

  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringifyValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function extractAgentId(data: unknown) {
  const payload = asRecord(data);
  return stringifyValue(payload.agentId);
}

function extractDetail(type: string, data: unknown, fallback: string) {
  const payload = asRecord(data);

  if (type === "metric") {
    return stringifyValue(payload.metricType) ?? fallback;
  }

  if (type === "event") {
    return stringifyValue(payload.eventType) ?? stringifyValue(payload.severity) ?? fallback;
  }

  if (type === "alert") {
    return stringifyValue(payload.ruleName) ?? stringifyValue(payload.severity) ?? fallback;
  }

  if (type === "hardening-report") {
    const score = stringifyValue(payload.overallScore);
    return score ? `score ${score}` : fallback;
  }

  const status = stringifyValue(payload.status);
  const riskScore = stringifyValue(payload.riskScore);

  if (status && riskScore) {
    return `${status} / risk ${riskScore}`;
  }

  return status ?? fallback;
}

export function StreamPage() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<LiveFeedItem[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const detail = (event as CustomEvent<LiveMessageDetail>).detail;
      const type = detail.type;
      const agentId = extractAgentId(detail.data);

      setTotalFrames((current) => current + 1);
      setItems((current) => [
        {
          id: crypto.randomUUID(),
          type,
          detail: extractDetail(type, detail.data, getFrameLabel(type, t)),
          receivedAt: new Date().toISOString(),
          ...(agentId ? { agentId } : {})
        },
        ...current
      ].slice(0, MAX_STREAM_ITEMS));
    };

    window.addEventListener("monitor-ws", handleMessage);

    return () => {
      window.removeEventListener("monitor-ws", handleMessage);
    };
  }, [t]);

  const distribution = useMemo(() => {
    const counts = items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.type] = (accumulator[item.type] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).sort((left, right) => right[1] - left[1]);
  }, [items]);
  const latestItem = items[0];

  return (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("liveFeed")}</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{t("liveFeedReserved")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{t("liveFeedHint")}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[32rem]">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                <Radio className="h-3.5 w-3.5" />
                {t("liveFrames")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <Signal className="h-3.5 w-3.5" />
                {t("totalFrames")}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">{totalFrames}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                {t("lastFrame")}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-white">
                {latestItem ? formatTimestamp(latestItem.receivedAt, language) : "n/a"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("frameTypeDistribution")}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{t("recentFrameWindow")}</h3>
            </div>
            {distribution.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
                {t("noFramesYet")}
              </div>
            ) : (
              <div className="space-y-2">
                {distribution.map(([type, count]) => (
                  <div
                    className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                    key={type}
                  >
                    <span className="truncate text-sm text-slate-300">{getFrameLabel(type, t)}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", getFrameTone(type))}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("latestFrameLog")}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{t("liveFeed")}</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
                {t("recentFrameWindow")}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                {t("waitingForFrames")}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[9rem_10rem_1fr_11rem] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-500 max-lg:hidden">
                  <span>{t("type")}</span>
                  <span>{t("agent")}</span>
                  <span>{t("frameDetails")}</span>
                  <span className="text-right">{t("at")}</span>
                </div>
                <div className="max-h-[34rem] overflow-auto">
                  {items.map((item) => (
                    <div
                      className="grid gap-2 border-b border-white/5 bg-slate-950/30 px-4 py-2.5 text-sm last:border-b-0 hover:bg-white/[0.04] lg:grid-cols-[9rem_10rem_1fr_11rem] lg:items-center"
                      key={item.id}
                    >
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
                          getFrameTone(item.type)
                        )}
                      >
                        {getFrameLabel(item.type, t)}
                      </span>
                      <span className="truncate text-slate-300">{item.agentId ?? t("unknown")}</span>
                      <span className="truncate text-slate-400">{item.detail}</span>
                      <span className="text-slate-500 lg:text-right">
                        {formatTimestamp(item.receivedAt, language)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
