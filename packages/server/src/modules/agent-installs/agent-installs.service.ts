import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { desc, eq, sql } from "drizzle-orm";
import { Client, type ConnectConfig, type SFTPWrapper } from "ssh2";

import { agentInstalls } from "../../db/schema/agent-installs.schema.js";
import type { Database } from "../shared/database.types.js";

type AgentInstallRow = typeof agentInstalls.$inferSelect;
const execFileAsync = promisify(execFile);

export type AgentInstallStatus = "pending" | "running" | "succeeded" | "failed";
export type AgentInstallAuthMethod = "password" | "privateKey";

export interface CreateAgentInstallInput {
  host: string;
  sshPort: number;
  sshUsername: string;
  authMethod: AgentInstallAuthMethod;
  password?: string | undefined;
  privateKey?: string | undefined;
  passphrase?: string | undefined;
  agentId: string;
  agentName: string;
  panelHost: string;
  panelPort: number;
  tlsEnabled: boolean;
}

function sanitizeInstall(row: AgentInstallRow) {
  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agentName,
    host: row.host,
    sshPort: row.sshPort,
    sshUsername: row.sshUsername,
    authMethod: row.authMethod,
    status: row.status as AgentInstallStatus,
    installLog: row.installLog,
    lastError: row.lastError,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    finishedAt: row.finishedAt
  };
}

function shellQuote(value: string | number | boolean) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function base64(value: string | undefined) {
  return Buffer.from(value ?? "", "utf8").toString("base64");
}

export class AgentInstallsService {
  private readonly agentBundlePath = process.env.AGENT_BUNDLE_PATH ?? "/app/agent-bundle";

  public constructor(private readonly database: Database) {}

  public async listInstalls() {
    const rows = await this.database.db
      .select()
      .from(agentInstalls)
      .orderBy(desc(agentInstalls.createdAt))
      .limit(25);

    return rows.map(sanitizeInstall);
  }

  public async getInstall(id: number) {
    const [row] = await this.database.db.select().from(agentInstalls).where(eq(agentInstalls.id, id)).limit(1);
    return row ? sanitizeInstall(row) : null;
  }

  public async createInstall(input: CreateAgentInstallInput, userId: number) {
    const [created] = await this.database.db
      .insert(agentInstalls)
      .values({
        agentId: input.agentId,
        agentName: input.agentName,
        host: input.host,
        sshPort: input.sshPort,
        sshUsername: input.sshUsername,
        authMethod: input.authMethod,
        status: "pending",
        createdByUserId: userId
      })
      .returning();

    if (!created) {
      return null;
    }

    void this.runInstall(created.id, input);
    return sanitizeInstall(created);
  }

