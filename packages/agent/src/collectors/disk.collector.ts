import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import type { DiskMetric } from "@monitor/shared";

const execFileAsync = promisify(execFile);

export interface DiskstatRecord {
  readOps: number;
  writeOps: number;
  readBytes: number;
  writeBytes: number;
}

export function parseDiskstats(content: string) {
  const stats = new Map<string, DiskstatRecord>();

  for (const line of content.trim().split("\n")) {
    const parts = line.trim().split(/\s+/);

    if (parts.length < 14) {
      continue;
    }

    const name = parts[2];
    const readOps = Number.parseInt(parts[3] ?? "0", 10);
    const sectorsRead = Number.parseInt(parts[5] ?? "0", 10);
    const writeOps = Number.parseInt(parts[7] ?? "0", 10);
    const sectorsWritten = Number.parseInt(parts[9] ?? "0", 10);

    if (!name) {
      continue;
    }

    stats.set(name, {
      readOps,
      writeOps,
      readBytes: sectorsRead * 512,
      writeBytes: sectorsWritten * 512
    });
  }

  return stats;
}

export function parseDfOutput(stdout: string, diskstats: Map<string, DiskstatRecord>) {
  return stdout
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 6)
    .map((parts) => {
      const [device, totalKb, usedKb, freeKb, capacity, mountPoint] = parts;
      const deviceName = (device ?? "unknown").split("/").pop() ?? device ?? "unknown";
      const stats = diskstats.get(deviceName);

      return {
        device: device ?? "unknown",
        mountPoint: mountPoint ?? "/",
        totalBytes: Number.parseInt(totalKb ?? "0", 10) * 1024,
        usedBytes: Number.parseInt(usedKb ?? "0", 10) * 1024,
        freeBytes: Number.parseInt(freeKb ?? "0", 10) * 1024,
        usagePercent: Number.parseFloat((capacity ?? "0%").replace("%", "")),
        ...(stats
          ? {
              readOps: stats.readOps,
              writeOps: stats.writeOps,
              readBytes: stats.readBytes,
              writeBytes: stats.writeBytes
            }
          : {})
      };
    });
}

export class DiskCollector {
  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<DiskMetric[]> {
    const [{ stdout }, diskstats] = await Promise.all([
      execFileAsync("df", ["-kP"]),
      this.readDiskstats()
    ]);

    return parseDfOutput(stdout, diskstats);
  }

  private async readDiskstats() {
    try {
      const content = await readFile(`${this.procPath}/diskstats`, "utf8");
      return parseDiskstats(content);
    } catch {
      return new Map<string, DiskstatRecord>();
    }
  }
}
