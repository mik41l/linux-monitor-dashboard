import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import type { SecurityEvent } from "@monitor/shared";

const execFileAsync = promisify(execFile);

export class SyslogMonitor {
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
    const candidates = [`${this.logPath}/syslog`, `${this.logPath}/messages`];

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
          "syslog.monitor",
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
        "-p",
        "warning",
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

      return this.parseLines(agentId, lines, "syslog.monitor", "journalctl:warning");
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
      if (!/error|failed|panic|segfault|denied|critical/i.test(line)) {
        continue;
      }

      const severity = /panic|segfault|critical/i.test(line) ? "critical" : "warning";

      events.push({
        agentId,
        eventType: "system.service_failed",
        severity,
        source,
        message: `System issue detected via ${transport}`,
        details: {
          line
        },
        occurredAt: new Date().toISOString()
      });
    }

    return events;
  }
}
