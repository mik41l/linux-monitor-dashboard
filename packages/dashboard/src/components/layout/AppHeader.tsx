import { Bell, Check, ChevronDown, Languages, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";

const languageOptions = [
  { code: "tr", labelKey: "turkishLanguage", shortLabel: "TR" },
  { code: "ru", labelKey: "russianLanguage", shortLabel: "RU" }
] as const;

export function AppHeader() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  const submitSearch = () => {
    const trimmedQuery = query.trim();
    void navigate(trimmedQuery ? `/agents?search=${encodeURIComponent(trimmedQuery)}` : "/agents");
  };

  useEffect(() => {
    if (!languageMenuOpen) {
      return undefined;
    }

    const closeMenu = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [languageMenuOpen]);

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
          <div className="relative" ref={languageMenuRef}>
            <button
              aria-expanded={languageMenuOpen}
              aria-label={t("languageSelector")}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
              onClick={() => setLanguageMenuOpen((current) => !current)}
              title={t("languageSelector")}
              type="button"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs uppercase tracking-[0.18em]">{language}</span>
              <ChevronDown
                className={[
                  "h-3.5 w-3.5 text-slate-400 transition",
                  languageMenuOpen ? "rotate-180" : ""
                ].join(" ")}
              />
            </button>

            {languageMenuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl shadow-cyan-950/30 backdrop-blur">
                {languageOptions.map((option) => (
                  <button
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                      language === option.code
                        ? "bg-cyan-300/15 text-cyan-100"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    ].join(" ")}
                    key={option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setLanguageMenuOpen(false);
                    }}
                    type="button"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold">
                        {option.shortLabel}
                      </span>
                      {t(option.labelKey)}
                    </span>
                    {language === option.code ? <Check className="h-4 w-4" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
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
          <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 lg:flex">
            <span>{user?.username}</span>
            <button
              className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/12"
              onClick={() => {
                void logout();
                navigate("/login");
              }}
              type="button"
            >
              {t("signOut")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
