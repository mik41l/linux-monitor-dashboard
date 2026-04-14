import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type {
  FirewallAudit,
  HardeningReport,
  LoginActivityReport,
  PortScanReport,
  SecurityEvent,
  SshdAuditResult
} from "@monitor/shared";

import { AuthLogMonitor } from "../security/auth-log.monitor.js";
import { FileIntegrityMonitor } from "../security/file-integrity.monitor.js";
import { FirewallCollector } from "../security/firewall.collector.js";
import { HardeningCollector } from "../security/hardening.collector.js";
import { LoginActivityCollector } from "../security/login-activity.collector.js";
import { PortScanCollector } from "../security/port-scan.collector.js";
import { SshdAuditCollector } from "../security/sshd-audit.collector.js";
import { SyslogMonitor } from "../security/syslog.monitor.js";

interface SecurityWorkerConfig {
  agentId: string;
  logPath: string;
  sshdConfigPath: string;
  wSnapshotPath?: string;
  lastSnapshotPath?: string;
  lastbSnapshotPath?: string;
  sshdAuditIntervalMs: number;
  portScanIntervalMs: number;
  firewallIntervalMs: number;
  hardeningIntervalMs: number;
  loginActivityIntervalMs: number;
  port: MessagePort;
}

interface SecurityRequest {
  type:
    | "collect-events"
    | "collect-sshd-audit"
    | "collect-port-scan"
    | "collect-firewall-audit"
    | "collect-hardening-report"
    | "collect-login-activity";
  requestId: string;
}

const config = workerData as SecurityWorkerConfig;
const authLogMonitor = new AuthLogMonitor(config.logPath);
const syslogMonitor = new SyslogMonitor(config.logPath);
const fileIntegrityMonitor = new FileIntegrityMonitor(["/etc/hostname", "/etc/passwd"]);
const sshdAuditCollector = new SshdAuditCollector(config.sshdConfigPath, config.sshdAuditIntervalMs);
const portScanCollector = new PortScanCollector(config.portScanIntervalMs);
const firewallCollector = new FirewallCollector(config.firewallIntervalMs);
const hardeningCollector = new HardeningCollector(config.hardeningIntervalMs);
const loginActivityCollector = new LoginActivityCollector(config.loginActivityIntervalMs, {
  ...(config.wSnapshotPath ? { wSnapshotPath: config.wSnapshotPath } : {}),
  ...(config.lastSnapshotPath ? { lastSnapshotPath: config.lastSnapshotPath } : {}),
  ...(config.lastbSnapshotPath ? { lastbSnapshotPath: config.lastbSnapshotPath } : {})
});

config.port.on("message", async (message: SecurityRequest) => {
  if (message.type === "collect-events") {
    const events = (
      await Promise.all([
        authLogMonitor.collect(config.agentId),
        syslogMonitor.collect(config.agentId),
        fileIntegrityMonitor.collect(config.agentId)
      ])
    ).flat() as SecurityEvent[];

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      events
    });
    return;
  }

  if (message.type === "collect-sshd-audit") {
    const sshdAudit = (await sshdAuditCollector.collect(config.agentId)) as SshdAuditResult;

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      sshdAudit
    });
  }

  if (message.type === "collect-port-scan") {
    const { report, events } = await portScanCollector.collect(config.agentId);

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      portScan: report as PortScanReport,
      events
    });
  }

  if (message.type === "collect-firewall-audit") {
    const { report, events } = await firewallCollector.collect(config.agentId);

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      firewallAudit: report as FirewallAudit,
      events
    });
  }

  if (message.type === "collect-hardening-report") {
    const { report, events } = await hardeningCollector.collect(config.agentId);

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      hardeningReport: report as HardeningReport,
      events
    });
  }

  if (message.type === "collect-login-activity") {
    const { report, events } = await loginActivityCollector.collect(config.agentId);

    config.port.postMessage({
      type: "collection-result",
      requestId: message.requestId,
      loginActivity: report as LoginActivityReport,
      events
    });
  }
});

config.port.start();
