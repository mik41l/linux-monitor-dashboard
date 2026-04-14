import os from "node:os";
import { readdir, readFile } from "node:fs/promises";

import type { ProcessMetric } from "@monitor/shared";

const PAGE_SIZE_BYTES = 4096;
const CLOCK_TICKS = 100;

export class ProcessCollector {
  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<ProcessMetric[]> {
    try {
      const [entries, uptimeContent] = await Promise.all([
        readdir(this.procPath, { withFileTypes: true }),
        readFile(`${this.procPath}/uptime`, "utf8")
      ]);
      const uptimeSeconds = Number.parseFloat(uptimeContent.split(" ")[0] ?? "0");
      const totalMemory = os.totalmem();
      const processEntries = entries
        .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
        .slice(0, 150);

      const collected = await Promise.all(
        processEntries.map(async (entry) => this.readProcessMetric(entry.name, uptimeSeconds, totalMemory))
      );

      return collected
        .filter((metric): metric is ProcessMetric => metric !== null)
        .sort((left, right) => {
          const leftScore = Math.max(left.cpuPercent, left.memoryPercent);
          const rightScore = Math.max(right.cpuPercent, right.memoryPercent);
          return rightScore - leftScore;
        })
        .slice(0, 5);
    } catch {
      return [];
    }
  }

  private async readProcessMetric(
    pid: string,
    uptimeSeconds: number,
    totalMemory: number
  ): Promise<ProcessMetric | null> {
    try {
      const stat = await readFile(`${this.procPath}/${pid}/stat`, "utf8");
      const commEnd = stat.lastIndexOf(")");

      if (commEnd === -1) {
        return null;
      }

      const command = stat.slice(stat.indexOf("(") + 1, commEnd).trim();
      const rest = stat.slice(commEnd + 2).trim().split(/\s+/);
      const state = rest[0] ?? "?";
      const utime = Number.parseInt(rest[11] ?? "0", 10);
      const stime = Number.parseInt(rest[12] ?? "0", 10);
      const startTime = Number.parseInt(rest[19] ?? "0", 10);
      const statm = await readFile(`${this.procPath}/${pid}/statm`, "utf8");
      const rssPages = Number.parseInt(statm.trim().split(/\s+/)[1] ?? "0", 10);
      const rssBytes = rssPages * PAGE_SIZE_BYTES;
      const lifetimeSeconds = Math.max(uptimeSeconds - startTime / CLOCK_TICKS, 1);
      const cpuPercent = Math.min(
        ((utime + stime) / CLOCK_TICKS / lifetimeSeconds) * 100,
        100
      );
      const memoryPercent = Math.min((rssBytes / Math.max(totalMemory, 1)) * 100, 100);

      return {
        pid: Number.parseInt(pid, 10),
        command: command || "unknown",
        cpuPercent: Number(cpuPercent.toFixed(2)),
        memoryPercent: Number(memoryPercent.toFixed(2)),
        rssBytes,
        state
      };
    } catch {
      return null;
    }
  }
}
