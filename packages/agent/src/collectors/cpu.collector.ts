import { readFile } from "node:fs/promises";
import os from "node:os";

import type { CpuMetric } from "@monitor/shared";

export interface CpuSnapshot {
  idle: number;
  total: number;
}

export function parseCpuSnapshot(stat: string): CpuSnapshot {
  const cpuLine = stat.split("\n").find((line) => line.startsWith("cpu "));

  if (!cpuLine) {
    throw new Error("cpu line not found in /proc/stat");
  }

  const values = cpuLine
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((value) => Number.parseInt(value, 10));

  return {
    idle: (values[3] ?? 0) + (values[4] ?? 0),
    total: values.reduce((sum, value) => sum + value, 0)
  };
}

export function calculateCpuUsage(
  previousSnapshot: CpuSnapshot | null,
  currentSnapshot: CpuSnapshot
) {
  if (!previousSnapshot) {
    return 0;
  }

  const totalDelta = currentSnapshot.total - previousSnapshot.total;
  const idleDelta = currentSnapshot.idle - previousSnapshot.idle;

  return totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
}

export class CpuCollector {
  private previousSnapshot: CpuSnapshot | null = null;

  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<CpuMetric> {
    const stat = await readFile(`${this.procPath}/stat`, "utf8");
    const currentSnapshot = parseCpuSnapshot(stat);
    const usagePercent = calculateCpuUsage(this.previousSnapshot, currentSnapshot);

    this.previousSnapshot = currentSnapshot;

    return {
      usagePercent: Number(usagePercent.toFixed(2)),
      loadAverage: os.loadavg() as [number, number, number],
      coreCount: os.cpus().length
    };
  }
}
