import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { getJson, postJson } from "../../api/client.js";
import { Button } from "../../components/ui/button.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { cn } from "../../lib/utils.js";

type InstallStatus = "pending" | "running" | "succeeded" | "failed";
type AuthMethod = "password" | "privateKey";

interface AgentInstall {
  id: number;
  agentId: string;
  agentName: string;
  host: string;
  sshPort: number;
  sshUsername: string;
  authMethod: AuthMethod;
  status: InstallStatus;
  installLog: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultServerHost() {
  if (typeof window === "undefined") {
    return "YOUR_PANEL_SERVER_IP";
  }

  const hostname = window.location.hostname;
  return isLoopbackHost(hostname) ? "" : hostname || "YOUR_PANEL_SERVER_IP";
}

function isLoopbackHost(host: string) {
  const normalized = host.trim().toLowerCase();

  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0";
}

function statusTone(status: InstallStatus) {
  if (status === "succeeded") return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  if (status === "failed") return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  if (status === "running") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

export function AddServerPage() {
  const { language, t } = useLanguage();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [serverHost, setServerHost] = useState(defaultServerHost());
  const [serverPort, setServerPort] = useState("9010");
  const [agentName, setAgentName] = useState("ubuntu-server-1");
  const [agentId, setAgentId] = useState("ubuntu-server-1");
  const [tlsEnabled, setTlsEnabled] = useState(true);
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [sshUsername, setSshUsername] = useState("root");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [sshPassword, setSshPassword] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [installing, setInstalling] = useState(false);
  const [currentInstall, setCurrentInstall] = useState<AgentInstall | null>(null);
  const [installs, setInstalls] = useState<AgentInstall[]>([]);

  const safeAgentName = agentName.trim() || "ubuntu-server";
  const safeAgentId = slugify(agentId || safeAgentName) || "ubuntu-server";
  const panelHostInvalid = mode === "auto" && isLoopbackHost(serverHost);

  const command = useMemo(() => {
    const safeHost = serverHost.trim() || "YOUR_PANEL_SERVER_IP";
    const safePort = serverPort.trim() || "9010";

    return [
      "set -e",
      "sudo apt-get update",
      "sudo apt-get install -y docker.io netcat-openbsd",
      "sudo systemctl enable --now docker",
      'test -f /tmp/monitor-agent-bundle.tar.gz || { echo "Upload monitor-agent-bundle.tar.gz to /tmp first"; exit 1; }',
      "rm -rf ~/linux-monitor-dashboard-agent-build",
      "mkdir -p ~/linux-monitor-dashboard-agent-build",
      "tar -xzf /tmp/monitor-agent-bundle.tar.gz -C ~/linux-monitor-dashboard-agent-build",
      "cd ~/linux-monitor-dashboard-agent-build",
      "sudo docker build -f docker/Dockerfile.agent -t linux-monitor-agent:latest .",
      "sudo docker rm -f monitor-agent >/dev/null 2>&1 || true",
      [
        "sudo docker run -d",
        "--name monitor-agent",
        "--restart unless-stopped",
        "--network host",
        "--pid host",
        "--cap-add NET_ADMIN",
        "--cap-add NET_RAW",
        "-e AGENT_ID=" + safeAgentId,
        "-e AGENT_NAME=" + safeAgentName,
        "-e SERVER_HOST=" + safeHost,
        "-e SERVER_PORT=" + safePort,
        "-e TLS_ENABLED=" + String(tlsEnabled),
        "-e PROC_PATH=/host/proc",
        "-e LOG_PATH=/var/log",
        "-v /proc:/host/proc:ro",
        "-v /var/log:/var/log:ro",
        "-v /etc/ssh:/etc/ssh:ro",
        "linux-monitor-agent:latest"
      ].join(" ")
    ].join("\n");
  }, [safeAgentId, safeAgentName, serverHost, serverPort, tlsEnabled]);

  const refreshInstalls = async () => {
    const response = await getJson<AgentInstall[]>("/api/agent-installs");
    setInstalls(response.data);
  };

  useEffect(() => {
    void refreshInstalls().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currentInstall || currentInstall.status === "succeeded" || currentInstall.status === "failed") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void getJson<AgentInstall>(`/api/agent-installs/${currentInstall.id}`)
        .then((response) => {
          setCurrentInstall(response.data);
          void refreshInstalls();
        })
        .catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [currentInstall]);

  const copyCommand = async () => {
    await window.navigator.clipboard.writeText(command);
    toast.success(t("commandCopied"));
  };

  const startAutoInstall = async () => {
    setInstalling(true);

    try {
      const response = await postJson<AgentInstall, Record<string, unknown>>("/api/agent-installs", {
        host: sshHost,
        sshPort: Number(sshPort),
        sshUsername,
        authMethod,
        password: authMethod === "password" ? sshPassword : undefined,
        privateKey: authMethod === "privateKey" ? privateKey : undefined,
        passphrase: authMethod === "privateKey" ? passphrase : undefined,
        agentId: safeAgentId,
        agentName: safeAgentName,
        panelHost: serverHost,
        panelPort: Number(serverPort),
        tlsEnabled
      });

      setCurrentInstall(response.data);
      await refreshInstalls();
      toast.success(t("installStarted"));
    } catch {
      toast.error(t("installFailed"));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("addServer")}</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">{t("addServerTitle")}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{t("addServerSubtitle")}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setMode("auto")} type="button" variant={mode === "auto" ? "default" : "outline"}>
          {t("autoSshInstallMode")}
        </Button>
        <Button onClick={() => setMode("manual")} type="button" variant={mode === "manual" ? "default" : "outline"}>
          {t("manualInstallMode")}
        </Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                {mode === "auto" ? t("autoSshInstallMode") : t("dockerInstallMode")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-white">{t("agentInfo")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {mode === "auto" ? t("autoInstallHint") : t("systemdHint")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">{t("serverAddress")}</span>
                <Input
                  onChange={(event) => setServerHost(event.target.value)}
                  placeholder="192.168.1.13"
                  value={serverHost}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">{t("serverPort")}</span>
                <Input onChange={(event) => setServerPort(event.target.value)} value={serverPort} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">{t("agentNameLabel")}</span>
                <Input
                  onChange={(event) => {
                    setAgentName(event.target.value);
                    setAgentId(slugify(event.target.value));
                  }}
                  value={agentName}
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">{t("agentIdLabel")}</span>
                <Input onChange={(event) => setAgentId(event.target.value)} value={agentId} />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <input
                checked={tlsEnabled}
                onChange={(event) => setTlsEnabled(event.target.checked)}
                type="checkbox"
              />
              {t("useTls")}
            </label>

            {mode === "auto" && (!serverHost.trim() || panelHostInvalid) ? (
              <div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {t("panelHostReachabilityWarning")}
              </div>
            ) : null}

            {mode === "auto" ? (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="text-sm leading-6 text-slate-400">{t("installSecurityNote")}</p>
                <p className="text-sm leading-6 text-slate-400">{t("sudoRequirement")}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">{t("sshHost")}</span>
                    <Input onChange={(event) => setSshHost(event.target.value)} value={sshHost} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">{t("sshPort")}</span>
                    <Input onChange={(event) => setSshPort(event.target.value)} value={sshPort} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">{t("sshUsername")}</span>
                    <Input onChange={(event) => setSshUsername(event.target.value)} value={sshUsername} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">{t("authMethod")}</span>
                    <Select onChange={(event) => setAuthMethod(event.target.value as AuthMethod)} value={authMethod}>
                      <option value="password">{t("passwordAuth")}</option>
                      <option value="privateKey">{t("privateKeyAuth")}</option>
                    </Select>
                  </label>
                </div>

                {authMethod === "password" ? (
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-300">{t("sshPassword")}</span>
                    <Input onChange={(event) => setSshPassword(event.target.value)} type="password" value={sshPassword} />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm text-slate-300">{t("sshPrivateKey")}</span>
                      <textarea
                        className="min-h-40 w-full rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-300/30"
                        onChange={(event) => setPrivateKey(event.target.value)}
                        value={privateKey}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm text-slate-300">{t("sshPassphrase")}</span>
                      <Input onChange={(event) => setPassphrase(event.target.value)} type="password" value={passphrase} />
                    </label>
                  </div>
                )}

                <Button
                  disabled={installing || !sshHost.trim() || !serverHost.trim() || panelHostInvalid}
                  onClick={startAutoInstall}
                  type="button"
                >
                  {installing ? t("installingAgent") : t("startInstall")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            {mode === "auto" ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("installStatus")}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{currentInstall?.agentName ?? t("noInstalls")}</h3>
                </div>
                {currentInstall ? (
                  <div className="space-y-4">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                        statusTone(currentInstall.status)
                      )}
                    >
                      {t(currentInstall.status)}
                    </span>
                    <pre className="max-h-[30rem] overflow-auto rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-xs leading-6 text-cyan-50">
                      <code>{currentInstall.installLog || t("noInstallLogs")}</code>
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-slate-400">{t("autoInstallHint")}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("installCommand")}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{t("dockerInstallMode")}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{t("installCommandHint")}</p>
                  </div>
                  <Button onClick={copyCommand} type="button">
                    {t("copyCommand")}
                  </Button>
                </div>
                <pre className="max-h-[32rem] overflow-auto rounded-3xl border border-white/10 bg-slate-950/80 p-5 text-xs leading-6 text-cyan-50">
                  <code>{command}</code>
                </pre>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("afterInstall")}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{t("afterInstallHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("monitoredCapabilities")}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{t("monitoredCapabilitiesHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("latestInstalls")}</p>
            {installs.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noInstalls")}</p>
            ) : (
              installs.slice(0, 5).map((install) => (
                <button
                  className="block w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
                  key={install.id}
                  onClick={() => setCurrentInstall(install)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{install.agentName}</p>
                    <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", statusTone(install.status))}>
                      {t(install.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {install.host} · {formatTimestamp(install.createdAt, language)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
