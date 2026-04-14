import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import type { SecurityEvent } from "@monitor/shared";

const execFileAsync = promisify(execFile);

export class AuthLogMonitor {
  private readonly offsets = new Map<string, number>();
  private readonly seenJournalEntries = new Set<string>();

  public constructor(private readonly logPath: string) {}

  public async collect(agentId: string): Promise<SecurityEvent[]> {
    const fileEvents = await this.collectFromFiles(agentId);

    if (fileEvents.length > 0) {
      return fileEvents;
    }

    return this.collectFromJournal(agentId);
  }

  private async collectFromFiles(agentId: string) {
    const candidates = [`${this.logPath}/auth.log`, `${this.logPath}/secure`];

    for (const filePath of candidates) {
      try {
        const content = await readFile(filePath, "utf8");
        const previousOffset = this.offsets.get(filePath) ?? 0;
        const safeOffset = previousOffset > content.length ? 0 : previousOffset;
        const delta = content.slice(safeOffset);
        this.offsets.set(filePath, content.length);

        if (!delta) {
          return [];
        }

        return this.parseLines(
          agentId,
          delta.split("\n"),
          "auth-log.monitor",
          filePath
        );
      } catch {
        continue;
      }
    }

    return [];
  }

  private async collectFromJournal(agentId: string) {
    try {
      const { stdout } = await execFileAsync("journalctl", [
        "-u",
        "sshd",
        "-n",
        "50",
        "--no-pager"
      ]);

      const lines = stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => {
          if (this.seenJournalEntries.has(line)) {
            return false;
          }

          this.seenJournalEntries.add(line);
          return true;
        });

      return this.parseLines(agentId, lines, "auth-log.monitor", "journalctl:sshd");
    } catch {
      return [];
    }
  }

  private parseLines(
    agentId: string,
    lines: string[],
    source: string,
    transport: string
  ): SecurityEvent[] {
    const events: SecurityEvent[] = [];

    for (const line of lines) {
      const ipAddress = line.match(/from ([0-9a-fA-F:.]+)/)?.[1];
      const username =
        line.match(/for (invalid user )?([a-zA-Z0-9._-]+)/)?.[2] ??
        line.match(/user=([a-zA-Z0-9._-]+)/)?.[1];

      if (/failed password|authentication failure|invalid user/i.test(line)) {
        events.push({
          agentId,
          eventType: "auth.login_failed",
          severity: "warning",
          source,
          message: `SSH authentication failure detected via ${transport}`,
          details: {
            ipAddress,
            username,
            line
          },
          occurredAt: new Date().toISOString()
        });
        continue;
      }

      if (/accepted password|session opened|accepted publickey/i.test(line)) {
        events.push({
          agentId,
          eventType: "auth.login_succeeded",
          severity: "info",
          source,
          message: `SSH login success detected via ${transport}`,
          details: {
            ipAddress,
            username,
            line
          },
          occurredAt: new Date().toISOString()
        });
        continue;
      }

      if (/sudo:|session opened for user root|COMMAND=/i.test(line)) {
        events.push({
          agentId,
          eventType: "auth.privilege_escalation",
          severity: "critical",
          source,
          message: `Privilege escalation activity detected via ${transport}`,
          details: {
            ipAddress,
            username,
            line
          },
          occurredAt: new Date().toISOString()
        });
        continue;
      }

      if (/disconnected from/i.test(line)) {
        events.push({
          agentId,
          eventType: "auth.ssh_disconnected",
          severity: "info",
          source,
          message: `SSH disconnect detected via ${transport}`,
          details: {
            ipAddress,
            username,
            line
          },
          occurredAt: new Date().toISOString()
        });
      }
    }

    return events;
  }
}
