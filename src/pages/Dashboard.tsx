import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/KPICard";
import { Badge } from "@/components/ui/badge";
import { MonthlyKPITable } from "@/components/dashboard/MonthlyKPITable";

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

import StageCard from "../components/dashboard/StageCard";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { format, startOfMonth, subMonths } from "date-fns";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    // Default to "last 3 months" = start of month 2 months ago → today.
    // Example: Mar 3 → Jan 1 .. Mar 3
    from: startOfMonth(subMonths(new Date(), 2)),
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
    queryFn: () => getContracts(),
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
  // Group ALL upsells per client (needed for renewal classification)
  const upsellByClient = groupBy(upsellsAll, (u) => u.client_id);
  const successfulRenewalByNewContractId = new Set(
    upsellsAll
      .filter(
        (u) =>
          u.upsell_result === "verlaengerung" &&
          typeof u.new_contract_id === "number",
      )
      .map((u) => u.new_contract_id as number),
  );

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

  // Abschlussquote Neukunden:
  // - Numerator: won (closed=true) with completed_at (contract made)
  // - Denominator: decided (closed true/false)
  // - Time bucketing:
  //   - wins by completed_at
  //   - losses by updated_at (fallback follow_up_date/created_at)

  const wonNewCustomerInRange = salesProcesses.filter((sp) => {
    if (sp.closed !== true) return false;
    if (!sp.completed_at) return false;
    if (isRenewalProcess(sp)) return false;
    return inRange(sp.completed_at);
  });

  const decidedNewCustomerInRange = salesProcesses.filter((sp) => {
    if (sp.closed !== true && sp.closed !== false) return false;
    // Losses should only count if a follow-up call actually happened.
    if (sp.closed === false && sp.follow_up_result !== true) return false;
    if (isRenewalProcess(sp)) return false;

    const decisionDate =
      sp.closed === true
        ? sp.completed_at
        : (sp.updated_at ?? sp.follow_up_date ?? sp.created_at ?? null);
    return inRange(decisionDate);
  });

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

  // "Aktive Verträge" KPI = contracts that have not yet ended (end >= today),
  // regardless of the selected date range. This matches the Contracts page chip.
  const activeContracts = contracts.filter((c) => {
    const cStart = parseIsoToLocal(c.start_date);
    if (!cStart) return false;
    const endRaw = c.end_date ?? undefined;
    let cEnd = endRaw ? parseIsoToLocal(endRaw) : null;
    const durationMonths = Number(
      (c as { duration_months?: unknown }).duration_months,
    );
    if (!cEnd && Number.isFinite(durationMonths) && durationMonths > 0) {
      cEnd = addMonthsDate(cStart, durationMonths);
      cEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), cEnd.getDate());
    }
    if (!cEnd) return true; // open-ended → active
    return cEnd >= today;
  }).length;

  // Active contracts for the Dashboard KPI: respect the selected date range.
  // Semantics:
  // - Count contracts whose [start, end] period overlaps the selected window.
  // - Additionally count future-start contracts (start > viewEnd) that were
  //   created/confirmed within the selected window.
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

  const contractsInRange = contracts.filter((c) => {
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

    const created = parseIsoToLocal(c.created_at) || new Date(0);

    // If no explicit range selected, fall back to "currently active".
    if (!viewStart && !viewEnd) {
      if (cStart > today && created > today) return false;
      if (!cEnd) return true;
      return cEnd >= today;
    }

    // Require a bounded window for the "continues beyond range end" logic.
    // (Dashboard date picker always provides both, but keep this safe.)
    if (!viewStart || !viewEnd) return false;

    const overlapsWindow = cStart <= viewEnd && (!cEnd || cEnd >= viewStart);
    const isFutureStart = cStart > viewEnd;
    const createdInWindow = created >= viewStart && created <= viewEnd;

    return overlapsWindow || (isFutureStart && createdInWindow);
  });

  const contractsStartedInRange = contracts.filter((contract) =>
    inRange(contract.start_date),
  );

  const newCustomerContracts = contractsStartedInRange.filter(
    (contract) => !successfulRenewalByNewContractId.has(contract.id),
  );
  const renewalContracts = contractsStartedInRange.filter((contract) =>
    successfulRenewalByNewContractId.has(contract.id),
  );

  const newCustomerRevenue = newCustomerContracts.reduce(
    (sum, contract) => sum + (contract.revenue_total ?? 0),
    0,
  );

  const renewalRevenue = renewalContracts.reduce(
    (sum, contract) => sum + (contract.revenue_total ?? 0),
    0,
  );

  const totalRevenue = newCustomerRevenue + renewalRevenue;

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
    : (upsellAnalytics?.verlaengerungsquote ?? null);

  const renewalRate = renewalRateValue != null ? renewalRateValue + "%" : "—";

  // -----------------------------
  // RECENT ACTIVITIES (combine contracts + sales and sort by date)
  // -----------------------------
  type RecentItem = {
    id: string;
    kind: "contract" | "sales" | "upsell" | "stage";
    date: Date | null;
    label: string;
    revenue?: number | null;
    url: string;
  };

  const clientNameById = new Map(clients.map((c) => [c.id, c.name]));

  const recentUpsellItems: RecentItem[] = upsellsAll.map((u) => {
    const created = parseIsoToLocal(u.created_at);
    const updated = parseIsoToLocal(u.updated_at);
    const changedAt = updated ?? created;

    const clientName =
      clientNameById.get(u.client_id) ?? `Kunde ${u.client_id}`;

    const label =
      u.upsell_result === "verlaengerung"
        ? `Upsell abgeschlossen: Verlängerung - ${clientName}`
        : u.upsell_result === "keine_verlaengerung"
          ? `Upsell abgeschlossen: Keine Verlängerung - ${clientName}`
          : `Upsell-Gespräch geplant - ${clientName}`;

    return {
      id: `upsell-${u.id}`,
      kind: "upsell" as const,
      date: changedAt,
      label,
      revenue: u.upsell_revenue ?? null,
      url: u.sales_process_id
        ? `/contracts?client=${u.client_id}&open=1&sales_process=${u.sales_process_id}`
        : `/contracts?client=${u.client_id}&open=1`,
    };
  });

  const recentStageItems: RecentItem[] = stages.flatMap((stage) => {
    const created = parseIsoToLocal(stage.created_at ?? null);
    const updated = parseIsoToLocal(stage.updated_at ?? null);
    const changedAt = updated ?? created;

    if (!changedAt) return [];

    const wasUpdated =
      !!created && !!updated && updated.getTime() - created.getTime() > 60_000;

    return [
      {
        id: `stage-${stage.id}`,
        kind: "stage" as const,
        date: changedAt,
        label: wasUpdated
          ? `Workshop aktualisiert - ${stage.name}`
          : `Workshop erstellt - ${stage.name}`,
        revenue: null,
        url: "/stages",
      },
    ];
  });

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
    ...recentUpsellItems,
    ...recentStageItems,
  ];

  recentItems.sort((a, b) => {
    const ta = a.date ? a.date.getTime() : 0;
    const tb = b.date ? b.date.getTime() : 0;
    return tb - ta;
  });

  const recent = recentItems.slice(0, 5);

  // Popup data arrays
  const activeContractsList = contracts.filter((c) => {
    const cStart = parseIsoToLocal(c.start_date);
    if (!cStart) return false;
    const endRaw = c.end_date ?? undefined;
    let cEnd = endRaw ? parseIsoToLocal(endRaw) : null;
    const dur = Number((c as { duration_months?: unknown }).duration_months);
    if (!cEnd && Number.isFinite(dur) && dur > 0) {
      cEnd = addMonthsDate(cStart, dur);
      cEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), cEnd.getDate());
    }
    if (!cEnd) return true;
    return cEnd >= today;
  });

  const decidedUpsellsInRange = upsells.filter(
    (u) =>
      inRange(u.upsell_date) &&
      (u.upsell_result === "verlaengerung" ||
        u.upsell_result === "keine_verlaengerung"),
  );

  // For the renewalRate modal: backend already filters upsells by date range.
  // Split into renewed vs not-renewed directly from the fetched upsells.
  const renewedUpsellsInRange = upsells.filter(
    (u) => u.upsell_result === "verlaengerung",
  );
  const notRenewedUpsellsInRange = upsells.filter(
    (u) => u.upsell_result === "keine_verlaengerung",
  );

  const [revenueModal, setRevenueModal] = useState<
    "new" | "renewal" | "all" | "active" | "closing" | "renewalRate" | null
  >(null);

  // debug: show which recent items parsed to a Date
  if (typeof window !== "undefined") {
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("all")}
            >
              <KPICard
                title="Gesamtumsatz"
                value={euro(totalRevenue)}
                icon={DollarSign}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Summe der Vertragswerte von Verträgen mit Start im ausgewählten
              Zeitraum. Klicken für Details.
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("active")}
            >
              <KPICard
                title="Aktive Verträge"
                value={activeContracts}
                icon={FileText}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Anzahl heute aktiver Verträge. Klicken für Details.
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("new")}
            >
              <KPICard
                title="Umsatz durch Neukunden"
                value={euro(newCustomerRevenue)}
                icon={TrendingUp}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Vertragswert aus gewonnener Neukundenakquise im gewählten
              Zeitraum. Klicken für Details.
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("renewal")}
            >
              <KPICard
                title="Umsatz durch Verlängerungen"
                value={euro(renewalRevenue)}
                icon={TrendingUp}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Vertragswert aus erfolgreichen Verlängerungen (Upsells) im
              Zeitraum. Klicken für Details.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* KPI GRID 2 — Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("closing")}
            >
              <KPICard
                title="Abschlussquote Neukunden"
                value={closingRateNew}
                icon={Target}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Erfolgreiche Neukunden-Abschlüsse basierend auf Verkaufsprozessen
              im ausgewählten Zeitraum. Klicken für Details.
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="cursor-pointer"
              onClick={() => setRevenueModal("renewalRate")}
            >
              <KPICard
                title="Verlängerungsquote"
                value={renewalRate}
                icon={Target}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              Anteil erfolgreicher Upsells im gewählten Zeitraum. Klicken für
              Details.
            </p>
          </TooltipContent>
        </Tooltip>
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

      {/* KPI detail modals */}
      <Dialog
        open={revenueModal !== null}
        onOpenChange={(open) => !open && setRevenueModal(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {revenueModal === "new"
                ? "Umsatz durch Neukunden"
                : revenueModal === "renewal"
                  ? "Umsatz durch Verlängerungen"
                  : revenueModal === "active"
                    ? "Aktive Verträge"
                    : revenueModal === "closing"
                      ? "Abschlussquote Neukunden"
                      : revenueModal === "renewalRate"
                        ? "Verlängerungsquote"
                        : "Gesamtumsatz"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Aktive Verträge ── */}
          {revenueModal === "active" && (
            <div className="space-y-2 mt-2">
              {activeContractsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine aktiven Verträge.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                    <span>Kunde</span>
                    <span className="text-center px-3">Beginn</span>
                    <span className="text-right">Ende</span>
                  </div>
                  {activeContractsList
                    .slice()
                    .sort((a, b) => {
                      const aEnd = a.end_date
                        ? (parseIsoToLocal(a.end_date)?.getTime() ?? Infinity)
                        : Infinity;
                      const bEnd = b.end_date
                        ? (parseIsoToLocal(b.end_date)?.getTime() ?? Infinity)
                        : Infinity;
                      return aEnd - bEnd;
                    })
                    .map((c) => (
                      <div
                        key={c.id}
                        className="grid grid-cols-[1fr_auto_auto] items-center text-sm py-1 border-b last:border-0"
                      >
                        <span>{c.client_name}</span>
                        <span className="text-xs text-muted-foreground px-3">
                          {c.start_date
                            ? formatLocalDate(parseIsoToLocal(c.start_date))
                            : "—"}
                        </span>
                        <span className="text-right text-xs text-muted-foreground">
                          {c.end_date
                            ? formatLocalDate(parseIsoToLocal(c.end_date))
                            : "offen"}
                        </span>
                      </div>
                    ))}
                  <div className="text-sm font-semibold pt-2 border-t">
                    {activeContractsList.length} Verträge
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Abschlussquote Neukunden ── */}
          {revenueModal === "closing" && (
            <div className="space-y-2 mt-2">
              <p className="text-sm text-muted-foreground">
                {wonNewCustomerInRange.length} von{" "}
                {decidedNewCustomerInRange.length} entschiedenen
                Neukunden-Prozessen gewonnen.
              </p>
              {decidedNewCustomerInRange.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine entschiedenen Prozesse im gewählten Zeitraum.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                    <span>Kunde</span>
                    <span className="text-right">Ergebnis</span>
                  </div>
                  {decidedNewCustomerInRange.map((sp) => (
                    <div
                      key={sp.id}
                      className="grid grid-cols-[1fr_auto] items-center text-sm py-1 border-b last:border-0"
                    >
                      <span>{sp.client_name}</span>
                      <span
                        className={`text-right text-xs font-medium ${sp.closed === true ? "text-green-600" : "text-red-500"}`}
                      >
                        {sp.closed === true ? "Gewonnen" : "Verloren"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Verlängerungsquote ── */}
          {revenueModal === "renewalRate" && (
            <div className="space-y-2 mt-2">
              <p className="text-sm text-muted-foreground">
                {renewedUpsellsInRange.length} von{" "}
                {renewedUpsellsInRange.length + notRenewedUpsellsInRange.length}{" "}
                entschiedenen Upsells verlängert.
              </p>
              {renewedUpsellsInRange.length +
                notRenewedUpsellsInRange.length ===
              0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine entschiedenen Upsells im gewählten Zeitraum.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                    <span>Kunde</span>
                    <span className="text-right">Ergebnis</span>
                  </div>
                  {[
                    ...renewedUpsellsInRange.map((u) => ({
                      u,
                      renewed: true,
                    })),
                    ...notRenewedUpsellsInRange.map((u) => ({
                      u,
                      renewed: false,
                    })),
                  ]
                    .sort((a, b) => {
                      const aName =
                        clientNameById.get(a.u.client_id) ?? "";
                      const bName =
                        clientNameById.get(b.u.client_id) ?? "";
                      return aName.localeCompare(bName);
                    })
                    .map(({ u, renewed }) => (
                      <div
                        key={u.id}
                        className="grid grid-cols-[1fr_auto] items-center text-sm py-1 border-b last:border-0"
                      >
                        <span>
                          {clientNameById.get(u.client_id) ??
                            `Kunde ${u.client_id}`}
                        </span>
                        <span
                          className={`text-right text-xs font-medium ${renewed ? "text-green-600" : "text-red-500"}`}
                        >
                          {renewed ? "Verlängert" : "Nicht verlängert"}
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}

          {/* ── Revenue modals (new / renewal / all) ── */}
          {(revenueModal === "new" ||
            revenueModal === "renewal" ||
            revenueModal === "all") && (
            <div className="space-y-2 mt-2">
              {(revenueModal === "new"
                ? newCustomerContracts
                : revenueModal === "renewal"
                  ? renewalContracts
                  : contractsStartedInRange
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Verträge im gewählten Zeitraum.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                    <span>Kunde</span>
                    {revenueModal === "all" && (
                      <span className="text-center px-2">Art</span>
                    )}
                    <span className="text-right">Umsatz</span>
                  </div>
                  {(revenueModal === "new"
                    ? newCustomerContracts
                    : revenueModal === "renewal"
                      ? renewalContracts
                      : contractsStartedInRange
                  )
                    .sort(
                      (a, b) => (b.revenue_total ?? 0) - (a.revenue_total ?? 0),
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="grid grid-cols-[1fr_auto_auto] items-center text-sm py-1 border-b last:border-0"
                      >
                        <span>{c.client_name}</span>
                        {revenueModal === "all" && (
                          <span className="text-xs text-muted-foreground px-2">
                            {successfulRenewalByNewContractId.has(c.id)
                              ? "Verlängerung"
                              : "Neukunde"}
                          </span>
                        )}
                        <span className="text-right font-medium">
                          {euro(c.revenue_total ?? 0)}
                        </span>
                      </div>
                    ))}
                  <div className="grid grid-cols-[1fr_auto] items-center text-sm font-semibold pt-2 border-t">
                    <span>Gesamt</span>
                    <span className="text-right">
                      {euro(
                        (revenueModal === "new"
                          ? newCustomerContracts
                          : revenueModal === "renewal"
                            ? renewalContracts
                            : contractsStartedInRange
                        ).reduce((s, c) => s + (c.revenue_total ?? 0), 0),
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
