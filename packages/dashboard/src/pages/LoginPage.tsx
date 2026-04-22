import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { useAuth } from "../context/AuthContext.js";
import { useLanguage } from "../context/LanguageContext.js";

export function LoginPage() {
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin12345!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (user) {
    return <Navigate replace to={from} />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError(t("invalidLogin"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 text-slate-100">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Linux Monitor</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{t("loginTitle")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{t("loginSubtitle")}</p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">{t("email")}</span>
              <Input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-slate-300">{t("password")}</span>
              <Input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <div className="rounded-3xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button className="w-full" disabled={isSubmitting} type="submit">
              {t("signIn")}
            </Button>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
            {t("defaultLoginHint")}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
