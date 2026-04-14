import { Outlet } from "react-router-dom";

import { AppHeader } from "./AppHeader.js";
import { AppSidebar } from "./AppSidebar.js";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_60%,#111827_100%)] text-slate-100">
      <AppHeader />
      <div className="flex min-h-[calc(100vh-81px)]">
        <AppSidebar />
        <main className="flex-1 p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

