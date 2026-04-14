export const EVENT_TYPES = [
  "auth.login_failed",
  "auth.login_succeeded",
  "auth.privilege_escalation",
  "auth.ssh_disconnected",
  "system.file_changed",
  "system.service_failed",
  "network.connection_spike"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
