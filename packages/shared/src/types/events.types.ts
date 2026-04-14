import type { EventType } from "../constants/event-types.js";
import type { SeverityLevel } from "../constants/severity.js";

export interface SecurityEvent {
  agentId: string;
  eventType: EventType;
  severity: SeverityLevel;
  source: string;
  message: string;
  details?: Record<string, unknown>;
  occurredAt: string;
}

