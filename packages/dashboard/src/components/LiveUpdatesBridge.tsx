import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useLanguage } from "../context/LanguageContext.js";
import { useWebSocket } from "../hooks/useWebSocket.js";

interface LiveMessage {
  type:
    | "metric"
    | "event"
    | "alert"
    | "sshd-audit"
    | "port-scan"
    | "firewall-audit"
    | "hardening-report"
    | "login-activity"
    | "summary";
  data: unknown;
}

interface AlertPayload {
  id?: number;
}

function extractAgentId(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return undefined;
  }

  const agentId = (data as { agentId?: unknown }).agentId;
  return typeof agentId === "string" && agentId.length > 0 ? agentId : undefined;
}

export function LiveUpdatesBridge() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const seenAlertIdsRef = useRef(new Set<number>());

  useWebSocket((payload) => {
    const message = payload as LiveMessage;
    window.dispatchEvent(new CustomEvent("monitor-ws", { detail: message }));
    const agentId = extractAgentId(message.data);

    if (message.type === "metric") {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent", agentId] : ["agent"] });
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-metrics", agentId] : ["agent-metrics"] });
      return;
    }

    if (message.type === "event") {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-events", agentId] : ["agent-events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      return;
    }

    if (message.type === "alert") {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });

      const alert = message.data as AlertPayload;

      if (typeof alert.id === "number" && !seenAlertIdsRef.current.has(alert.id)) {
        seenAlertIdsRef.current.add(alert.id);

        if (seenAlertIdsRef.current.size > 200) {
          const oldestSeenAlertId = seenAlertIdsRef.current.values().next().value;

          if (typeof oldestSeenAlertId === "number") {
            seenAlertIdsRef.current.delete(oldestSeenAlertId);
          }
        }

        toast.error(t("newAlertReceived"));
      }

      return;
    }

    if (message.type === "sshd-audit") {
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-sshd-audit", agentId] : ["agent-sshd-audit"] });
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-security", agentId] : ["agent-security"] });
      void queryClient.invalidateQueries({ queryKey: ["security-overview"] });
      return;
    }

    if (message.type === "port-scan") {
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-port-scan", agentId] : ["agent-port-scan"] });
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-security", agentId] : ["agent-security"] });
      void queryClient.invalidateQueries({ queryKey: ["security-overview"] });
      return;
    }

    if (
      message.type === "firewall-audit" ||
      message.type === "hardening-report" ||
      message.type === "login-activity"
    ) {
      void queryClient.invalidateQueries({ queryKey: agentId ? ["agent-security", agentId] : ["agent-security"] });
      void queryClient.invalidateQueries({ queryKey: ["security-overview"] });
    }
  });

  return null;
}
