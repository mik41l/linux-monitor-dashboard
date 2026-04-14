import { and, desc, eq, gte, lte } from "drizzle-orm";

import type { SecurityEvent } from "@monitor/shared";

import { securityEvents } from "../../db/schema/security-events.schema.js";
import type { Database } from "../shared/database.types.js";

export class EventsService {
  public constructor(private readonly database: Database) {}

  public async saveEvent(event: SecurityEvent) {
    await this.database.db.insert(securityEvents).values({
      agentId: event.agentId,
      eventType: event.eventType,
      severity: event.severity,
      source: event.source,
      message: event.message,
      details: event.details,
      occurredAt: new Date(event.occurredAt)
    });
  }

  public async listEvents(options: {
    agentId?: string;
    severity?: string;
    eventType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit: number;
    page: number;
  }) {
    const conditions = [];

    if (options.agentId) {
      conditions.push(eq(securityEvents.agentId, options.agentId));
    }

    if (options.severity) {
      conditions.push(eq(securityEvents.severity, options.severity));
    }

    if (options.eventType) {
      conditions.push(eq(securityEvents.eventType, options.eventType));
    }

    if (options.dateFrom) {
      conditions.push(gte(securityEvents.occurredAt, new Date(options.dateFrom)));
    }

    if (options.dateTo) {
      conditions.push(lte(securityEvents.occurredAt, new Date(options.dateTo)));
    }

    return this.database.db
      .select()
      .from(securityEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(securityEvents.occurredAt))
      .offset((options.page - 1) * options.limit)
      .limit(options.limit);
  }
}
