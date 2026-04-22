import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import { getJson } from "../../api/client.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Input } from "../../components/ui/input.js";
import { Select } from "../../components/ui/select.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatTimestamp } from "../../lib/format.js";
import { translateAgentStatus } from "../../lib/labels.js";
import { AgentStatusBadge } from "./components/AgentStatusBadge.js";
import type { AgentInfo } from "@monitor/shared";

export function AgentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
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
        cell: ({ row }) => row.original.osInfo?.kernelVersion ?? t("unknown")
      },
      {
        accessorKey: "lastHeartbeat",
        header: t("lastHeartbeat"),
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

  const syncParams = (nextSearch: string, nextStatus: string) => {
    const nextParams = new URLSearchParams();

    if (nextSearch.trim()) {
      nextParams.set("search", nextSearch.trim());
    }

    if (nextStatus) {
      nextParams.set("status", nextStatus);
    }

    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? "";
    const nextStatus = searchParams.get("status") ?? "";

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatus((current) => (current === nextStatus ? current : nextStatus));
  }, [searchParams]);

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

        <div className="grid w-full gap-3 lg:max-w-4xl lg:grid-cols-[1.4fr_0.7fr_auto]">
          <label className="flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);
                syncParams(nextSearch, status);
              }}
              placeholder={t("filteringHint")}
              value={search}
            />
          </label>
          <Select
            onChange={(event) => {
              const nextStatus = event.target.value;
              setStatus(nextStatus);
              syncParams(search, nextStatus);
            }}
            value={status}
          >
            <option value="">{t("allStatus")}</option>
            <option value="online">{translateAgentStatus("online", t)}</option>
            <option value="offline">{translateAgentStatus("offline", t)}</option>
          </Select>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/12 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/18"
            to="/agents/add"
          >
            {t("addServer")}
          </Link>
        </div>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={agents} emptyMessage={t("noAgents")} />
    </div>
  );
}
