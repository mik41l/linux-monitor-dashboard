import { buildApp } from "../packages/server/src/app.js";

describe("server app routes", () => {
  it("serves health and module endpoints through Fastify", async () => {
    const app = await buildApp(
      {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      } as never,
      {
        agentsService: {
          listAgents: vi.fn(async () => [{ agentId: "agent-1", hostname: "linux-server-1" }]),
          getAgent: vi.fn(async () => ({ agentId: "agent-1", hostname: "linux-server-1" })),
          getLatestSshdAudit: vi.fn(async () => ({ agentId: "agent-1", status: "ok", riskScore: 0 })),
          getLatestPortScan: vi.fn(async () => ({ agentId: "agent-1", status: "ok", riskScore: 0 })),
          getLatestFirewallAudit: vi.fn(async () => ({ agentId: "agent-1", status: "ok", riskScore: 0 })),
          getLatestHardeningReport: vi.fn(async () => ({ agentId: "agent-1", status: "ok", overallScore: 91 })),
          getLatestLoginActivity: vi.fn(async () => ({ agentId: "agent-1", status: "ok", riskScore: 0 })),
          getAgentSecurityProfile: vi.fn(async () => ({
            agent: { agentId: "agent-1", hostname: "linux-server-1" },
            overallStatus: "ok",
            recommendations: []
          })),
          getSecurityOverview: vi.fn(async () => ({
            totals: { agents: 1, criticalAgents: 0, warningAgents: 0, averageHardeningScore: 91 },
            agents: []
          }))
        } as never,
        alertsService: {
          listAlerts: vi.fn(async () => [{ id: 1, ruleName: "cpu-threshold" }]),
          listRules: vi.fn(async () => [{ id: 1, name: "cpu-threshold" }]),
          resolveAlert: vi.fn(async () => undefined),
          updateRule: vi.fn(async () => ({ id: 1, isEnabled: true }))
        } as never,
        dashboardService: {
          getSummary: vi.fn(async () => ({
            totals: {
              agents: 1,
              onlineAgents: 1,
              offlineAgents: 0,
              openAlerts: 1,
              securityEvents24h: 1
            },
            heartbeatSeries: [],
            resourceSeries: [],
            recentAlerts: []
          }))
        } as never,
        eventsService: {
          listEvents: vi.fn(async () => [{ id: 1, eventType: "auth.login_failed" }])
        } as never,
        metricsService: {
          listAgentMetrics: vi.fn(async () => [{ id: 1, metricType: "cpu" }])
        } as never,
        websocketHub: {
          addClient: vi.fn(),
          removeClient: vi.fn(),
          broadcast: vi.fn()
        } as never
      }
    );

    const health = await app.inject({
      method: "GET",
      url: "/api/health"
    });
    const agents = await app.inject({
      method: "GET",
      url: "/api/agents"
    });
    const metrics = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/metrics?range=1h&limit=5&type=cpu"
    });
    const events = await app.inject({
      method: "GET",
      url: "/api/events?limit=10&page=1"
    });
    const alerts = await app.inject({
      method: "GET",
      url: "/api/alerts"
    });
    const summary = await app.inject({
      method: "GET",
      url: "/api/dashboard/summary"
    });
    const sshdAudit = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/sshd-audit"
    });
    const openPorts = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/open-ports"
    });
    const firewall = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/firewall"
    });
    const hardening = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/hardening"
    });
    const loginActivity = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/login-activity"
    });
    const securityProfile = await app.inject({
      method: "GET",
      url: "/api/agents/agent-1/security"
    });
    const securityOverview = await app.inject({
      method: "GET",
      url: "/api/security/overview"
    });

    expect(health.statusCode).toBe(200);
    expect(JSON.parse(health.payload).status).toBe("ok");
    expect(JSON.parse(agents.payload).data).toEqual([{ agentId: "agent-1", hostname: "linux-server-1" }]);
    expect(JSON.parse(metrics.payload).data).toEqual([{ id: 1, metricType: "cpu" }]);
    expect(JSON.parse(events.payload).data).toEqual([{ id: 1, eventType: "auth.login_failed" }]);
    expect(JSON.parse(alerts.payload).data).toEqual([{ id: 1, ruleName: "cpu-threshold" }]);
    expect(JSON.parse(summary.payload).data.totals.openAlerts).toBe(1);
    expect(JSON.parse(sshdAudit.payload).data.status).toBe("ok");
    expect(JSON.parse(openPorts.payload).data.status).toBe("ok");
    expect(JSON.parse(firewall.payload).data.status).toBe("ok");
    expect(JSON.parse(hardening.payload).data.overallScore).toBe(91);
    expect(JSON.parse(loginActivity.payload).data.status).toBe("ok");
    expect(JSON.parse(securityProfile.payload).data.overallStatus).toBe("ok");
    expect(JSON.parse(securityOverview.payload).data.totals.averageHardeningScore).toBe(91);

    await app.close();
  });
});
