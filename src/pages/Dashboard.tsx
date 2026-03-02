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
import { format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { STAGE_LABELS } from "@/constants/stages";
import { parseIsoToLocal } from "@/helpers/date";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
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

  const { useMockData } = useAuthEnabled();

  // -----------------------------
  // DATE RANGE
  // -----------------------------
  const [range, setRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const startDateParam = range.from
    ? format(range.from, "yyyy-MM-dd")
    : undefined;
  const endDateParam = range.to ? format(range.to, "yyyy-MM-dd") : undefined;

  const inRange = (dateStr?: string | null) => {
    if (!dateStr || !range.from || !range.to) return false;
    const d = parseIsoToLocal(dateStr);
    if (!d) return false;
    return d >= range.from && d <= range.to;
  };

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
    queryKey: ["upsells", startDateParam ?? "", endDateParam ?? ""],
    queryFn: () =>
      getUpsells({
        start_date: startDateParam,
        end_date: endDateParam,
      }),
    select: asArray<ContractUpsell>,
    mockData: mockUpsells,
  });

  // Unfiltered upsells are required for correct renewal vs new-customer
  // classification (a renewal depends on historical upsells, not just those
  // inside the currently selected date range).
  const { data: upsellsAll = [] } = useMockableQuery<ContractUpsell[]>({
    queryKey: ["upsellsAll"],
    queryFn: () => getUpsells(),
    select: asArray<ContractUpsell>,
    mockData: mockUpsells,
  });

  const { data: upsellAnalytics } = useMockableQuery<UpsellAnalytics>({
    queryKey: ["upsellAnalytics", startDateParam ?? "", endDateParam ?? ""],
    queryFn: () =>
      getUpsellAnalytics({
        start_date: startDateParam,
        end_date: endDateParam,
      }),
    mockData: mockUpsellAnalytics,
  });

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
  // We align Dashboard revenue KPIs with the closing KPIs by using the
  // *decision date* of the sales process (completed_at when present, otherwise
  // the follow-up/closing call date).

  // Group ALL upsells per client (needed for renewal classification)
  const upsellByClient = groupBy(upsellsAll, (u) => u.client_id);

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

  const decisionDateForProcess = (sp: SalesProcess) =>
    sp.completed_at ??
    sp.follow_up_date ??
    sp.updated_at ??
    sp.created_at ??
    null;

  const wonNewCustomerInRange = salesProcesses.filter((sp) => {
    const isWon = sp.closed === true || sp.completed_at != null;
    if (!isWon) return false;
    if (isRenewalProcess(sp)) return false;

    const winDate = decisionDateForProcess(sp);
    return inRange(winDate);
  });

  const decidedNewCustomerInRange = salesProcesses.filter((sp) => {
    const isDecided =
      sp.completed_at != null || sp.closed === true || sp.closed === false;
    if (!isDecided) return false;
    if (isRenewalProcess(sp)) return false;

    const decisionDate = decisionDateForProcess(sp);
    return inRange(decisionDate);
  });

  const newCustomerRevenue = wonNewCustomerInRange.reduce(
    (s, sp) => s + (sp.revenue ?? 0),
    0,
  );

  const renewalRevenue = useMockData
    ? upsells
        .filter(
          (u) => u.upsell_result === "verlaengerung" && inRange(u.upsell_date),
        )
        .reduce((s, u) => s + (u.upsell_revenue ?? 0), 0)
    : (upsellAnalytics?.umsatz_sum ?? 0);

  const totalRevenue = newCustomerRevenue + renewalRevenue;

  // -----------------------------
  // KPI: ACTIVE CONTRACTS
  // -----------------------------
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function addMonthsDate(d: Date, months: number) {
    const dt = new Date(d.getTime());
    dt.setMonth(dt.getMonth() + months);
    return dt;
  }

  // Active contracts for the Dashboard KPI: respect the selected date range.
  // A contract counts as "active" if its [start, end] period overlaps the
  // selected range (inclusive). For future-start contracts we include them
  // only when they were confirmed (created_at <= today).
  const viewStart = range.from
    ? new Date(
        range.from.getFullYear(),
        range.from.getMonth(),
        range.from.getDate(),
      )
    : null;
  const viewEnd = range.to
    ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate())
    : null;

  const activeContracts = contracts.filter((c) => {
    const cStart = parseIsoToLocal(c.start_date) || new Date(0);

    const endRaw = c.end_date ?? undefined;
    let cEnd = endRaw ? parseIsoToLocal(endRaw) : null;
    const durationMonths = Number(
      (c as { duration_months?: unknown }).duration_months,
    );
    if (!cEnd && Number.isFinite(durationMonths) && durationMonths > 0) {
      cEnd = addMonthsDate(cStart, durationMonths);
      cEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), cEnd.getDate());
    }

    // If end is missing, treat as open-ended.
    // Overlap check (inclusive): [cStart, cEnd] intersects [viewStart, viewEnd]
    if (viewStart && viewEnd) {
      if (cStart > viewEnd) return false;
      if (cEnd && cEnd < viewStart) return false;
    } else if (viewStart && !viewEnd) {
      if (cEnd && cEnd < viewStart) return false;
    } else if (!viewStart && viewEnd) {
      if (cStart > viewEnd) return false;
    }

    // future-start contracts: include only if confirmed (created_at <= today)
    const created = parseIsoToLocal(c.created_at) || new Date(0);
    if (cStart > today && created > today) return false;

    return true;
  }).length;

  // -----------------------------
  // KPI: ABSCHLUSSQUOTE (NEUKUNDEN)
  // -----------------------------
  // IMPORTANT:
  // Do NOT filter by stage === "follow_up"
  // because closed/lost calls no longer have stage "follow_up".
  // A new-customer sales call is any call with a follow_up_date.

  const closingRateNew =
    decidedNewCustomerInRange.length > 0
      ? Math.round(
          (wonNewCustomerInRange.length / decidedNewCustomerInRange.length) *
            100,
        ) + "%"
      : "—";

  // -----------------------------
  // KPI: VERLÄNGERUNGSQUOTE (BESTANDSKUNDEN)
  // -----------------------------
  const renewalRateValue = useMockData
    ? (() => {
        const decided = upsells.filter(
          (u) =>
            inRange(u.upsell_date) &&
            (u.upsell_result === "verlaengerung" ||
              u.upsell_result === "keine_verlaengerung"),
        );
        const total = decided.length;
        const ok = decided.filter(
          (u) => u.upsell_result === "verlaengerung",
        ).length;
        if (total === 0) return null;
        return Math.round((1000 * ok) / total) / 10; // 1 decimal
      })()
    : (upsellAnalytics?.verlangerungsquote ?? null);

  const renewalRate = renewalRateValue != null ? renewalRateValue + "%" : "—";

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
              Anteil der entschiedenen Neukunden-Verkaufsprozesse im Zeitraum,
              die gewonnen wurden. (Entscheiddatum: completed_at, sonst Datum
              des Follow-up/Abschluss-Calls.)
            </p>
          </TooltipContent>
        </Tooltip>

        <KPICard title="Verlängerungsquote" value={renewalRate} icon={Target} />
      </div>

      {/* MONTHLY COMPARISON TABLE */}
      <MonthlyKPITable
        contracts={contracts}
        salesProcesses={salesProcesses}
        upsells={upsellsAll}
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
