// src/pages/Contracts.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricChip } from "@/components/MetricChip";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { toast, useToast } from "@/components/ui/use-toast";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Info,
} from "lucide-react";

import { UpsellModal } from "@/components/upsell/UpsellModal";
import { CashflowHistoryTable } from "./CashflowHistoryTable";
import { useQuery } from "@tanstack/react-query";
import {
  Contract,
  getContracts,
  getCashflowForecast,
  type CashflowRow,
  CreateOrUpdateUpsellRequest,
  ContractUpsell,
  getUpsellForSalesProcess,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockContracts, mockCashflowForecast } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CashflowUpcomingTable } from "./CashflowUpcomingTable";
import { formatDateOnly } from "@/helpers/date";
import { ContractEditModal } from "@/components/contract/ContractEditModal";
import { CommentsSection } from "@/components/comments/CommentsSection";

/* ---------------- helpers ---------------- */

// add months to a YYYY-MM-DD string safely
function addMonthsIso(iso: string, m: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setMonth(dt.getMonth() + m);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(dt.getDate()).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Robustly parse either YYYY-MM-DD or full ISO datetimes and return a
// Date normalized to local start-of-day (time components zeroed).
function toDateStartOfDay(input?: string | null) {
  if (!input) return null;
  // Prefer native Date parsing which handles full ISO strings.
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // Fallback: try YYYY-MM-DD prefix
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function addMonthsDate(d: Date, months: number) {
  const dt = new Date(d.getTime());
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

// Inclusive overlap check between two closed date ranges [aStart, aEnd] and [bStart, bEnd]
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

// count calendar months overlap between [a1, a2) and [b1, b2) (end exclusive)
function monthsOverlap(a1: Date, a2: Date, b1: Date, b2: Date): number {
  const s = a1 > b1 ? a1 : b1;
  const e = a2 < b2 ? a2 : b2;
  if (e <= s) return 0;
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  // include current month if e is past the 1st
  const includeE = e.getDate() > 1 ? 1 : 0;
  return Math.max(0, months + includeE);
}

function labelFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

function euro(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

/* --------------- page ------------------- */

export default function Contracts() {
  const { enabled } = useAuthEnabled();
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );
  const [showContractEdit, setShowContractEdit] = useState(false);

  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<ContractUpsell | null>(
    null,
  );

  // Upsell for selected contract
  const { data: upsell, refetch: refetchUpsell } = useQuery({
    queryKey: ["upsell", selectedContract?.sales_process_id],
    queryFn: () =>
      selectedContract
        ? getUpsellForSalesProcess(selectedContract.sales_process_id)
        : null,
    enabled: !!selectedContract,
    select: (list) => (list && list.length > 0 ? list[0] : null),
  });

  // Contracts for table + KPIs
  const {
    data: contracts = [],
    isFetching: loadingContracts,
    isError: errorContracts,
    refetch: refetchContracts,
  } = useMockableQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  // Cashflow forecast (server-side aggregation)
  const {
    data: forecast = [],
    isFetching: loadingForecast,
    isError: errorForecast,
  } = useMockableQuery<CashflowRow[]>({
    queryKey: ["cashflow-forecast"],
    queryFn: () => getCashflowForecast(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<CashflowRow>(d),
    mockData: mockCashflowForecast as CashflowRow[],
  });

  /* ---------------- Used for Contracts Table and Monthly Cashflow Calculation  ---------------- */
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1

  /* ---------------- KPIs from contracts ---------------- */
  const totalRevenue = contracts.reduce((sum, c) => sum + c.revenue_total, 0);
  const monthlyRecurring = contracts.reduce(
    (sum, c) => sum + c.monthly_amount,
    0,
  );
  const activeContracts = contracts.length;
  const avgContractValue = activeContracts ? totalRevenue / activeContracts : 0;

  /* ---- YTD average monthly cashflow (1.1. bis jetzt), REALIZED by paid_months ---- */
  const monthsElapsedYtd = now.getMonth() + 1; // Jan..current month inclusive

  let ytdCashIn = 0;

  for (const c of contracts) {
    // contract active range
    const start = parseIso(c.start_date);
    const end = parseIso(addMonthsIso(c.start_date, c.duration_months)); // exclusive
    // overlap with current year
    const monthsActiveThisYear = monthsOverlap(start, end, startOfYear, now);
    if (monthsActiveThisYear <= 0) continue;
    // realized: use paid_months bounded by active months this year
    const paidInThisYear = Math.min(c.paid_months, monthsActiveThisYear);
    ytdCashIn += paidInThisYear * c.monthly_amount;
  }

  const avgMonthlyYtd =
    monthsElapsedYtd > 0 ? Math.round(ytdCashIn / monthsElapsedYtd) : 0;

  /* ---- Filtered Contracts for Active Contracts table ---- */
  const [dateStart, setDateStart] = useState<string>(
    startOfYear.toISOString().split("T")[0],
  );
  const [dateEnd, setDateEnd] = useState<string>(
    now.toISOString().split("T")[0],
  );

  const filteredContracts = useMemo(() => {
    let list = contracts;

    // client filter
    if (clientFilter) {
      list = list.filter((c) => String(c.client_id) === clientFilter);
    }

    // date range filter: include contracts that are active at any point
    // within the selected window (inclusive). We parse contract start and
    // end (computed by backend when available) robustly and test for
    // range overlap.
    if (dateStart || dateEnd) {
      const viewStart = toDateStartOfDay(dateStart ?? null);
      const viewEnd = toDateStartOfDay(dateEnd ?? null);

      list = list.filter((c) => {
        const cStart = toDateStartOfDay(c.start_date as string | null);
        // prefer server-provided computed end date if present
        const endFromServer = c.end_date_computed ?? undefined;
        let cEnd = endFromServer ? toDateStartOfDay(endFromServer) : null;

        if (!cStart) return false; // contract without start - skip

        if (!cEnd) {
          // derive end from duration_months if server didn't provide an end
          if (typeof c.duration_months === "number") {
            cEnd = addMonthsDate(cStart, c.duration_months);
            // normalize derived end to start-of-day as well
            cEnd = new Date(
              cEnd.getFullYear(),
              cEnd.getMonth(),
              cEnd.getDate(),
            );
          } else {
            // no end information -> treat as open-ended (far future)
            cEnd = new Date(8640000000000000);
          }
        }

        // If either view boundary is missing, treat the missing one as
        // - start missing -> very old; end missing -> very far future.
        const vs = viewStart ?? new Date(-8640000000000000);
        const ve = viewEnd ?? new Date(8640000000000000);

        return rangesOverlap(cStart, cEnd, vs, ve);
      });
    }

    return list;
  }, [contracts, clientFilter, dateStart, dateEnd]);

  /* ----------------- Pagination ---------------- */
  const [page, setPage] = useState(1);
  const pageSize = 10; // contracts per page
  const totalPages = Math.ceil(filteredContracts.length / pageSize);

  const paginatedContracts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, page]);

  /* ---------------- Effects ---------------- */
  // Auto-open contract based on URL
  useEffect(() => {
    const openParam = searchParams.get("open");
    const salesProcessParam = searchParams.get("sales_process");

    // If a sales_process param is provided, prefer opening the contract
    // that references that sales_process_id. If the contract is currently
    // filtered out by the date window, widen the date window to include
    // the contract's start..end range so it becomes visible.
    if (salesProcessParam) {
      const spId = Number(salesProcessParam);
      if (!Number.isNaN(spId)) {
        const match = contracts.find((c) => c.sales_process_id === spId);
        if (match) {
          // compute contract visible window
          const cStart = toDateStartOfDay(match.start_date as string | null);
          const cEndFromServer = match.end_date_computed ?? undefined;
          const cEnd = cEndFromServer
            ? toDateStartOfDay(cEndFromServer)
            : addMonthsDate(cStart ?? new Date(), match.duration_months ?? 0);

          // If contract not currently within date range, adjust filters
          const viewStart = toDateStartOfDay(dateStart ?? null);
          const viewEnd = toDateStartOfDay(dateEnd ?? null);

          const needsExpand =
            (cStart && viewStart && cStart < viewStart) ||
            (cEnd && viewEnd && cEnd > viewEnd) ||
            (!viewStart && cStart) ||
            (!viewEnd && cEnd);

          if (needsExpand) {
            if (cStart) setDateStart(cStart.toISOString().split("T")[0]);
            if (cEnd) setDateEnd(cEnd.toISOString().split("T")[0]);
          }

          // Make sure the client filter is set so the table shows the matching client
          if (String(match.client_id) !== clientFilter) {
            // navigate to the same route but with client param set (this also updates searchParams)
            const params = new URLSearchParams(
              Array.from(searchParams.entries()),
            );
            params.set("client", String(match.client_id));
            params.set("open", "1");
            params.set("sales_process", String(spId));
            // replace history so it's seamless
            navigate(
              { pathname: "/contracts", search: params.toString() },
              { replace: true },
            );
            // selectedContract will be set by the effect below after filters recompute
            return;
          }

          // If client filter matches or was already correct, open the contract after filters run
          setSelectedContract(match);
          return;
        }
      }
    }

    if (openParam && filteredContracts.length > 0) {
      // automatically open the first contract for that client
      setSelectedContract(filteredContracts[0]);
    }
  }, [searchParams, filteredContracts]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [dateStart, dateEnd, clientFilter]);

  if (loadingContracts && contracts.length === 0) {
    return <div className="p-6">Lade Verträge…</div>;
  }
  if (errorContracts) {
    return (
      <div className="p-6 text-red-500">Fehler beim Laden der Verträge.</div>
    );
  }

  /* ---- Next 3 months (CONFIRMED ONLY) ---- */
  const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}`;

  const futureMonths = (forecast ?? [])
    .filter((r) => r.month >= nowYm) // keep current & future months
    .sort((a, b) => a.month.localeCompare(b.month));

  const next3 = futureMonths.slice(0, 3);

  const next3Display = next3.map((r) => {
    const confirmed = Math.round(r.confirmed ?? 0);
    // Cashflow KPI should use confirmed only (no pipeline)
    const total = confirmed;

    return {
      ym: r.month,
      label: labelFromYm(r.month),
      confirmed,
      potential: Math.round(r.potential ?? 0), // kept for popover breakdown if desired
      total,
    };
  });

  const avgNext3 =
    next3Display.length > 0
      ? Math.round(
          next3Display.reduce((s, r) => s + r.total, 0) / next3Display.length,
        )
      : 0;

  /* ----------------- Render ----------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Verträge & Cashflow
          </h1>
          <p className="text-muted-foreground">
            Verträge verfolgen und Umsatzprognosen
          </p>
        </div>
      </div>

      {/* KPI chips inline (wrap to next line, no card row) */}
      <div className="flex flex-wrap items-stretch gap-3">
        <MetricChip
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={euro(totalRevenue)}
          label="Gesamter Vertragswert"
          popover={
            `Summe der revenue_total über alle aktiven Verträge\n` +
            `= ${
              contracts.map((c) => euro(c.revenue_total)).join(" + ") || "0"
            }\n` +
            `= ${euro(totalRevenue)}`
          }
        />

        <MetricChip
          icon={<FileText className="w-4 h-4" />}
          iconBg="bg-warning/10 text-warning"
          value={String(activeContracts)}
          label="Aktive Verträge"
          popover={`Anzahl aktiver Verträge = ${activeContracts}`}
        />

        <MetricChip
          icon={<Users className="w-4 h-4" />}
          iconBg="bg-accent/20 text-accent-foreground"
          value={euro(Math.round(avgContractValue))}
          label="Ø Vertragswert"
          popover={
            `Ø Vertragswert = Gesamt-Vertragswert / Anzahl Verträge\n` +
            `= ${euro(totalRevenue)} / ${activeContracts || 1}\n` +
            `= ${euro(Math.round(avgContractValue))}`
          }
        />

        <MetricChip
          icon={<Calendar className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={euro(avgMonthlyYtd)}
          label="Ø monatlicher Cashflow YTD"
          popover={
            `Zeitraum: 01.01.–heute (${monthsElapsedYtd} Monate)\n` +
            `YTD Cash-In (realisiert) ≈ Σ(min(paid_months, Monate aktiv in ${now.getFullYear()}) × monthly_amount)\n` +
            `= ${
              contracts.length
                ? contracts
                    .map((c) => {
                      const start = parseIso(c.start_date);
                      const end = parseIso(
                        addMonthsIso(c.start_date, c.duration_months),
                      );
                      const monthsActiveThisYear = monthsOverlap(
                        start,
                        end,
                        new Date(now.getFullYear(), 0, 1),
                        now,
                      );
                      const paidInThisYear = Math.min(
                        c.paid_months,
                        monthsActiveThisYear,
                      );
                      return `${paidInThisYear}×${euro(c.monthly_amount)}`;
                    })
                    .join(" + ")
                : "0"
            }\n` +
            `= ${euro(ytdCashIn)}\n` +
            `Ø/Monat YTD = ${euro(ytdCashIn)} / ${monthsElapsedYtd} = ${euro(
              avgMonthlyYtd,
            )}`
          }
        />

        <MetricChip
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-primary/10 text-primary"
          value={next3Display.length ? euro(avgNext3) : "–"}
          label="Ø bestätigter Cashflow/Monat, nächste 3"
          popover={
            next3Display.length
              ? `Ø aus bestätigten Cashflows (ohne Potenzial)\n` +
                next3Display
                  .map((r) => `${r.label}: ${euro(r.confirmed)}`)
                  .join("\n") +
                `\nØ der nächsten 3 = (${next3Display
                  .map((r) => euro(r.confirmed))
                  .join(" + ")}) / ${next3Display.length} = ${euro(avgNext3)}`
              : "Keine Forecast-Daten für die nächsten 3 Monate."
          }
        />
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Aktive Verträge
            </CardTitle>

            {/* DATE RANGE FILTER */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                placeholder="Start"
              />
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                placeholder="Ende"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>Laufzeit</TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Zahlungsfrequenz</TableHead>
                <TableHead>Fortschritt</TableHead>
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContracts.map((contract) => {
                const progressPercent =
                  (contract.paid_months / contract.duration_months) * 100;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.client_name}
                    </TableCell>
                    <TableCell>
                      {contract.start_date
                        ? formatDateOnly(contract.start_date)
                        : "–"}
                    </TableCell>
                    <TableCell>{contract.duration_months} Monate</TableCell>
                    <TableCell>
                      €{contract.revenue_total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {contract.payment_frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {contract.paid_months}/{contract.duration_months}{" "}
                          Monate
                          {contract.next_due_date
                            ? ` • Nächste: ${formatDateOnly(
                                contract.next_due_date,
                              )}`
                            : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Vertrag anzeigen
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-muted-foreground">
              Seite {totalPages === 0 ? 0 : page} von {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Zurück
              </button>

              <button
                className="px-3 py-1 border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Weiter
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cashflow Entries & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashflowHistoryTable />
        <CashflowUpcomingTable />
      </div>
      {/* ✅ Contract Detail Drawer */}
      <Sheet
        open={!!selectedContract}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedContract(null);
            // clear client + open params so main list shows again
            navigate("/contracts");
          }
        }}
      >
        <SheetContent className="w-[600px] sm:max-w-full overflow-y-auto">
          {selectedContract && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Vertrag mit {selectedContract.client_name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Laufzeit
                  </h3>
                  <p>{selectedContract.duration_months} Monate</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Startdatum
                  </h3>
                  <p>
                    {selectedContract.start_date
                      ? formatDateOnly(selectedContract.start_date)
                      : "–"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Zahlungsfrequenz
                  </h3>
                  <Badge variant="outline">
                    {selectedContract.payment_frequency}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Umsatz
                  </h3>
                  <p>€{selectedContract.revenue_total.toLocaleString()}</p>
                </div>
                {/* ---------------- Edit Contract Button ---------------- */}
                <button
                  className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  onClick={() => setShowContractEdit(true)}
                >
                  Vertragsdetails bearbeiten
                </button>

                {/* ------------- CashflowEntriesTable --------------*/}
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Zahlungsverlauf</h3>
                  <CashflowHistoryTable contractId={selectedContract.id} />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Prognose</h3>
                <CashflowUpcomingTable contractId={selectedContract.id} />{" "}
              </div>
              {/* ---------------- Upsell Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upsell / Vertragsverlängerung
                </h3>

                {/* If upsell exists → show card */}
                {upsell && (
                  <div
                    className="p-3 mt-4 border rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setEditingUpsell(upsell); // upsell (of type ContractUpsell)
                      setShowUpsellModal(true);
                    }}
                  >
                    {/* If result is verlängerung → show contract details */}
                    {upsell.upsell_result === "verlaengerung" ? (
                      <div className="space-y-1">
                        <div className="font-medium text-green-600">
                          Ergebnis: Vertragsverlängerung
                        </div>

                        {upsell.contract_start_date && (
                          <div className="text-sm">
                            Neuer Vertrag ab:{" "}
                            {formatDateOnly(upsell.contract_start_date)}
                          </div>
                        )}

                        {upsell.contract_duration_months && (
                          <div className="text-sm">
                            Dauer: {upsell.contract_duration_months} Monate
                          </div>
                        )}

                        {upsell.contract_frequency && (
                          <div className="text-sm">
                            Zahlungsfrequenz: {upsell.contract_frequency}
                          </div>
                        )}

                        {upsell.upsell_revenue && (
                          <div className="text-sm">
                            Umsatz: €{upsell.upsell_revenue.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Default: show talk date + status */
                      <div>
                        <div className="font-medium">
                          Upsellgespräch:{" "}
                          {upsell.upsell_date
                            ? formatDateOnly(upsell.upsell_date)
                            : "–"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status: {upsell.upsell_result ?? "offen"}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If no upsell exists → show button */}
                {!upsell && (
                  <button
                    onClick={() => {
                      setEditingUpsell(null);
                      setShowUpsellModal(true);
                    }}
                    className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    Upsell planen
                  </button>
                )}
              </div>

              {/* ---------------- Comments Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <CommentsSection
                  entityType="contract"
                  entityId={selectedContract.id}
                  maxHeight="250px"
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {showUpsellModal && (
        <UpsellModal
          contract={selectedContract}
          upsell={editingUpsell}
          onClose={() => setShowUpsellModal(false)}
          onSaved={() => {
            setShowUpsellModal(false);
            refetchUpsell(); // or invalidateQueries()
          }}
        />
      )}
      {showContractEdit && (
        <ContractEditModal
          contract={selectedContract}
          onClose={() => setShowContractEdit(false)}
          onSaved={() => {
            setShowContractEdit(false);

            toast({
              title: "Vertrag gespeichert",
              description: "Die Änderungen wurden erfolgreich gespeichert.",
            });

            refetchContracts().then((result) => {
              // Get fresh contract from server
              const updated = result.data?.find(
                (c) => c.id === selectedContract?.id,
              );
              if (updated) {
                setSelectedContract(updated); //  refreshes the drawer details
              }
            });

            queryClient.invalidateQueries({ queryKey: ["cashflow-history"] });
            queryClient.invalidateQueries({ queryKey: ["cashflow-forecast"] });
          }}
        />
      )}
    </div>
  );
}
