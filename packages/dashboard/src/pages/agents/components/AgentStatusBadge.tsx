import { Badge } from "../../../components/ui/badge.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAgentStatus } from "../../../lib/labels.js";

interface AgentStatusBadgeProps {
  status: "online" | "offline";
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  const { t } = useLanguage();

  return (
    <Badge variant={status === "online" ? "success" : "destructive"}>
      {translateAgentStatus(status, t)}
    </Badge>
  );
}
