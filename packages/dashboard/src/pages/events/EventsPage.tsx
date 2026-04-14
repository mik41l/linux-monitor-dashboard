import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { getJson } from "../../api/client.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Card, CardContent, CardHeader } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { EventFilters } from "./components/EventFilters.js";
import { SeverityBadge } from "./components/SeverityBadge.js";
import type { AgentInfo } from "@monitor/shared";

interface EventRecord {
  id: number;
  agentId: string;
  eventType: string;
  severity: string;
  source: string | null;
  message: string | null;
  occurredAt: string;
}

export function EventsPage() {
  const { language, t } = useLanguage();
  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");
  const [agentId, setAgentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data } = useQuery({
    queryKey: ["events", severity, eventType, agentId, dateFrom, dateTo],
    queryFn: () =>
      getJson<EventRecord[]>("/api/events", {
        severity,
        eventType,
        agentId,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
        limit: 100
      })
  });
  const { data: agentsData } = useQuery({
    queryKey: ["event-agent-options"],
    queryFn: () => getJson<AgentInfo[]>("/api/agents")
  });

  const events = data?.data ?? [];
  const columns = useMemo<Array<ColumnDef<EventRecord>>>(
    () => [
      {
        accessorKey: "eventType",
        header: t("event")
      },
      {
        accessorKey: "severity",
        header: t("severity"),
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />
      },
      {
        accessorKey: "agentId",
        header: t("agent")
      },
      {
        accessorKey: "message",
        header: t("message"),
        cell: ({ row }) => row.original.message ?? row.original.source ?? "n/a"
      },
      {
        accessorKey: "occurredAt",
        header: t("at"),
        cell: ({ row }) => formatTimestamp(row.original.occurredAt, language)
      }
    ],
    [language, t]
  );
  const agentOptions = (agentsData?.data ?? []).map((agent) => ({
    value: agent.agentId,
    label: agent.hostname
  }));

  return (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("eventsTitle")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">{t("securityEventStream")}</h2>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <EventFilters
          agentId={agentId}
          agentOptions={agentOptions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          eventType={eventType}
          setAgentId={setAgentId}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          setEventType={setEventType}
          setSeverity={setSeverity}
          severity={severity}
        />
        <DataTable columns={columns} data={events} emptyMessage={t("noEvents")} />
      </CardContent>
    </Card>
  );
}
