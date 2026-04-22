import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { ProtectedShell } from "./components/auth/ProtectedShell.js";
import { RequireAuth } from "./components/auth/RequireAuth.js";
import { AuthProvider } from "./context/AuthContext.js";
import { LanguageProvider } from "./context/LanguageContext.js";
import { useLanguage } from "./context/LanguageContext.js";
import { queryClient } from "./lib/query-client.js";

const OverviewPage = lazy(() =>
  import("./pages/Overview.js").then((module) => ({ default: module.OverviewPage }))
);
const AgentsPage = lazy(() =>
  import("./pages/agents/AgentsPage.js").then((module) => ({
    default: module.AgentsPage
  }))
);
const AgentDetailPage = lazy(() =>
  import("./pages/agents/AgentDetail.js").then((module) => ({
    default: module.AgentDetailPage
  }))
);
const AddServerPage = lazy(() =>
  import("./pages/agents/AddServerPage.js").then((module) => ({
    default: module.AddServerPage
  }))
);
const EventsPage = lazy(() =>
  import("./pages/events/EventsPage.js").then((module) => ({ default: module.EventsPage }))
);
const AlertsPage = lazy(() =>
  import("./pages/alerts/AlertsPage.js").then((module) => ({ default: module.AlertsPage }))
);
const StreamPage = lazy(() =>
  import("./pages/stream/StreamPage.js").then((module) => ({ default: module.StreamPage }))
);
const SecurityOverviewPage = lazy(() =>
  import("./pages/security/SecurityOverview.js").then((module) => ({
    default: module.SecurityOverviewPage
  }))
);
const AgentSecurityDetailPage = lazy(() =>
  import("./pages/security/AgentSecurityDetail.js").then((module) => ({
    default: module.AgentSecurityDetailPage
  }))
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage.js").then((module) => ({ default: module.LoginPage }))
);
const UsersPage = lazy(() =>
  import("./pages/users/UsersPage.js").then((module) => ({ default: module.UsersPage }))
);

function PageLoader() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      {t("loadingView")}
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<LoginPage />} path="login" />
                <Route
                  element={
                    <RequireAuth>
                      <ProtectedShell />
                    </RequireAuth>
                  }
                  path="/"
                >
                  <Route element={<OverviewPage />} index />
                  <Route element={<AgentsPage />} path="agents" />
                  <Route element={<AddServerPage />} path="agents/add" />
                  <Route element={<AgentDetailPage />} path="agents/:agentId" />
                  <Route element={<EventsPage />} path="events" />
                  <Route element={<AlertsPage />} path="alerts" />
                  <Route element={<SecurityOverviewPage />} path="security" />
                  <Route element={<StreamPage />} path="stream" />
                  <Route element={<UsersPage />} path="users" />
                  <Route element={<AgentSecurityDetailPage />} path="agents/:agentId/security" />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
