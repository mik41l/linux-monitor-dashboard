import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";

import type { HardeningCheck, HardeningReport, SecurityEvent } from "@monitor/shared";

const execFileAsync = promisify(execFile);

function modeToOctal(mode: number) {
  return (mode & 0o777).toString(8).padStart(3, "0");
}

function statusScore(status: HardeningCheck["status"]) {
  if (status === "pass") {
    return 100;
  }

  if (status === "warning") {
    return 60;
  }

  return 0;
}

function buildReport(agentId: string, checks: HardeningCheck[], error?: string): HardeningReport {
  const categories = new Map<string, number[]>();

  for (const check of checks) {
    const current = categories.get(check.category) ?? [];
    current.push(statusScore(check.status));
    categories.set(check.category, current);
  }

  const categoryScores = Object.fromEntries(
    Array.from(categories.entries()).map(([category, scores]) => [
      category,
      Math.round(scores.reduce((sum, value) => sum + value, 0) / Math.max(scores.length, 1))
    ])
  );
  const overallScore = Object.values(categoryScores).length
    ? Math.round(
        Object.values(categoryScores).reduce((sum, value) => sum + value, 0) /
          Object.values(categoryScores).length
      )
    : 0;
  const recommendations = Array.from(
    new Set(
      checks.filter((check) => check.status !== "pass").map((check) => check.recommendation)
    )
  );
  const status =
    overallScore < 60
      ? "critical"
      : checks.some((check) => check.status !== "pass")
        ? "warning"
        : "ok";

  return {
    agentId,
    collectedAt: new Date().toISOString(),
    isAvailable: !error,
    status: error ? "unavailable" : status,
    overallScore: error ? 0 : overallScore,
    categoryScores,
    checks,
    recommendations,
    ...(error ? { error } : {})
  };
}

async function readSafe(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

async function collectSuidCount() {
  try {
    const result = await execFileAsync("find", [
      "/bin",
      "/sbin",
      "/usr/bin",
      "/usr/sbin",
      "-xdev",
      "-perm",
      "-4000",
      "-type",
      "f"
    ]);

    return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean).length;
  } catch {
    return null;
  }
}

async function collectWorldWritableCount() {
  try {
    const result = await execFileAsync("find", [
      "/etc",
      "/usr",
      "/var",
      "-xdev",
      "-type",
      "f",
      "-perm",
      "-0002"
    ]);

    return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean).length;
  } catch {
    return null;
  }
}

