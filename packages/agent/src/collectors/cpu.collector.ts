import { readFile } from "node:fs/promises";
import os from "node:os";

import type { CpuMetric } from "@monitor/shared";

interface CpuSnapshot {
  idle: number;
  total: number;
}

export class CpuCollector {
  private previousSnapshot: CpuSnapshot | null = null;

  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<CpuMetric> {
    const stat = await readFile(`${this.procPath}/stat`, "utf8");
    const cpuLine = stat.split("\n").find((line) => line.startsWith("cpu "));

    if (!cpuLine) {
      throw new Error("cpu line not found in /proc/stat");
    }

    const values = cpuLine
      .trim()
      .split(/\s+/)
      .slice(1)
      .map((value) => Number.parseInt(value, 10));

    const idle = (values[3] ?? 0) + (values[4] ?? 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const currentSnapshot = { idle, total };

    let usagePercent = 0;

    if (this.previousSnapshot) {
      const totalDelta = currentSnapshot.total - this.previousSnapshot.total;
      const idleDelta = currentSnapshot.idle - this.previousSnapshot.idle;

      usagePercent = totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
    }

    this.previousSnapshot = currentSnapshot;

    return {
      usagePercent: Number(usagePercent.toFixed(2)),
      loadAverage: os.loadavg() as [number, number, number],
      coreCount: os.cpus().length
    };
  }
}

