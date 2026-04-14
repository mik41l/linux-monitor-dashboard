import { useLanguage } from "../../context/LanguageContext.js";
import { useEffect, useState } from "react";
import { formatTimestamp } from "../../lib/format.js";
import { Card, CardContent } from "../../components/ui/card.js";

interface LiveFeedItem {
  id: string;
  type: string;
  receivedAt: string;
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

export function StreamPage() {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<LiveFeedItem[]>([]);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;

      setItems((current) => [
        {
          id: crypto.randomUUID(),
          type: detail.type,
          receivedAt: new Date().toISOString()
        },
        ...current
      ].slice(0, 20));
    };

    window.addEventListener("monitor-ws", handleMessage);

    return () => {
      window.removeEventListener("monitor-ws", handleMessage);
    };
  }, []);

  const distribution = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.type] = (accumulator[item.type] ?? 0) + 1;
    return accumulator;
  }, {});
  const latestItem = items[0];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("liveFeed")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{t("liveFeedReserved")}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">{t("liveFeedHint")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("liveFrames")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{items.length}</p>
            <p className="mt-2 text-sm text-slate-400">{t("liveFramesHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("totalFrames")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{items.length}</p>
            <p className="mt-2 text-sm text-slate-400">
              {latestItem ? getFrameLabel(latestItem.type, t) : t("waitingForFrames")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("lastFrame")}</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {latestItem ? formatTimestamp(latestItem.receivedAt, language) : "n/a"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {latestItem ? getFrameLabel(latestItem.type, t) : t("noFramesYet")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("frameTypeDistribution")}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{t("liveFrames")}</h3>
            </div>
            {Object.keys(distribution).length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                {t("noFramesYet")}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(distribution).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <span className="text-sm text-slate-300">{getFrameLabel(type, t)}</span>
                    <span className="text-lg font-semibold text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("latestFrameLog")}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{t("liveFeed")}</h3>
            </div>
            {items.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                {t("waitingForFrames")}
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm"
                  >
                    <span className="uppercase tracking-[0.22em] text-cyan-200">
                      {getFrameLabel(item.type, t)}
                    </span>
                    <span className="text-slate-500">{formatTimestamp(item.receivedAt, language)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
