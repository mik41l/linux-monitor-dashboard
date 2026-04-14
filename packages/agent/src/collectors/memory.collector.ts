import { readFile } from "node:fs/promises";

import type { MemoryMetric } from "@monitor/shared";

function parseMeminfo(meminfo: string) {
  return new Map(
    meminfo
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [key, value] = line.split(":");
        return [(key ?? "").trim(), Number.parseInt((value ?? "0").trim(), 10) * 1024];
      })
  );
}

export class MemoryCollector {
  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<MemoryMetric> {
    const meminfo = parseMeminfo(await readFile(`${this.procPath}/meminfo`, "utf8"));
    const totalBytes = meminfo.get("MemTotal") ?? 0;
    const availableBytes = meminfo.get("MemAvailable") ?? 0;
    const freeBytes = meminfo.get("MemFree") ?? 0;
    const swapTotal = meminfo.get("SwapTotal") ?? 0;
    const swapFree = meminfo.get("SwapFree") ?? 0;
    const usedBytes = totalBytes - availableBytes;

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      usagePercent: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : 0,
      swapUsedBytes: swapTotal - swapFree
    };
  }
}
