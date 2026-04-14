import { and, desc, eq, ilike } from "drizzle-orm";

import type { AgentHandshake, SshdAuditResult } from "@monitor/shared";

import { agents } from "../../db/schema/agents.schema.js";
import { sshdAudits } from "../../db/schema/sshd-audits.schema.js";
import type { Database } from "../shared/database.types.js";

export class AgentsService {
  public constructor(private readonly database: Database) {}

  public async upsertHandshake(handshake: AgentHandshake) {
    await this.database.db
      .insert(agents)
      .values({
        agentId: handshake.agentId,
        hostname: handshake.hostname,
        ipAddress: handshake.ipAddress,
        osInfo: handshake.osInfo,
        status: "online",
        lastHeartbeat: new Date()
      })
      .onConflictDoUpdate({
        target: agents.agentId,
        set: {
          hostname: handshake.hostname,
          ipAddress: handshake.ipAddress,
          osInfo: handshake.osInfo,
          status: "online",
          lastHeartbeat: new Date()
        }
      });
  }

  public async touchHeartbeat(agentId: string) {
    await this.database.db
      .update(agents)
      .set({
        status: "online",
        lastHeartbeat: new Date()
      })
      .where(eq(agents.agentId, agentId));
  }

  public async markOffline(agentId: string) {
    await this.database.db
      .update(agents)
      .set({
        status: "offline"
      })
      .where(eq(agents.agentId, agentId));
  }

  public async listAgents(options?: {
    status?: "online" | "offline" | undefined;
    search?: string | undefined;
  }) {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(agents.status, options.status));
    }

    if (options?.search) {
      conditions.push(ilike(agents.hostname, `%${options.search}%`));
    }

    return this.database.db
      .select()
      .from(agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agents.lastHeartbeat));
  }

  public async getAgent(agentId: string) {
    const [agent] = await this.database.db
      .select()
      .from(agents)
      .where(eq(agents.agentId, agentId))
      .limit(1);

    return agent ?? null;
  }

  public async saveSshdAudit(audit: SshdAuditResult) {
    await this.database.db.insert(sshdAudits).values({
      agentId: audit.agentId,
      status: audit.status,
      riskScore: audit.riskScore,
      configPath: audit.configPath,
      payload: audit,
      collectedAt: new Date(audit.collectedAt)
    });
  }

  public async getLatestSshdAudit(agentId: string) {
    const [audit] = await this.database.db
      .select({
        payload: sshdAudits.payload
      })
      .from(sshdAudits)
      .where(eq(sshdAudits.agentId, agentId))
      .orderBy(desc(sshdAudits.collectedAt))
      .limit(1);

    return (audit?.payload as SshdAuditResult | undefined) ?? null;
  }
}
