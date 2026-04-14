import { z } from "zod";

import { SEVERITY_LEVELS } from "../constants/severity.js";

export const firewallRuleSchema = z.object({
  chain: z.enum(["INPUT", "OUTPUT", "FORWARD"]),
  target: z.enum(["ACCEPT", "DROP", "REJECT", "LOG", "UNKNOWN"]),
  protocol: z.string().min(1),
  source: z.string().min(1),
  destination: z.string().min(1),
  port: z.number().int().positive().optional(),
  lineNumber: z.number().int().positive().optional()
});

export const firewallFindingSchema = z.object({
  key: z.string().min(1),
  severity: z.enum(SEVERITY_LEVELS),
  message: z.string().min(1),
  recommendation: z.string().min(1)
});

export const firewallAuditSchema = z.object({
  agentId: z.string().min(1),
  collectedAt: z.string().datetime(),
  isAvailable: z.boolean(),
  status: z.enum(["ok", "warning", "critical", "unavailable"]),
  backend: z.enum(["iptables", "nftables", "none"]),
  isEnabled: z.boolean(),
  defaultPolicy: z.object({
    input: z.string().min(1),
    output: z.string().min(1),
    forward: z.string().min(1)
  }),
  totalRules: z.number().int().nonnegative(),
  openPorts: z.array(z.number().int().positive()),
  rules: z.array(firewallRuleSchema),
  findings: z.array(firewallFindingSchema),
  riskScore: z.number().int().nonnegative(),
  error: z.string().min(1).optional()
});