  private async runInstall(id: number, input: CreateAgentInstallInput) {
    await this.setStatus(id, "running");
    await this.appendLog(id, `Connecting to ${input.sshUsername}@${input.host}:${input.sshPort}\n`);

    const client = new Client();

    try {
      await this.connect(client, input);
      await this.appendLog(id, "SSH connection established\n");
      const remoteArchivePath = await this.uploadAgentBundle(client, id);
      await this.execInstallScript(client, id, input, remoteArchivePath);
      await this.setStatus(id, "succeeded");
      await this.appendLog(id, "Agent installation completed\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown installation error";
      await this.appendLog(id, `Installation failed: ${message}\n`);
      await this.setStatus(id, "failed", message);
    } finally {
      client.end();
    }
  }

  private connect(client: Client, input: CreateAgentInstallInput) {
    const config: ConnectConfig = {
      host: input.host,
      port: input.sshPort,
      username: input.sshUsername,
      readyTimeout: 20_000
    };

    if (input.authMethod === "password") {
      if (input.password) {
        config.password = input.password;
      }
    } else {
      if (input.privateKey) {
        config.privateKey = input.privateKey;
      }

      if (input.passphrase) {
        config.passphrase = input.passphrase;
      }
    }

    return new Promise<void>((resolve, reject) => {
      client
        .once("ready", resolve)
        .once("error", reject)
        .connect(config);
    });
  }

  private async uploadAgentBundle(client: Client, id: number) {
    const tempDir = await mkdtemp(join(tmpdir(), "monitor-agent-bundle-"));
    const archivePath = join(tempDir, "agent-bundle.tar.gz");
    const remoteArchivePath = `/tmp/monitor-agent-bundle-${id}-${Date.now()}.tar.gz`;

    try {
      await this.appendLog(id, "Packaging local agent bundle\n");
      await execFileAsync("tar", [
        "--exclude",
        "node_modules",
        "--exclude",
        "dist",
        "--exclude",
        ".tsbuildinfo",
        "-czf",
        archivePath,
        "-C",
        this.agentBundlePath,
        "."
      ]);

      const sftp = await this.openSftp(client);
      try {
        await this.sftpFastPut(sftp, archivePath, remoteArchivePath);
      } finally {
        sftp.end();
      }

      await this.appendLog(id, "Uploaded local agent bundle\n");
      return remoteArchivePath;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload local agent bundle";
      throw new Error(`Local agent bundle upload failed: ${message}`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private openSftp(client: Client) {
    return new Promise<SFTPWrapper>((resolve, reject) => {
      client.sftp((error, sftp) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(sftp);
      });
    });
  }

  private sftpFastPut(sftp: SFTPWrapper, localPath: string, remotePath: string) {
    return new Promise<void>((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private execInstallScript(client: Client, id: number, input: CreateAgentInstallInput, remoteArchivePath: string) {
    const command = "bash -s";
    const script = this.buildInstallScript(input, remoteArchivePath);

    return new Promise<void>((resolve, reject) => {
      client.exec(command, (execError, stream) => {
        if (execError) {
          reject(execError);
          return;
        }

        let exitCode = 0;
        let tail = Promise.resolve();
        const enqueueLog = (chunk: Buffer) => {
          tail = tail.then(() => this.appendLog(id, chunk.toString("utf8")));
        };

        stream.on("data", enqueueLog);
        stream.stderr.on("data", enqueueLog);
        stream.on("close", (code: number | null) => {
          exitCode = code ?? 0;
          tail
            .then(() => {
              if (exitCode === 0) {
                resolve();
              } else {
                reject(new Error(`Remote install script exited with code ${exitCode}`));
              }
            })
            .catch(reject);
        });

        stream.end(script);
      });
    });
  }

  private buildInstallScript(input: CreateAgentInstallInput, remoteArchivePath: string) {
    return `set -euo pipefail
AGENT_ID=${shellQuote(input.agentId)}
AGENT_NAME=${shellQuote(input.agentName)}
SERVER_HOST=${shellQuote(input.panelHost)}
SERVER_PORT=${shellQuote(input.panelPort)}
TLS_ENABLED=${shellQuote(input.tlsEnabled)}
SUDO_PASSWORD_B64=${shellQuote(input.authMethod === "password" ? base64(input.password) : "")}
AGENT_ARCHIVE=${shellQuote(remoteArchivePath)}
BUILD_DIR="$HOME/linux-monitor-dashboard-agent-build"

log() {
  printf '[agent-install] %s\\n' "$1"
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
    return
  fi

  if [ -n "$SUDO_PASSWORD_B64" ]; then
    SUDO_PASSWORD="$(printf '%s' "$SUDO_PASSWORD_B64" | base64 -d)"
    printf '%s\\n' "$SUDO_PASSWORD" | sudo -S -p '' "$@"
    return
  fi

  sudo -n "$@"
}

if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 || {
    log "sudo is required for non-root SSH users"
    exit 10
  }
  run_privileged true
fi

log "Installing Docker and network tools"
run_privileged apt-get update
run_privileged env DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io netcat-openbsd
run_privileged systemctl enable --now docker >/dev/null 2>&1 || true

log "Checking panel TCP reachability"
if ! nc -vz -w 5 "$SERVER_HOST" "$SERVER_PORT"; then
  log "Panel TCP endpoint is not reachable from this server: $SERVER_HOST:$SERVER_PORT"
  exit 20
fi

log "Preparing uploaded agent source"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
tar -xzf "$AGENT_ARCHIVE" -C "$BUILD_DIR"
rm -f "$AGENT_ARCHIVE"

log "Building monitor agent Docker image"
run_privileged docker build -f "$BUILD_DIR/docker/Dockerfile.agent" -t linux-monitor-agent:latest "$BUILD_DIR"

log "Starting monitor-agent container"
run_privileged docker rm -f monitor-agent >/dev/null 2>&1 || true
run_privileged docker run -d \\
  --name monitor-agent \\
  --restart unless-stopped \\
  --network host \\
  --pid host \\
  --cap-add NET_ADMIN \\
  --cap-add NET_RAW \\
  -e AGENT_ID="$AGENT_ID" \\
  -e AGENT_NAME="$AGENT_NAME" \\
  -e SERVER_HOST="$SERVER_HOST" \\
  -e SERVER_PORT="$SERVER_PORT" \\
  -e TLS_ENABLED="$TLS_ENABLED" \\
  -e PROC_PATH=/host/proc \\
  -e LOG_PATH=/var/log \\
  -v /proc:/host/proc:ro \\
  -v /var/log:/var/log:ro \\
  -v /etc/ssh:/etc/ssh:ro \\
  linux-monitor-agent:latest

log "Container status"
run_privileged docker ps --filter name=monitor-agent
`;
  }

  private async setStatus(id: number, status: AgentInstallStatus, error?: string) {
    await this.database.db
      .update(agentInstalls)
      .set({
        status,
        lastError: error,
        updatedAt: new Date(),
        ...(status === "succeeded" || status === "failed" ? { finishedAt: new Date() } : {})
      })
      .where(eq(agentInstalls.id, id));
  }

  private async appendLog(id: number, chunk: string) {
    await this.database.db
      .update(agentInstalls)
      .set({
        installLog: sql`${agentInstalls.installLog} || ${chunk}`,
        updatedAt: new Date()
      })
      .where(eq(agentInstalls.id, id));
  }
}
