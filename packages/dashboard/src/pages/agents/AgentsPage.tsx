import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import { getJson } from "../../api/client.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { AgentStatusBadge } from "./components/AgentStatusBadge.js";
import type { AgentInfo } from "@monitor/shared";

export function AgentsPage() {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data } = useQuery({
    queryKey: ["agents", search, status],
    queryFn: () => getJson<AgentInfo[]>("/api/agents", { search, status })
  });

  const agents = data?.data ?? [];
  const columns = useMemo<Array<ColumnDef<AgentInfo>>>(
    () => [
      {
        accessorKey: "hostname",
        header: t("hostname"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.hostname}</p>
            <p className="text-xs text-slate-500">{row.original.agentId}</p>
          </div>
        )
      },
      {
        accessorKey: "status",
        header: t("status"),
        cell: ({ row }) => <AgentStatusBadge status={row.original.status} />
      },
      {
        accessorKey: "ipAddress",
        header: t("ipAddress"),
        cell: ({ row }) => row.original.ipAddress ?? "n/a"
      },
      {
        accessorKey: "kernel",
        header: t("kernel"),
        cell: ({ row }) => row.original.osInfo?.kernelVersion ?? "unknown"
      },
      {
        accessorKey: "lastHeartbeat",
        header: "Last heartbeat",
        cell: ({ row }) =>
          row.original.lastHeartbeat
            ? formatTimestamp(row.original.lastHeartbeat, language)
            : t("noHeartbeat")
      },
      {
        id: "details",
        header: "",
        cell: ({ row }) => (
          <Link
            className="inline-flex justify-end text-cyan-200 transition hover:text-white"
            to={`/agents/${row.original.agentId}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )
      }
    ],
    [language, t]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("agentsTitle")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {t("infrastructureInventory")}
          </h2>
        </div>

        <div className="grid w-full gap-3 lg:max-w-3xl lg:grid-cols-[1.4fr_0.7fr]">
          <label className="flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("filteringHint")}
              value={search}
            />
          </label>
          <Select onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="">All status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
        </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={agents} emptyMessage={t("noAgents")} />
    </div>
  );
}
