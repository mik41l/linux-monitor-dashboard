import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import type {
  ActiveSession,
  LoginActivityFinding,
  LoginActivityReport,
  LoginRecord,
  SecurityEvent
} from "@monitor/shared";

const execFileAsync = promisify(execFile);

function parseIsoToken(line: string) {
  return line.split(/\s+/).find((token) => /\d{4}-\d{2}-\d{2}T/.test(token)) ?? "";
}

export function parseWOutput(output: string): ActiveSession[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const command = parts.length > 7 ? parts.slice(7).join(" ") : parts.slice(5).join(" ");

      return {
        user: parts[0] ?? "unknown",
        tty: parts[1] ?? "n/a",
        from: parts[2] ?? "local",
        loginAt: parts[3] ?? "n/a",
        idle: parts[4] ?? "n/a",
        command: command || "n/a"
      };
    });
}

export function parseLastOutput(
  output: string,
  status: LoginRecord["status"]
): LoginRecord[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("wtmp begins") && !line.startsWith("btmp begins"))
    .map((line) => {
      const parts = line.split(/\s+/);
      const loginAt = parseIsoToken(line);

      if (!loginAt) {
        return null;
      }

      return {
        user: parts[0] ?? "unknown",
        tty: parts[1] ?? "n/a",
        from: parts[2] ?? "local",
        loginAt,
        status,
        raw: line
      } satisfies LoginRecord;
    })
    .filter((record): record is LoginRecord => record !== null);
}

export function scoreLoginActivity(report: {
  activeSessions: ActiveSession[];
  successfulLogins: LoginRecord[];
  failedLogins: LoginRecord[];
}) {
  const findings: LoginActivityFinding[] = [];
  let riskScore = 0;

  const pushFinding = (finding: LoginActivityFinding, scoreDelta: number) => {
    findings.push(finding);
    riskScore += scoreDelta;
  };

  const failedBySource = new Map<string, Set<string>>();

  for (const login of report.failedLogins) {
    const current = failedBySource.get(login.from) ?? new Set<string>();
    current.add(login.user);
    failedBySource.set(login.from, current);
  }

  for (const [source, users] of failedBySource.entries()) {
    if (users.size > 1) {
      pushFinding(
        {
          key: "multi-user-failures",
          severity: "critical",
          message: `Failed logins from ${source} targeted multiple users.`,
          recommendation: "Investigate the source IP and consider blocking it."
        },
        30
      );
    }
  }

  for (const login of report.successfulLogins) {
    if (login.user === "root") {
      pushFinding(
        {
          key: "root-login",
          severity: "critical",
          message: "A direct root login was observed.",
          recommendation: "Disable direct root SSH logins and use sudo via named accounts."
        },
        30
      );
    }

    const date = new Date(login.loginAt);
    const hour = Number.isNaN(date.getTime()) ? -1 : date.getHours();

    if (hour >= 2 && hour <= 5) {
      pushFinding(
        {
          key: "odd-hours-login",
          severity: "warning",
          message: `A login by ${login.user} occurred during the 02:00-05:00 window.`,
          recommendation: "Review whether this login time aligns with expected maintenance windows."
        },
        10
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
    findings,
    riskScore: Math.min(riskScore, 100),
    status
  } as const;
}

export function buildLoginSecurityEvents(report: LoginActivityReport): SecurityEvent[] {
  return report.findings.map((finding) => ({
    agentId: report.agentId,
    eventType: "auth.suspicious_login_activity",
    severity: finding.severity,
    source: "login-activity.collector",
    message: finding.message,
    details: {
      key: finding.key,
      recommendation: finding.recommendation
    },
    occurredAt: report.collectedAt
  }));
}

async function safeExec(command: string, args: string[]) {
  try {
    const result = await execFileAsync(command, args);
    return {
      stdout: result.stdout,
      error: null
    };
  } catch (error) {
    return {
      stdout: "",
      error: error instanceof Error ? error.message : `${command} failed`
    };
  }
}

async function safeRead(path: string | undefined) {
  if (!path) {
    return null;
  }

  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

interface LoginActivityCollectorOptions {
  wSnapshotPath?: string;
  lastSnapshotPath?: string;
  lastbSnapshotPath?: string;
}

export class LoginActivityCollector {
  private lastCollectedAt = 0;
  private cached: LoginActivityReport | null = null;

  public constructor(
    private readonly intervalMs = 60 * 1000,
    private readonly options: LoginActivityCollectorOptions = {}
  ) {}

  public async collect(agentId: string): Promise<{ report: LoginActivityReport; events: SecurityEvent[] }> {
    const now = Date.now();

    if (this.cached && now - this.lastCollectedAt < this.intervalMs) {
      return {
        report: this.cached,
        events: []
      };
    }

    const [wSnapshot, lastSnapshot, lastbSnapshot] = await Promise.all([
      safeRead(this.options.wSnapshotPath),
      safeRead(this.options.lastSnapshotPath),
      safeRead(this.options.lastbSnapshotPath)
    ]);
    const [sessionsResult, successResult, failureResult] = await Promise.all([
      wSnapshot !== null
        ? Promise.resolve({ stdout: wSnapshot, error: null })
        : safeExec("w", ["-h"]),
      lastSnapshot !== null
        ? Promise.resolve({ stdout: lastSnapshot, error: null })
        : safeExec("last", ["-n", "50", "-i", "--time-format", "iso"]),
      lastbSnapshot !== null
        ? Promise.resolve({ stdout: lastbSnapshot, error: null })
        : safeExec("lastb", ["-n", "50", "-i", "--time-format", "iso"])
    ]);
    const activeSessions = parseWOutput(sessionsResult.stdout);
    const successfulLogins = parseLastOutput(successResult.stdout, "success");
    const failedLogins = parseLastOutput(failureResult.stdout, "failure");
    const scored = scoreLoginActivity({
      activeSessions,
      successfulLogins,
      failedLogins
    });
    const errors = [sessionsResult.error, successResult.error, failureResult.error].filter(Boolean);
    const report: LoginActivityReport = {
      agentId,
      collectedAt: new Date().toISOString(),
      isAvailable: errors.length < 3,
      status: errors.length < 3 ? scored.status : "unavailable",
      riskScore: errors.length < 3 ? scored.riskScore : 0,
      activeSessions,
      successfulLogins,
      failedLogins,
      findings: scored.findings,
      ...(errors.length > 0 ? { error: errors.join("; ") } : {})
    };

    this.cached = report;
    this.lastCollectedAt = now;

    return {
      report,
      events: report.isAvailable ? buildLoginSecurityEvents(report) : []
    };
  }
}
