import { Badge } from "../../../components/ui/badge.js";

interface AgentStatusBadgeProps {
  status: "online" | "offline";
}

export function AgentStatusBadge({ status }: AgentStatusBadgeProps) {
  return <Badge variant={status === "online" ? "success" : "destructive"}>{status}</Badge>;
}
