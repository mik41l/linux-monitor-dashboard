import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { FirewallAudit, FirewallFinding, FirewallRule, SecurityEvent } from "@monitor/shared";

const execFileAsync = promisify(execFile);

interface FirewallParseResult {
  backend: FirewallAudit["backend"];
  defaultPolicy: FirewallAudit["defaultPolicy"];
  rules: FirewallRule[];
}

function createEmptyPolicy() {
  return {
    input: "unknown",
    output: "unknown",
    forward: "unknown"
  };
}

function normalizeTarget(value: string) {
  const normalized = value.trim().toUpperCase();

  if (normalized === "ACCEPT" || normalized === "DROP" || normalized === "REJECT" || normalized === "LOG") {
    return normalized;
  }

  return "UNKNOWN";
}

function normalizePolicy(value: string | undefined) {
  return value?.trim().toUpperCase() ?? "unknown";
}

function isWideOpenSource(source: string) {
  return ["0.0.0.0/0", "::/0", "anywhere", "0.0.0.0", "::"].includes(source.toLowerCase());
}

export function parseIptablesOutput(output: string): FirewallParseResult {
  const defaultPolicy = createEmptyPolicy();
  const rules: FirewallRule[] = [];
  let currentChain: FirewallRule["chain"] | null = null;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const chainMatch = line.match(/^Chain\s+(INPUT|OUTPUT|FORWARD)\s+\(policy\s+([A-Z]+)\)/i);
    if (chainMatch) {
      currentChain = chainMatch[1] as FirewallRule["chain"];
      const policy = normalizePolicy(chainMatch[2]);

      if (currentChain === "INPUT") {
        defaultPolicy.input = policy;
      } else if (currentChain === "OUTPUT") {
        defaultPolicy.output = policy;
      } else {
        defaultPolicy.forward = policy;
      }

      continue;
    }

    if (!currentChain || !/^\d+\s+/.test(line)) {
      continue;
    }

    const parts = line.split(/\s+/);
    const portMatch = line.match(/dpt:(\d+)/);

    rules.push({
      chain: currentChain,
      target: normalizeTarget(parts[1] ?? "UNKNOWN"),
      protocol: parts[2] ?? "all",
      source: parts[4] ?? "anywhere",
      destination: parts[5] ?? "anywhere",
      ...(Number.parseInt(parts[0] ?? "0", 10) > 0
        ? { lineNumber: Number.parseInt(parts[0] ?? "0", 10) }
        : {}),
      ...(portMatch?.[1] ? { port: Number.parseInt(portMatch[1], 10) } : {})
    });
  }

  return {
    backend: "iptables",
    defaultPolicy,
    rules
  };
}

export function parseNftOutput(output: string): FirewallParseResult {
  const defaultPolicy = createEmptyPolicy();
  const rules: FirewallRule[] = [];
  let currentChain: FirewallRule["chain"] | null = null;
  let lineNumber = 0;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const chainMatch = line.match(/^chain\s+(INPUT|OUTPUT|FORWARD)\s*\{/i);
    if (chainMatch) {
      currentChain = chainMatch[1] as FirewallRule["chain"];
      continue;
    }

    if (line === "}") {
      currentChain = null;
      continue;
    }

    if (!currentChain) {
      continue;
    }

    const policyMatch = line.match(/policy\s+(\w+);/i);
    if (policyMatch) {
      const policy = normalizePolicy(policyMatch[1]);

      if (currentChain === "INPUT") {
        defaultPolicy.input = policy;
      } else if (currentChain === "OUTPUT") {
        defaultPolicy.output = policy;
      } else {
        defaultPolicy.forward = policy;
      }

      continue;
    }

    const targetMatch = line.match(/\b(accept|drop|reject|log)\b/i);
    if (!targetMatch) {
      continue;
    }

    lineNumber += 1;
    const protocolMatch = line.match(/\b(tcp|udp|icmp)\b/i);
    const sourceMatch = line.match(/\b(?:ip|ip6)\s+saddr\s+([^\s]+)/i);
    const destinationMatch = line.match(/\b(?:ip|ip6)\s+daddr\s+([^\s]+)/i);
    const portMatch = line.match(/\bdport\s+(\d+)/i);

    rules.push({
      chain: currentChain,
      lineNumber,
      target: normalizeTarget(targetMatch[1] ?? "UNKNOWN"),
      protocol: protocolMatch?.[1]?.toLowerCase() ?? "all",
      source: sourceMatch?.[1] ?? "anywhere",
      destination: destinationMatch?.[1] ?? "anywhere",
      ...(portMatch?.[1] ? { port: Number.parseInt(portMatch[1], 10) } : {})
    });
  }

  return {
    backend: "nftables",
    defaultPolicy,
    rules
  };
}

