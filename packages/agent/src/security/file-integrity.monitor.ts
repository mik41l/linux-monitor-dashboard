import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { SecurityEvent } from "@monitor/shared";

export class FileIntegrityMonitor {
  private readonly hashes = new Map<string, string>();

  public constructor(private readonly targets: string[]) {}

  public async collect(agentId: string): Promise<SecurityEvent[]> {
    const events: SecurityEvent[] = [];

    for (const target of this.targets) {
      try {
        const content = await readFile(target);
        const hash = createHash("sha256").update(content).digest("hex");
        const previousHash = this.hashes.get(target);
        this.hashes.set(target, hash);

        if (previousHash && previousHash !== hash) {
          events.push({
            agentId,
            eventType: "system.file_changed",
            severity: "warning",
            source: "file-integrity.monitor",
            message: `Tracked file changed: ${target}`,
            details: {
              previousHash,
              hash
            },
            occurredAt: new Date().toISOString()
          });
        }
      } catch {
        continue;
      }
    }

    return events;
  }
}

