import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { Badge } from "@/components/ui/badge";
import { MonthlyKPITable } from "@/components/MonthlyKPITable";

import {
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Target,
} from "lucide-react";

import {
  getClients,
  getContracts,
  getSalesProcesses,
  getStages,
  getUpsells,
  getUpsellAnalytics,
  type Client,
  type Contract,
  type SalesProcess,
  type Stage,
  type ContractUpsell,
  UpsellAnalytics,
} from "@/lib/api";

import {
  mockClients,
  mockContracts,
  mockSalesProcesses,
  mockStages,
  mockUpsells,
  mockUpsellAnalytics,
} from "@/lib/mockData";

import { asArray } from "@/lib/safe";
import { useMockableQuery } from "@/hooks/useMockableQuery";

import StageCard from "./StageCard";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { STAGE_LABELS } from "@/constants/stages";
import { parseIsoToLocal } from "@/helpers/date";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// small utility
const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    n,
  );

const formatLocalDate = (d?: Date | null) =>
  d ? d.toLocaleDateString("de-DE") : "–";

export default function Dashboard() {
  const navigate = useNavigate();

  // -----------------------------
  // LOAD DATA
  // -----------------------------
  const { data: clients = [] } = useMockableQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: getClients,
    select: asArray<Client>,
    mockData: mockClients,
  });

  const { data: contracts = [] } = useMockableQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  const { data: salesProcesses = [] } = useMockableQuery<SalesProcess[]>({
    queryKey: ["sales"],
    queryFn: getSalesProcesses,
    select: asArray<SalesProcess>,
    mockData: mockSalesProcesses,
  });

  const { data: stages = [] } = useMockableQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
    select: asArray<Stage>,
    mockData: mockStages,
  });

  const { data: upsells = [] } = useMockableQuery<ContractUpsell[]>({
    queryKey: ["upsells"],
    queryFn: getUpsells,
    select: asArray<ContractUpsell>,
    mockData: mockUpsells,
  });

  const { data: upsellAnalytics } = useMockableQuery<UpsellAnalytics>({
    queryKey: ["upsellAnalytics"],
    queryFn: getUpsellAnalytics,
    mockData: mockUpsellAnalytics,
  });

  // -----------------------------
  // DATE RANGE
  // -----------------------------
  const [range, setRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const inRange = (dateStr?: string | null) => {
    if (!dateStr || !range.from || !range.to) return false;
    const d = parseIsoToLocal(dateStr);
    if (!d) return false;
    return d >= range.from && d <= range.to;
  };

  // -----------------------------
  // HELPER
  // -----------------------------
  function groupBy<T, K extends string | number>(
    list: readonly T[],
    keyFn: (item: T) => K,
  ): Record<K, T[]> {
    return list.reduce(
      (acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {} as Record<K, T[]>,
    );
  }

  // -----------------------------
  // KPI: REVENUE
  // -----------------------------
  const contractsInRange = contracts.filter((c) => inRange(c.start_date));

  const totalRevenue = contractsInRange.reduce(
    (s, c) => s + (c.revenue_total ?? 0),
    0,
  );

  // Group upsells per client
  const upsellByClient = groupBy(upsells, (u) => u.client_id);

  // Correct classification logic:
  // A sales process is a RENEWAL process only if an upsell
  // happened BEFORE the follow-up call.
  function isRenewalProcess(sp: SalesProcess) {
    const clientUpsells = upsellByClient[sp.client_id] ?? [];
    if (!sp.follow_up_date) return false;

    const f = parseIsoToLocal(sp.follow_up_date);
    if (!f) return false;

    return clientUpsells.some((u) => {
      if (!u.upsell_date) return false; // ignore nulls
      const uDate = parseIsoToLocal(u.upsell_date);
      if (!uDate) return false;
      return uDate < f; // upsell happened BEFORE call
    });
  }

  // Revenue split
  const newCustomerRevenue = contractsInRange
    .filter((c) => {
      const sp = salesProcesses.find((s) => s.id === c.sales_process_id);
      if (!sp) return false;
      return !isRenewalProcess(sp); // classify by process
    })
    .reduce((s, c) => s + (c.revenue_total ?? 0), 0);

  const renewalRevenue = upsellAnalytics?.umsatz_sum ?? 0;

  // -----------------------------
  // KPI: ACTIVE CONTRACTS
  // -----------------------------
  const today = new Date();
  const activeContracts = contracts.filter((c) => {
    const start = parseIsoToLocal(c.start_date) || new Date(0);
    const end = parseIsoToLocal(c.end_date_computed ?? c.start_date) || start;
    return start <= today && end >= today;
  }).length;

  // -----------------------------
  // KPI: ABSCHLUSSQUOTE (NEUKUNDEN)
  // -----------------------------
  // IMPORTANT:
  // Do NOT filter by stage === "follow_up"
  // because closed/lost calls no longer have stage "follow_up".
  // A new-customer sales call is any call with a follow_up_date.

  const newCustomerCalls = salesProcesses.filter(
    (sp) =>
      sp.follow_up_date && inRange(sp.follow_up_date) && !isRenewalProcess(sp),
  );

  // Appeared = customer showed up
  const appearedNew = newCustomerCalls.filter(
    (sp) => sp.follow_up_result === true,
  ).length;

  // Closed = deal won
  const closedNew = newCustomerCalls.filter((sp) => sp.closed === true).length;

  const closingRateNew =
    appearedNew > 0 ? Math.round((closedNew / appearedNew) * 100) + "%" : "—";

  // -----------------------------
  // KPI: VERLÄNGERUNGSQUOTE (BESTANDSKUNDEN)
  // -----------------------------
  const renewalRate =
    upsellAnalytics?.verlangerungsquote != null
      ? upsellAnalytics.verlangerungsquote + "%"
      : "—";

  // -----------------------------
  // RECENT ACTIVITIES (combine contracts + sales and sort by date)
  // -----------------------------
  type RecentItem = {
    id: string;
    kind: "contract" | "sales";
    date: Date | null;
    label: string;
    revenue?: number | null;
    url: string;
  };

  const recentItems: RecentItem[] = [
    ...contracts.map((c) => ({
      id: `contract-${c.id}`,
      kind: "contract" as const,
      date: parseIsoToLocal(c.created_at),
      label: `Vertragsabschluss - ${c.client_name}`,
      revenue: c.revenue_total ?? 0,
      url: c.sales_process_id
        ? `/contracts?client=${c.client_id}&open=1&sales_process=${c.sales_process_id}`
        : `/contracts?client=${c.client_id}&open=1`,
    })),
    ...salesProcesses.map((s) => ({
      id: `sales-${s.id}`,
      kind: "sales" as const,
      date: parseIsoToLocal(s.created_at),
      label: `Verkaufsprozess: ${STAGE_LABELS[s.stage] ?? s.stage} - ${s.client_name}`,
      revenue: null,
      url: `/sales?sales_process=${s.id}`,
    })),
  ];

  recentItems.sort((a, b) => {
    const ta = a.date ? a.date.getTime() : 0;
    const tb = b.date ? b.date.getTime() : 0;
    return tb - ta;
  });

  const recent = recentItems.slice(0, 5);

  // debug: show which recent items parsed to a Date
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug(
      "[Dashboard] recent items:",
      recent.map((r) => ({ id: r.id, kind: r.kind, date: r.date })),
    );
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Geschäftsübersicht & KPIs</p>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Zeitraum KPIs</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <DateRangePicker value={range} onChange={setRange} />
          <p className="text-sm text-muted-foreground">
            Filter für die folgende KPI-Übersicht
          </p>
        </CardContent>
      </Card>

      {/* KPI GRID 1 — Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Gesamtumsatz"
          value={euro(totalRevenue)}
          icon={DollarSign}
        />

        <KPICard
          title="Aktive Verträge"
          value={activeContracts}
          icon={FileText}
        />

        <KPICard
          title="Umsatz durch Neukunden"
          value={euro(newCustomerRevenue)}
          icon={TrendingUp}
        />

        <KPICard
          title="Umsatz durch Verlängerungen"
          value={euro(renewalRevenue)}
          icon={TrendingUp}
        />
      </div>

      {/* KPI GRID 2 — Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <KPICard
                title="Abschlussquote Neukunden"
                value={closingRateNew}
                icon={Target}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">
              Anteil der Neukunden, die zum Zweitgespräch erschienen und danach
              einen Vertrag abgeschlossen haben.
            </p>
          </TooltipContent> 
        </Tooltip>

        <KPICard title="Verlängerungsquote" value={renewalRate} icon={Target} />
      </div>

      {/* MONTHLY COMPARISON TABLE */}
      <MonthlyKPITable
        contracts={contracts}
        salesProcesses={salesProcesses}
        upsells={upsells}
      />

      {/* SECONDARY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workshops</CardTitle>
          </CardHeader>
          <StageCard />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Kürzliche Aktivitäten
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Neueste Interaktionen
              </div>

              <div className="space-y-2">
                {recent.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-accent/30 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground min-w-[110px]">
                        {formatLocalDate(item.date)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(item.url)}
                      >
                        {item.label}
                      </Button>
                    </div>
                    {item.kind === "contract" ? (
                      <Badge className="bg-success text-success-foreground">
                        {euro(item.revenue ?? 0)}
                      </Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
