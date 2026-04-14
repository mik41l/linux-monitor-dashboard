import { readFile } from "node:fs/promises";

import type { SshdAuditResult, SshdFinding } from "@monitor/shared";

interface ParsedSshdConfig {
  permitRootLogin?: string;
  passwordAuthentication?: string;
  port?: number;
  maxAuthTries?: number;
  permitEmptyPasswords?: string;
  x11Forwarding?: string;
  protocol?: string;
  usePAM?: string;
  loginGraceTime?: number;
  allowUsers: string[];
}

export function parseSshdConfig(content: string): ParsedSshdConfig {
  const parsed: ParsedSshdConfig = {
    allowUsers: []
  };

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/#.*/, "").trim();

    if (!line) {
      continue;
    }

    const [keyRaw, ...rest] = line.split(/\s+/);
    const key = (keyRaw ?? "").toLowerCase();
    const value = rest.join(" ").trim();

    if (!key || !value) {
      continue;
    }

    switch (key) {
      case "permitrootlogin":
        parsed.permitRootLogin = value;
        break;
      case "passwordauthentication":
        parsed.passwordAuthentication = value;
        break;
      case "port":
        parsed.port = Number.parseInt(value, 10);
        break;
      case "maxauthtries":
        parsed.maxAuthTries = Number.parseInt(value, 10);
        break;
      case "permitemptypasswords":
        parsed.permitEmptyPasswords = value;
        break;
      case "x11forwarding":
        parsed.x11Forwarding = value;
        break;
      case "protocol":
        parsed.protocol = value;
        break;
      case "usepam":
        parsed.usePAM = value;
        break;
      case "logingracetime":
        parsed.loginGraceTime = parseDurationSeconds(value);
        break;
      case "allowusers":
        parsed.allowUsers = value.split(/\s+/).filter(Boolean);
        break;
      default:
        break;
    }
  }

  return parsed;
}

function parseDurationSeconds(value: string) {
  const trimmed = value.trim().toLowerCase();
  const numeric = Number.parseInt(trimmed, 10);

  if (Number.isNaN(numeric)) {
    return 0;
  }

  if (trimmed.endsWith("m")) {
    return numeric * 60;
  }

  if (trimmed.endsWith("h")) {
    return numeric * 60 * 60;
  }

  return numeric;
}

export function scoreSshdConfig(parsed: ParsedSshdConfig) {
  const findings: SshdFinding[] = [];
  let riskScore = 0;

  const pushFinding = (finding: SshdFinding, scoreDelta: number) => {
    findings.push(finding);
    riskScore += scoreDelta;
  };

  if (parsed.permitRootLogin?.toLowerCase() === "yes") {
    pushFinding(
      {
        key: "PermitRootLogin",
        severity: "critical",
        message: "Root login over SSH is explicitly enabled.",
        recommendation: "Set PermitRootLogin to no or prohibit-password.",
        observedValue: parsed.permitRootLogin,
        expectedValue: "no"
      },
      30
    );
  }

  if (parsed.passwordAuthentication?.toLowerCase() === "yes") {
    pushFinding(
      {
        key: "PasswordAuthentication",
        severity: "warning",
        message: "Password-based SSH authentication is enabled.",
        recommendation: "Prefer key-based authentication and disable passwords where possible.",
        observedValue: parsed.passwordAuthentication,
        expectedValue: "no"
      },
      20
    );
  }

  if (parsed.port === 22) {
    pushFinding(
      {
        key: "Port",
        severity: "info",
        message: "SSH is listening on the default port 22.",
        recommendation: "Consider a non-default port for noise reduction if your environment allows it.",
        observedValue: String(parsed.port),
        expectedValue: "non-22"
      },
      5
    );
  }

  if ((parsed.maxAuthTries ?? 0) > 6) {
    pushFinding(
      {
        key: "MaxAuthTries",
        severity: "warning",
        message: "MaxAuthTries is higher than the recommended threshold.",
        recommendation: "Reduce MaxAuthTries to 3-6 attempts.",
        observedValue: String(parsed.maxAuthTries),
        expectedValue: "<= 6"
      },
      10
    );
  }

  if (parsed.permitEmptyPasswords?.toLowerCase() === "yes") {
    pushFinding(
      {
        key: "PermitEmptyPasswords",
        severity: "critical",
        message: "Accounts with empty passwords are allowed to authenticate.",
        recommendation: "Set PermitEmptyPasswords to no.",
        observedValue: parsed.permitEmptyPasswords,
        expectedValue: "no"
      },
      30
    );
  }

  if (parsed.x11Forwarding?.toLowerCase() === "yes") {
    pushFinding(
      {
        key: "X11Forwarding",
        severity: "info",
        message: "X11 forwarding is enabled.",
        recommendation: "Disable X11Forwarding unless it is explicitly required.",
        observedValue: parsed.x11Forwarding,
        expectedValue: "no"
      },
      5
    );
  }

  if (parsed.protocol === "1") {
    pushFinding(
      {
        key: "Protocol",
        severity: "critical",
        message: "Legacy SSH protocol version 1 is enabled.",
        recommendation: "Use SSH protocol version 2 only.",
        observedValue: parsed.protocol,
        expectedValue: "2"
      },
      30
    );
  }

  if (parsed.allowUsers.length === 0) {
    pushFinding(
      {
        key: "AllowUsers",
        severity: "warning",
        message: "No explicit allow-list of SSH users is configured.",
        recommendation: "Define AllowUsers or AllowGroups to reduce the exposed login surface.",
        expectedValue: "non-empty"
      },
      15
    );
  }

  const status =
    findings.some((finding) => finding.severity === "critical")
      ? "critical"
      : findings.some((finding) => finding.severity === "warning")
        ? "warning"
        : "ok";

  return {
    findings,
    riskScore,
    status
  } as const;
}

