import { and, desc, eq, isNull } from "drizzle-orm";

import type { MetricData, SecurityEvent } from "@monitor/shared";

import { alertRules } from "../../db/schema/alert-rules.schema.js";
import { alerts } from "../../db/schema/alerts.schema.js";
import type { CorrelationAlertCandidate } from "../../correlation/types.js";
import type { Database } from "../shared/database.types.js";

export class AlertsService {
  public constructor(private readonly database: Database) {}

  public async listAlerts(options?: {
    status?: "open" | "acknowledged" | "resolved" | undefined;
    severity?: "info" | "warning" | "critical" | undefined;
    agentId?: string | undefined;
    limit?: number | undefined;
  }) {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(alerts.status, options.status));
    }

    if (options?.severity) {
      conditions.push(eq(alerts.severity, options.severity));
    }

    if (options?.agentId) {
      conditions.push(eq(alerts.agentId, options.agentId));
    }

    return this.database.db
      .select()
      .from(alerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alerts.createdAt))
      .limit(options?.limit ?? 100);
  }

  public async listRules() {
    return this.database.db.select().from(alertRules).orderBy(alertRules.id);
  }

  public async updateRule(id: number, input: { isEnabled: boolean }) {
    const [rule] = await this.database.db
      .update(alertRules)
      .set({
        isEnabled: input.isEnabled
      })
      .where(eq(alertRules.id, id))
      .returning();

    return rule ?? null;
  }

  public async resolveAlert(id: number) {
    await this.database.db
      .update(alerts)
      .set({
        status: "resolved",
        resolvedAt: new Date()
      })
      .where(eq(alerts.id, id));
  }

  public async createAlertsForMetric(metric: MetricData) {
    if (metric.metricType === "cpu" && metric.value.usagePercent > 90) {
      await this.createUniqueAlert({
        agentId: metric.agentId,
        message: `CPU usage is ${metric.value.usagePercent.toFixed(1)}%`,
        ruleName: "cpu-threshold",
        severity: "critical"
      });
    }

    if (metric.metricType === "memory" && metric.value.usagePercent > 90) {
      await this.createUniqueAlert({
        agentId: metric.agentId,
        message: `Memory usage is ${metric.value.usagePercent.toFixed(1)}%`,
        ruleName: "memory-threshold",
        severity: "warning"
      });
    }

    if (metric.metricType === "disk") {
      const criticalDisk = metric.value.find((disk) => disk.usagePercent > 95);

      if (criticalDisk) {
        await this.createUniqueAlert({
          agentId: metric.agentId,
          message: `Disk ${criticalDisk.mountPoint} usage is ${criticalDisk.usagePercent.toFixed(1)}%`,
          ruleName: "disk-threshold",
          severity: "critical"
        });
      }
    }

    if (metric.metricType === "process") {
      const runawayProcess = metric.value.find(
        (process) => process.cpuPercent > 85 || process.memoryPercent > 85
      );

      if (runawayProcess) {
        await this.createUniqueAlert({
          agentId: metric.agentId,
          message: `Process ${runawayProcess.command} is consuming abnormal resources`,
          ruleName: "process-anomaly-threshold",
          severity: "warning"
        });
      }
    }
  }

  public async createAlertForSecurityEvent(event: SecurityEvent) {
    if (event.severity !== "critical") {
      return;
    }

    await this.createUniqueAlert({
      agentId: event.agentId,
      message: event.message,
      relatedEvents: [event.eventType],
      ruleName: "critical-security-event",
      severity: "critical"
    });
  }

  public async createCorrelationAlert(candidate: CorrelationAlertCandidate) {
    return this.createUniqueAlert({
      ruleName: candidate.ruleName,
      severity: candidate.severity,
      message: candidate.message,
      ...(candidate.agentId ? { agentId: candidate.agentId } : {}),
      ...(candidate.relatedEvents ? { relatedEvents: candidate.relatedEvents } : {})
    });
  }

  private async createUniqueAlert(options: {
    ruleName: string;
    severity: string;
    agentId?: string;
    message: string;
    relatedEvents?: string[];
  }) {
    const [rule] = await this.database.db
      .select()
      .from(alertRules)
      .where(eq(alertRules.name, options.ruleName))
      .limit(1);

    if (rule && !rule.isEnabled) {
      return null;
    }

    const conditions = [
      eq(alerts.ruleName, options.ruleName),
      eq(alerts.status, "open"),
      eq(alerts.message, options.message)
    ];

    if (options.agentId) {
      conditions.push(eq(alerts.agentId, options.agentId));
    } else {
      conditions.push(isNull(alerts.agentId));
    }

    const [existing] = await this.database.db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await this.database.db
      .insert(alerts)
      .values({
        ruleName: options.ruleName,
        severity: options.severity,
        agentId: options.agentId,
        message: options.message,
        relatedEvents: options.relatedEvents ?? []
      })
      .returning();

    return created ?? null;
  }
}
