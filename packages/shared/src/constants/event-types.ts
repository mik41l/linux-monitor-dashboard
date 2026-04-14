export const EVENT_TYPES = [
  "auth.login_failed",
  "auth.login_succeeded",
  "auth.privilege_escalation",
  "auth.ssh_disconnected",
  "auth.suspicious_login_activity",
  "system.file_changed",
  "system.service_failed",
  "system.hardening_score_low",
  "network.connection_spike",
  "network.unexpected_open_port",
  "network.firewall_disabled"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];