export class SshdAuditCollector {
  private lastCollectedAt = 0;
  private cached: SshdAuditResult | null = null;

  public constructor(
    private readonly configPath: string,
    private readonly intervalMs = 60 * 60 * 1000
  ) {}

  public async collect(agentId: string): Promise<SshdAuditResult> {
    const now = Date.now();

    if (this.cached && now - this.lastCollectedAt < this.intervalMs) {
      return this.cached;
    }

    const collectedAt = new Date().toISOString();

    try {
      const content = await readFile(this.configPath, "utf8");
      const parsed = parseSshdConfig(content);
      const scored = scoreSshdConfig(parsed);

      const report = {
        agentId,
        configPath: this.configPath,
        collectedAt,
        isAvailable: true,
        status: scored.status,
        riskScore: scored.riskScore,
        allowUsers: parsed.allowUsers,
        findings: scored.findings,
        ...(parsed.permitRootLogin ? { permitRootLogin: parsed.permitRootLogin } : {}),
        ...(parsed.passwordAuthentication
          ? { passwordAuthentication: parsed.passwordAuthentication }
          : {}),
        ...(parsed.port ? { port: parsed.port } : {}),
        ...(parsed.maxAuthTries ? { maxAuthTries: parsed.maxAuthTries } : {}),
        ...(parsed.permitEmptyPasswords
          ? { permitEmptyPasswords: parsed.permitEmptyPasswords }
          : {}),
        ...(parsed.x11Forwarding ? { x11Forwarding: parsed.x11Forwarding } : {}),
        ...(parsed.protocol ? { protocol: parsed.protocol } : {}),
        ...(parsed.usePAM ? { usePAM: parsed.usePAM } : {}),
        ...(parsed.loginGraceTime ? { loginGraceTime: parsed.loginGraceTime } : {})
      } satisfies SshdAuditResult;

      this.cached = report;
      this.lastCollectedAt = now;

      return report;
    } catch (error) {
      const report = {
        agentId,
        configPath: this.configPath,
        collectedAt,
        isAvailable: false,
        status: "unavailable",
        riskScore: 0,
        allowUsers: [],
        findings: [],
        error: error instanceof Error ? error.message : "Unable to read sshd config"
      } satisfies SshdAuditResult;

      this.cached = report;
      this.lastCollectedAt = now;

      return report;
    }
  }
}
