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
  getDashboardKPIs,
  type Client,
  type Contract,
  type SalesProcess,
  type Stage,
  type ContractUpsell,
  type DashboardKPIs,
} from "@/lib/api";

import {
  mockClients,
  mockContracts,
  mockSalesProcesses,
  mockStages,
  mockUpsells,
  mockDashboardKPIs,
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
import { SALES_STAGE, STAGE_LABELS } from "@/constants/stages";
import { parseIsoToLocal } from "@/helpers/date";
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
    queryFn: () => getClients(),
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

  const { data: kpis } = useMockableQuery<DashboardKPIs>({
    queryKey: ["dashboardKPIs", startDateParam ?? "", endDateParam ?? ""],
    queryFn: () =>
      getDashboardKPIs({
        start_date: startDateParam,
        end_date: endDateParam,
      }),
    mockData: mockDashboardKPIs,
  });

  // -----------------------------
  // KPI: REVENUE
  // -----------------------------
  const newCustomerRevenue = kpis?.new_customer_revenue ?? 0;
  const renewalRevenue = kpis?.renewal_revenue ?? 0;

  // -----------------------------
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

  // Comes from backend KPI (consistent with other chips).
  const activeContracts = kpis?.active_contracts_count ?? 0;

  const contractsStartedInRange = contracts.filter((contract) =>
    inRange(contract.start_date),
  );

  // Gesamtumsatz comes from the backend KPI so it's consistent with the
  // new_customer_revenue + renewal_revenue breakdown from the same source.
  const totalRevenue = kpis?.total_revenue ?? 0;

  // -----------------------------
  // KPI: ABSCHLUSSQUOTE (NEUKUNDEN)
  // -----------------------------
  const closingRateNew =
    kpis?.closing_rate_new != null ? kpis.closing_rate_new + "%" : "—";

  // -----------------------------
  // KPI: VERLÄNGERUNGSQUOTE (BESTANDSKUNDEN)
  // -----------------------------
  const renewalRate =
    kpis?.verlaengerungsquote != null ? kpis.verlaengerungsquote + "%" : "—";

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

  const clientNameById = new Map<number, string>();
  for (const sp of salesProcesses)
    clientNameById.set(sp.client_id, sp.client_name);
  for (const c of clients) clientNameById.set(c.id, c.name);

  const recentUpsellItems: RecentItem[] = upsells.map((u) => {
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

  // For the renewalRate modal: backend already filters upsells by date range.
  // Split into renewed vs not-renewed directly from the fetched upsells.
  const renewedUpsellsInRange = upsells.filter(
    (u) => u.upsell_result === "verlaengerung",
  );
  const notRenewedUpsellsInRange = upsells.filter(
    (u) => u.upsell_result === "keine_verlaengerung",
  );

  const renewalContractIds = new Set(
    upsells
      .filter(
        (u) => u.upsell_result === "verlaengerung" && u.new_contract_id != null,
      )
      .map((u) => u.new_contract_id!),
  );

  const newCustomerContractsInRange = contractsStartedInRange.filter(
    (c) => !renewalContractIds.has(c.id),
  );

  // Won sales processes list for the closing rate modal detail view
  const wonSalesList = salesProcesses.filter(
    (sp) => sp.stage === SALES_STAGE.CLOSED,
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
          <p className="text-muted-foreground">
            Geschäftsübersicht & KPIs (abzüglich MwSt)
          </p>
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
      <MonthlyKPITable />

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
                {(kpis?.decided_new_count ?? 0) === 0
                  ? "Keine entschiedenen Verkaufsprozesse im gewählten Zeitraum."
                  : `${kpis?.won_new_count ?? 0} von ${kpis?.decided_new_count ?? 0} entschiedenen Neukunden-Prozessen gewonnen.`}
              </p>
              {wonSalesList.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground border-b pb-1 mt-3 mb-1">
                    Abgeschlossene Prozesse
                  </div>
                  {wonSalesList
                    .slice()
                    .sort((a, b) => a.client_name.localeCompare(b.client_name))
                    .map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                      >
                        <span>{sp.client_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {sp.completed_at
                            ? formatLocalDate(parseIsoToLocal(sp.completed_at))
                            : "—"}
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
                      const aName = clientNameById.get(a.u.client_id) ?? "";
                      const bName = clientNameById.get(b.u.client_id) ?? "";
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

          {/* ── Umsatz durch Verlängerungen ── */}
          {revenueModal === "renewal" && (
            <div className="space-y-2 mt-2">
              {renewedUpsellsInRange.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Verlängerungen im gewählten Zeitraum.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                    <span>Kunde</span>
                    <span className="text-right">Umsatz</span>
                  </div>
                  {renewedUpsellsInRange
                    .slice()
                    .sort(
                      (a, b) =>
                        (b.upsell_revenue ?? 0) - (a.upsell_revenue ?? 0),
                    )
                    .map((u) => (
                      <div
                        key={u.id}
                        className="grid grid-cols-[1fr_auto] items-center text-sm py-1 border-b last:border-0"
                      >
                        <span>
                          {clientNameById.get(u.client_id) ??
                            `Kunde ${u.client_id}`}
                        </span>
                        <span className="text-right font-medium">
                          {euro(u.upsell_revenue ?? 0)}
                        </span>
                      </div>
                    ))}
                  <div className="grid grid-cols-[1fr_auto] items-center text-sm font-semibold pt-2 border-t">
                    <span>Gesamt</span>
                    <span className="text-right">
                      {euro(kpis?.renewal_revenue ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Revenue modals (new / all) ── */}
          {(revenueModal === "new" || revenueModal === "all") &&
            (() => {
              const displayContracts =
                revenueModal === "new"
                  ? newCustomerContractsInRange
                  : contractsStartedInRange;
              const displayTotal =
                revenueModal === "new" ? newCustomerRevenue : totalRevenue;
              return (
                <div className="space-y-2 mt-2">
                  {displayContracts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Keine Verträge im gewählten Zeitraum.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_auto] text-xs font-medium text-muted-foreground border-b pb-1 mb-1">
                        <span>Kunde</span>
                        <span className="text-right">Umsatz</span>
                      </div>
                      {displayContracts
                        .slice()
                        .sort(
                          (a, b) =>
                            (b.revenue_total ?? 0) - (a.revenue_total ?? 0),
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            className="grid grid-cols-[1fr_auto] items-center text-sm py-1 border-b last:border-0"
                          >
                            <span>{c.client_name}</span>
                            <span className="text-right font-medium">
                              {euro(c.revenue_total ?? 0)}
                            </span>
                          </div>
                        ))}
                      <div className="grid grid-cols-[1fr_auto] items-center text-sm font-semibold pt-2 border-t">
                        <span>Gesamt</span>
                        <span className="text-right">{euro(displayTotal)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
