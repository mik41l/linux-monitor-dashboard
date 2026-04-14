import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { SecurityEvent } from "@monitor/shared";

import { AuthLogMonitor } from "../security/auth-log.monitor.js";
import { FileIntegrityMonitor } from "../security/file-integrity.monitor.js";
import { SyslogMonitor } from "../security/syslog.monitor.js";

interface SecurityWorkerConfig {
  agentId: string;
  logPath: string;
  port: MessagePort;
}

interface SecurityRequest {
  type: "collect";
  requestId: string;
}

const config = workerData as SecurityWorkerConfig;
const authLogMonitor = new AuthLogMonitor(config.logPath);
const syslogMonitor = new SyslogMonitor(config.logPath);
const fileIntegrityMonitor = new FileIntegrityMonitor(["/etc/hostname", "/etc/passwd"]);

config.port.on("message", async (message: SecurityRequest) => {
  if (message.type !== "collect") {
    return;
  }

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
});

config.port.start();

