import { Activity, BellRing, LayoutDashboard, Shield, ShieldAlert, Server, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useLanguage } from "../../context/LanguageContext.js";

export function AppSidebar() {
  const { t } = useLanguage();
  const links = [
    { to: "/", label: t("navOverview"), icon: LayoutDashboard },
    { to: "/agents", label: t("navAgents"), icon: Server },
    { to: "/events", label: t("navEvents"), icon: Activity },
    { to: "/alerts", label: t("navAlerts"), icon: ShieldAlert },
    { to: "/security", label: t("navSecurity"), icon: Shield },
    { to: "/users", label: t("navUsers"), icon: Users },
    { to: "/stream", label: t("navStream"), icon: BellRing }
  ];

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950 xl:block">
      <div className="flex h-full flex-col px-4 py-5">
        <nav className="space-y-2">
          {links.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                  isActive
                    ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                    : "border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.05]"
                ].join(" ")
              }
              to={to}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
