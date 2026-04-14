import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import type { NetworkMetric } from "@monitor/shared";

const execFileAsync = promisify(execFile);

export class NetworkCollector {
  public constructor(private readonly procPath: string) {}

  public async collect(): Promise<NetworkMetric[]> {
    const [content, socketSummary] = await Promise.all([
      readFile(`${this.procPath}/net/dev`, "utf8"),
      this.readSocketSummary()
    ]);

    return content
      .trim()
      .split("\n")
      .slice(2)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [interfaceName, rawMetrics] = line.split(":");
        const metrics = (rawMetrics ?? "")
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((value) => Number.parseInt(value, 10));

        return {
          interfaceName: (interfaceName ?? "").trim(),
          rxBytes: metrics[0] ?? 0,
          rxPackets: metrics[1] ?? 0,
          txBytes: metrics[8] ?? 0,
          txPackets: metrics[9] ?? 0,
          tcpConnections: socketSummary.tcpConnections,
          udpConnections: socketSummary.udpConnections,
          listeningPorts: socketSummary.listeningPorts
        };
      })
      .filter((metric) => metric.interfaceName !== "lo");
  }

  private async readSocketSummary() {
    try {
      const { stdout } = await execFileAsync("ss", ["-tunapH"]);
      let tcpConnections = 0;
      let udpConnections = 0;
      let listeningPorts = 0;

      for (const line of stdout.trim().split("\n").filter(Boolean)) {
        if (line.startsWith("tcp")) {
          tcpConnections += 1;
        }

        if (line.startsWith("udp")) {
          udpConnections += 1;
        }

        if (/\bLISTEN\b/.test(line)) {
          listeningPorts += 1;
        }
      }

      return {
        tcpConnections,
        udpConnections,
        listeningPorts
      };
    } catch {
      return {
        tcpConnections: 0,
        udpConnections: 0,
        listeningPorts: 0
      };
    }
  }
}