export function scoreFirewallAudit(parsed: FirewallParseResult) {
  const findings: FirewallFinding[] = [];
  let riskScore = 0;

  const pushFinding = (finding: FirewallFinding, scoreDelta: number) => {
    findings.push(finding);
    riskScore += scoreDelta;
  };

  const isEnabled =
    parsed.rules.length > 0 ||
    Object.values(parsed.defaultPolicy).some((policy) => policy !== "ACCEPT" && policy !== "unknown");

  if (!isEnabled) {
    pushFinding(
      {
        key: "firewall-disabled",
        severity: "critical",
        message: "No active firewall policy or rules were detected.",
        recommendation: "Enable iptables or nftables with a default deny stance."
      },
      40
    );
  }

  if (parsed.defaultPolicy.input === "ACCEPT") {
    pushFinding(
      {
        key: "input-policy",
        severity: "critical",
        message: "INPUT chain default policy is ACCEPT.",
        recommendation: "Set the INPUT default policy to DROP or REJECT."
      },
      30
    );
  }

  if (parsed.defaultPolicy.forward === "ACCEPT") {
    pushFinding(
      {
        key: "forward-policy",
        severity: "warning",
        message: "FORWARD chain default policy is ACCEPT.",
        recommendation: "Restrict forwarded traffic unless routing is required."
      },
      10
    );
  }

  for (const rule of parsed.rules) {
    if (rule.target === "ACCEPT" && isWideOpenSource(rule.source)) {
      pushFinding(
        {
          key: `rule-${rule.chain}-${rule.lineNumber ?? 0}`,
          severity: rule.port ? "warning" : "info",
          message: `${rule.chain} accepts traffic from any source${rule.port ? ` on port ${rule.port}` : ""}.`,
          recommendation: "Limit allowed source ranges for publicly reachable services."
        },
        rule.port ? 8 : 3
      );
    }
  }

  const status =
    findings.some((finding) => finding.severity === "critical")
      ? "critical"
      : findings.some((finding) => finding.severity === "warning")
        ? "warning"
        : "ok";

  return {
    isEnabled,
    findings,
    riskScore: Math.min(riskScore, 100),
    status
  } as const;
}

export function buildFirewallSecurityEvents(report: FirewallAudit): SecurityEvent[] {
  return report.findings
    .filter((finding) => finding.severity !== "info")
    .map((finding) => ({
      agentId: report.agentId,
      eventType: "network.firewall_disabled",
      severity: finding.severity,
      source: "firewall.collector",
      message: finding.message,
      details: {
        backend: report.backend,
        key: finding.key,
        recommendation: finding.recommendation
      },
      occurredAt: report.collectedAt
    }));
}

export class FirewallCollector {
  private lastCollectedAt = 0;
  private cached: FirewallAudit | null = null;

  public constructor(private readonly intervalMs = 60 * 60 * 1000) {}

  public async collect(agentId: string): Promise<{ report: FirewallAudit; events: SecurityEvent[] }> {
    const now = Date.now();

    if (this.cached && now - this.lastCollectedAt < this.intervalMs) {
      return {
        report: this.cached,
        events: []
      };
    }

    try {
      const parsed = await this.readRules();
      const scored = scoreFirewallAudit(parsed);
      const openPorts = Array.from(
        new Set(
          parsed.rules
            .filter((rule) => rule.target === "ACCEPT" && rule.port)
            .map((rule) => rule.port as number)
        )
      ).sort((left, right) => left - right);
      const report: FirewallAudit = {
        agentId,
        collectedAt: new Date().toISOString(),
        isAvailable: true,
        status: scored.status,
        backend: parsed.backend,
        isEnabled: scored.isEnabled,
        defaultPolicy: parsed.defaultPolicy,
        totalRules: parsed.rules.length,
        openPorts,
        rules: parsed.rules,
        findings: scored.findings,
        riskScore: scored.riskScore
      };

      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: buildFirewallSecurityEvents(report)
      };
    } catch (error) {
      const report: FirewallAudit = {
        agentId,
        collectedAt: new Date().toISOString(),
        isAvailable: false,
        status: "unavailable",
        backend: "none",
        isEnabled: false,
        defaultPolicy: createEmptyPolicy(),
        totalRules: 0,
        openPorts: [],
        rules: [],
        findings: [],
        riskScore: 0,
        error: error instanceof Error ? error.message : "Firewall audit failed"
      };

      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: []
      };
    }
  }

  private async readRules() {
    try {
      const iptables = await execFileAsync("iptables", ["-L", "-n", "--line-numbers"]);
      return parseIptablesOutput(iptables.stdout);
    } catch (iptablesError) {
      try {
        const nft = await execFileAsync("nft", ["list", "ruleset"]);
        return parseNftOutput(nft.stdout);
      } catch (nftError) {
        const message =
          nftError instanceof Error
            ? nftError.message
            : iptablesError instanceof Error
              ? iptablesError.message
              : "No firewall tooling available";

        throw new Error(message);
      }
    }
  }
}