async function collectSudoMembers() {
  try {
    const result = await execFileAsync("getent", ["group", "sudo"]);
    const members = result.stdout.trim().split(":")[3] ?? "";
    return members.split(",").map((value) => value.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function runHardeningChecks(): Promise<HardeningCheck[]> {
  const checks: HardeningCheck[] = [];
  const passwdContent = await readSafe("/etc/passwd");
  const shadowContent = await readSafe("/etc/shadow");

  if (passwdContent) {
    const uidZeroUsers = passwdContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(":"))
      .filter((parts) => parts[2] === "0")
      .map((parts) => parts[0] ?? "unknown");

    checks.push({
      category: "Users",
      check: "UID 0 accounts",
      status: uidZeroUsers.length > 1 ? "fail" : "pass",
      detail:
        uidZeroUsers.length > 1
          ? `Additional UID 0 users detected: ${uidZeroUsers.slice(1).join(", ")}`
          : "Only the root account has UID 0.",
      recommendation: "Remove extra UID 0 accounts or assign them non-privileged UIDs."
    });
  }

  if (shadowContent) {
    const passwordlessAccounts = shadowContent
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(":"))
      .filter((parts) => {
        const passwordField = parts[1] ?? "!";
        return passwordField === "";
      })
      .map((parts) => parts[0] ?? "unknown");

    checks.push({
      category: "Users",
      check: "Passwordless accounts",
      status: passwordlessAccounts.length > 0 ? "fail" : "pass",
      detail:
        passwordlessAccounts.length > 0
          ? `Accounts without a password hash: ${passwordlessAccounts.join(", ")}`
          : "No passwordless accounts were found.",
      recommendation: "Lock or assign passwords to accounts with empty password fields."
    });
  } else {
    checks.push({
      category: "Users",
      check: "Passwordless accounts",
      status: "warning",
      detail: "The agent could not inspect /etc/shadow in this environment.",
      recommendation: "Run the agent with permission to read shadow data or validate manually."
    });
  }

  const sudoMembers = await collectSudoMembers();
  checks.push({
    category: "Users",
    check: "Sudo group membership",
    status: sudoMembers.length > 0 ? "warning" : "pass",
    detail:
      sudoMembers.length > 0
        ? `Users with sudo access: ${sudoMembers.join(", ")}`
        : "No additional sudo group members were reported.",
    recommendation: "Review sudo group membership and keep it limited to operational users."
  });

  for (const [path, expected, category, check, allowStricter] of [
    ["/etc/passwd", "644", "Files", "Permissions on /etc/passwd", false],
    ["/etc/shadow", "640", "Files", "Permissions on /etc/shadow", true]
  ] as const) {
    try {
      const metadata = await stat(path);
      const actual = modeToOctal(metadata.mode);
      const pass = allowStricter ? actual === "640" || actual === "600" : actual === expected;

      checks.push({
        category,
        check,
        status: pass ? "pass" : path === "/etc/shadow" ? "fail" : "warning",
        detail: `${path} mode is ${actual}.`,
        recommendation: `Set ${path} mode to ${expected}${allowStricter ? " or stricter" : ""}.`
      });
    } catch {
      checks.push({
        category,
        check,
        status: "warning",
        detail: `Unable to inspect ${path}.`,
        recommendation: `Verify ${path} permissions manually.`
      });
    }
  }

  const suidCount = await collectSuidCount();
  checks.push({
    category: "Files",
    check: "SUID binaries",
    status: suidCount !== null && suidCount > 25 ? "warning" : "pass",
    detail:
      suidCount === null
        ? "Unable to enumerate SUID binaries."
        : `${suidCount} SUID binaries were found in standard system paths.`,
    recommendation: "Review SUID binaries and remove the bit from tools that do not need it."
  });

  const worldWritableCount = await collectWorldWritableCount();
  checks.push({
    category: "Files",
    check: "World-writable files",
    status: worldWritableCount !== null && worldWritableCount > 0 ? "warning" : "pass",
    detail:
      worldWritableCount === null
        ? "Unable to enumerate world-writable files."
        : `${worldWritableCount} world-writable files were found under /etc, /usr or /var.`,
    recommendation: "Remove world-writable permissions from system files where possible."
  });

  for (const [path, expected, category, check, failureStatus] of [
    ["/proc/sys/kernel/randomize_va_space", "2", "Kernel", "ASLR", "warning"],
    ["/proc/sys/net/ipv4/ip_forward", "0", "Kernel", "IP forwarding", "warning"],
    ["/proc/sys/net/ipv4/tcp_syncookies", "1", "Kernel", "SYN cookies", "warning"],
    ["/proc/sys/fs/suid_dumpable", "0", "Kernel", "Restricted core dumps", "warning"]
  ] as const) {
    const value = (await readSafe(path))?.trim();
    checks.push({
      category,
      check,
      status: value === expected ? "pass" : failureStatus,
      detail: value ? `${path} is set to ${value}.` : `${path} could not be read.`,
      recommendation: `Set ${path} to ${expected}.`
    });
  }

  const cronContent = await readSafe("/etc/crontab");
  const cronDirEntries = await (async () => {
    try {
      return await readdir("/etc/cron.d");
    } catch {
      return [];
    }
  })();
  const suspiciousCronPattern = /(curl|wget|nc\s|bash\s+-c|\/tmp\/)/i;
  const suspiciousCron = [
    ...(cronContent?.split("\n").filter((line) => suspiciousCronPattern.test(line)) ?? []),
    ...cronDirEntries.filter((entry) => suspiciousCronPattern.test(entry))
  ];

  checks.push({
    category: "Cron",
    check: "Suspicious cron jobs",
    status: suspiciousCron.length > 0 ? "warning" : "pass",
    detail:
      suspiciousCron.length > 0
        ? `Suspicious cron entries detected: ${suspiciousCron.slice(0, 3).join(" | ")}`
        : "No suspicious cron patterns were found.",
    recommendation: "Review cron entries that download remote content or execute from /tmp."
  });

  return checks;
}

export function buildHardeningSecurityEvents(report: HardeningReport): SecurityEvent[] {
  if (!report.isAvailable || report.overallScore >= 80) {
    return [];
  }

  return [
    {
      agentId: report.agentId,
      eventType: "system.hardening_score_low",
      severity: report.overallScore < 60 ? "critical" : "warning",
      source: "hardening.collector",
      message: `Hardening score dropped to ${report.overallScore}.`,
      details: {
        overallScore: report.overallScore,
        recommendations: report.recommendations
      },
      occurredAt: report.collectedAt
    }
  ];
}

export class HardeningCollector {
  private lastCollectedAt = 0;
  private cached: HardeningReport | null = null;

  public constructor(private readonly intervalMs = 60 * 60 * 1000) {}

  public async collect(agentId: string): Promise<{ report: HardeningReport; events: SecurityEvent[] }> {
    const now = Date.now();

    if (this.cached && now - this.lastCollectedAt < this.intervalMs) {
      return {
        report: this.cached,
        events: []
      };
    }

    try {
      const checks = await runHardeningChecks();
      const report = buildReport(agentId, checks);

      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: buildHardeningSecurityEvents(report)
      };
    } catch (error) {
      const report = buildReport(
        agentId,
        [],
        error instanceof Error ? error.message : "Hardening checks failed"
      );

      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: []
      };
    }
  }
}
