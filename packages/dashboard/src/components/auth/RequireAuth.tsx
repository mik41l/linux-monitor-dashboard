import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "../../context/AuthContext.js";
import { useLanguage } from "../../context/LanguageContext.js";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isLoading, user } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        {t("loadingView")}
      </div>
    );
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
