import { Input } from "../../../components/ui/input.js";
import { Select } from "../../../components/ui/select.js";
import { useLanguage } from "../../../context/LanguageContext.js";

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
  const { t } = useLanguage();

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Select onChange={(event) => setSeverity(event.target.value)} value={severity}>
        <option value="">{t("allSeverity")}</option>
        <option value="info">{t("infoSeverity")}</option>
        <option value="warning">{t("warningSeverity")}</option>
        <option value="critical">{t("criticalSeverity")}</option>
      </Select>
      <Select onChange={(event) => setEventType(event.target.value)} value={eventType}>
        <option value="">{t("allEventTypes")}</option>
        <option value="auth.login_failed">auth.login_failed</option>
        <option value="auth.login_succeeded">auth.login_succeeded</option>
        <option value="auth.privilege_escalation">auth.privilege_escalation</option>
        <option value="auth.ssh_disconnected">auth.ssh_disconnected</option>
        <option value="system.file_changed">system.file_changed</option>
        <option value="system.service_failed">system.service_failed</option>
        <option value="network.connection_spike">network.connection_spike</option>
      </Select>
      <Select onChange={(event) => setAgentId(event.target.value)} value={agentId}>
        <option value="">{t("allAgentsOption")}</option>
        {agentOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Input
        aria-label={t("dateFrom")}
        onChange={(event) => setDateFrom(event.target.value)}
        type="datetime-local"
        value={dateFrom}
      />
      <Input
        aria-label={t("dateTo")}
        onChange={(event) => setDateTo(event.target.value)}
        type="datetime-local"
        value={dateTo}
      />
    </div>
  );
}
