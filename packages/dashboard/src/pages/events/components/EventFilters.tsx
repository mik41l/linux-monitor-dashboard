import { Input } from "../../../components/ui/input.js";
import { Select } from "../../../components/ui/select.js";

interface EventFiltersProps {
  severity: string;
  setSeverity: (value: string) => void;
  eventType: string;
  setEventType: (value: string) => void;
  agentId: string;
  setAgentId: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  agentOptions: Array<{ value: string; label: string }>;
}

export function EventFilters({
  severity,
  setSeverity,
  eventType,
  setEventType,
  agentId,
  setAgentId,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  agentOptions
}: EventFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Select onChange={(event) => setSeverity(event.target.value)} value={severity}>
        <option value="">All severity</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </Select>
      <Select onChange={(event) => setEventType(event.target.value)} value={eventType}>
        <option value="">All event types</option>
        <option value="auth.login_failed">auth.login_failed</option>
        <option value="auth.login_succeeded">auth.login_succeeded</option>
        <option value="auth.privilege_escalation">auth.privilege_escalation</option>
        <option value="auth.ssh_disconnected">auth.ssh_disconnected</option>
        <option value="system.file_changed">system.file_changed</option>
        <option value="system.service_failed">system.service_failed</option>
        <option value="network.connection_spike">network.connection_spike</option>
      </Select>
      <Select onChange={(event) => setAgentId(event.target.value)} value={agentId}>
        <option value="">All agents</option>
        {agentOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Input onChange={(event) => setDateFrom(event.target.value)} type="datetime-local" value={dateFrom} />
      <Input onChange={(event) => setDateTo(event.target.value)} type="datetime-local" value={dateTo} />
    </div>
  );
}
