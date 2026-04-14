import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useLanguage } from "../context/LanguageContext.js";
import { useWebSocket } from "../hooks/useWebSocket.js";

interface LiveMessage {
  type: "metric" | "event" | "alert" | "sshd-audit" | "summary";
  data: unknown;
}

export function LiveUpdatesBridge() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  useWebSocket((payload) => {
    const message = payload as LiveMessage;
    window.dispatchEvent(new CustomEvent("monitor-ws", { detail: message }));

    if (message.type === "metric") {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      return;
    }

    if (message.type === "event") {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      return;
    }

    if (message.type === "alert") {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.error(t("newAlertReceived"));
      return;
    }

    if (message.type === "sshd-audit") {
      void queryClient.invalidateQueries({ queryKey: ["agent-sshd-audit"] });
    }
  });

  useEffect(() => undefined, []);

  return null;
}
