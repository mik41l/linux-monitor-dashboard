import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/layout/AppLayout.js";
import { LiveUpdatesBridge } from "./components/LiveUpdatesBridge.js";
import { LanguageProvider } from "./context/LanguageContext.js";
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

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      Loading view...
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <LiveUpdatesBridge />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />} path="/">
                <Route element={<OverviewPage />} index />
                <Route element={<AgentsPage />} path="agents" />
                <Route element={<AgentDetailPage />} path="agents/:agentId" />
                <Route element={<EventsPage />} path="events" />
                <Route element={<AlertsPage />} path="alerts" />
                <Route element={<SecurityOverviewPage />} path="security" />
                <Route element={<StreamPage />} path="stream" />
                <Route element={<AgentSecurityDetailPage />} path="agents/:agentId/security" />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
