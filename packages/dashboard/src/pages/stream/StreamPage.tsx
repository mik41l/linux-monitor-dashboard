import { useLanguage } from "../../context/LanguageContext.js";
import { useEffect, useState } from "react";
import { formatTimestamp } from "../../lib/format.js";

interface LiveFeedItem {
  id: string;
  type: string;
  receivedAt: string;
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

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("liveFeed")}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{t("liveFeedReserved")}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
        {t("liveFeedHint")}
      </p>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm text-slate-400">
            {t("waitingForFrames")}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4 text-sm"
            >
              <span className="uppercase tracking-[0.22em] text-cyan-200">{item.type}</span>
              <span className="text-slate-500">{formatTimestamp(item.receivedAt, language)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
