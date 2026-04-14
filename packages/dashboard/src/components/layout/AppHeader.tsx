import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLanguage } from "../../context/LanguageContext.js";

export function AppHeader() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const trimmedQuery = query.trim();
    void navigate(trimmedQuery ? `/agents?search=${encodeURIComponent(trimmedQuery)}` : "/agents");
  };

  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">
            {t("appName")}
          </p>
          <h1 className="text-lg font-semibold text-white">
            {t("appSubtitle")}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {(["tr", "ru"] as const).map((candidate) => (
              <button
                key={candidate}
                className={[
                  "rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em] transition",
                  language === candidate
                    ? "bg-cyan-300/20 text-cyan-100"
                    : "text-slate-400 hover:text-white"
                ].join(" ")}
                onClick={() => setLanguage(candidate)}
                type="button"
              >
                {candidate}
              </button>
            ))}
          </div>
          <label className="hidden min-w-72 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 lg:flex">
            <button
              aria-label={t("searchAgentsCta")}
              className="text-slate-500 transition hover:text-white"
              onClick={submitSearch}
              type="button"
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-500"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder={t("searchPlaceholder")}
              value={query}
            />
          </label>
          <button
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
            onClick={() => navigate("/alerts")}
            title={t("openAlertsCta")}
            type="button"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
