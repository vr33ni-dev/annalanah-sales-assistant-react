// src/pages/Contracts.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricChip } from "@/components/MetricChip";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

import { toast } from "@/components/ui/use-toast";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  X,
} from "lucide-react";

import { UpsellModal } from "@/components/upsell/UpsellModal";
import { CashflowHistoryTable } from "../components/cashflow/CashflowHistoryTable";
import {
  Contract,
  getContractById,
  getContracts,
  getCashflowForecast,
  getCashflowMetrics,
  getUpsells,
  type CashflowRow,
  type CashflowMetrics,
  getSalesProcesses,
  type SalesProcess,
  ContractUpsell,
  getUpsellForSalesProcess,
} from "@/lib/api";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import {
  mockContracts,
  mockCashflowForecast,
  mockSalesProcesses,
  mockUpsells,
} from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CashflowUpcomingTable } from "../components/cashflow/CashflowUpcomingTable";
import { formatDateOnly, formatMonthLabel, toYmdLocal } from "@/helpers/date";
import { ContractEditModal } from "@/components/contract/ContractEditModal";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

/* ---------------- helpers ---------------- */

// add months to a YYYY-MM-DD string safely
function addMonthsIso(iso: string, m: number): string {
  const datePart = iso.split("T")[0];
  const dateOnly = iso.split("T")[0];
  const [y, mo, d] = dateOnly.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setMonth(dt.getMonth() + m);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Robustly parse either YYYY-MM-DD or full ISO datetimes and return a
// Date normalized to local start-of-day (time components zeroed).
function toDateStartOfDay(input?: string | null) {
  if (!input) return null;
  // Always parse by YYYY-MM-DD prefix and construct a local Date.
  // Avoids timezone shifts caused by native Date parsing.
  const m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function addMonthsDate(d: Date, months: number) {
  const dt = new Date(d.getTime());
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

function getContractEndDate(contract: Contract) {
  const start = toDateStartOfDay(contract.start_date);
  const endFromServer = toDateStartOfDay(contract.end_date ?? null);

  if (endFromServer) return endFromServer;
  if (!start || typeof contract.duration_months !== "number") return null;

  return addMonthsDate(start, contract.duration_months);
}

function isContractExpired(contract: Contract, today: Date) {
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = getContractEndDate(contract);

  return !!end && end < current;
}

function getElapsedContractMonths(
  startDate: string | null | undefined,
  today: Date,
  durationMonths?: number | null,
) {
  const start = toDateStartOfDay(startDate);
  if (!start) return 0;

  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  if (start > current) return 0;

  let completedMonths =
    (current.getFullYear() - start.getFullYear()) * 12 +
    (current.getMonth() - start.getMonth());

  if (current.getDate() < start.getDate()) {
    completedMonths -= 1;
  }

  const currentContractMonth = Math.max(1, completedMonths + 1);

  if (typeof durationMonths === "number") {
    return Math.min(currentContractMonth, durationMonths);
  }

  return currentContractMonth;
}

function euro(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

/* --------------- page ------------------- */

export default function Contracts() {
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");
  const salesProcessParam = searchParams.get("sales_process");
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
  const [showExpiredContracts, setShowExpiredContracts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<
    "client_name" | "start_date" | "duration_months" | "progress"
  >("start_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const shouldFetchExpiredContracts =
    showExpiredContracts || !!salesProcessParam;

  // Upsell for selected contract
  const { data: upsell, refetch: refetchUpsell } = useMockableQuery<
    ContractUpsell[],
    ContractUpsell | null,
    ReturnType<typeof queryKeys.upsell>
  >({
    queryKey: queryKeys.upsell(selectedContract?.sales_process_id),
    queryFn: () =>
      selectedContract
        ? getUpsellForSalesProcess(selectedContract.sales_process_id)
        : null,
    enabled: !!selectedContract,
    select: (list) => (list && list.length > 0 ? list[0] : null),
    mockData: selectedContract
      ? mockUpsells.filter(
          (item) => item.sales_process_id === selectedContract.sales_process_id,
        )
      : [],
  });

  const { data: allUpsells = [], refetch: refetchAllUpsells } =
    useMockableQuery<ContractUpsell[]>({
      queryKey: ["upsells-all-contracts"],
      queryFn: () => getUpsells(),
      enabled: !!selectedContract,
      retry: false,
      staleTime: 5 * 60 * 1000,
      select: asArray<ContractUpsell>,
      mockData: mockUpsells,
    });

  const relatedUpsell =
    upsell ??
    (selectedContract
      ? (allUpsells.find(
          (item) =>
            item.previous_contract_id === selectedContract.id ||
            item.new_contract_id === selectedContract.id ||
            item.sales_process_id === selectedContract.sales_process_id,
        ) ?? null)
      : null);

  // Contracts for table + KPIs
  const {
    data: contracts = [],
    isFetching: loadingContracts,
    isError: errorContracts,
    refetch: refetchContracts,
  } = useMockableQuery<Contract[]>({
    queryKey: queryKeys.contractsList({
      includeExpired: shouldFetchExpiredContracts,
      compact: true,
    }),
    queryFn: () =>
      getContracts({
        includeExpired: shouldFetchExpiredContracts,
        compact: true,
      }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  const { data: selectedContractDetail } = useMockableQuery<Contract | null>({
    queryKey: selectedContract
      ? queryKeys.contract(selectedContract.id)
      : (["contract", "selected"] as const),
    queryFn: () =>
      selectedContract ? getContractById(selectedContract.id) : null,
    enabled: !!selectedContract,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (contract) => contract ?? null,
    mockData: selectedContract
      ? (mockContracts.find(
          (contract) => contract.id === selectedContract.id,
        ) ?? null)
      : null,
  });

  const drawerContract = selectedContractDetail ?? selectedContract;

  const linkedPreviousContractId =
    relatedUpsell && typeof relatedUpsell.previous_contract_id === "number"
      ? relatedUpsell.previous_contract_id
      : null;

  const linkedNewContractId =
    relatedUpsell && typeof relatedUpsell.new_contract_id === "number"
      ? relatedUpsell.new_contract_id
      : null;

  const { data: linkedPreviousContract } = useMockableQuery<Contract | null>({
    queryKey: linkedPreviousContractId
      ? queryKeys.contract(linkedPreviousContractId)
      : (["contract", "linked-previous"] as const),
    queryFn: () =>
      linkedPreviousContractId
        ? getContractById(linkedPreviousContractId)
        : null,
    enabled: !!linkedPreviousContractId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (contract) => contract ?? null,
    mockData: linkedPreviousContractId
      ? (mockContracts.find(
          (contract) => contract.id === linkedPreviousContractId,
        ) ?? null)
      : null,
  });

  const { data: linkedNewContract } = useMockableQuery<Contract | null>({
    queryKey: linkedNewContractId
      ? queryKeys.contract(linkedNewContractId)
      : (["contract", "linked-new"] as const),
    queryFn: () =>
      linkedNewContractId ? getContractById(linkedNewContractId) : null,
    enabled: !!linkedNewContractId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (contract) => contract ?? null,
    mockData: linkedNewContractId
      ? (mockContracts.find(
          (contract) => contract.id === linkedNewContractId,
        ) ?? null)
      : null,
  });

  const isUpsellSourceContract =
    !!drawerContract &&
    !!relatedUpsell &&
    (relatedUpsell.previous_contract_id == null
      ? true
      : relatedUpsell.previous_contract_id === drawerContract.id);

  const isUpsellResultContract =
    !!drawerContract &&
    !!relatedUpsell &&
    relatedUpsell.new_contract_id === drawerContract.id &&
    relatedUpsell.previous_contract_id !== drawerContract.id;

  const openLinkedContract = (contract: Contract) => {
    setSelectedContract(contract);
    navigate(
      contract.sales_process_id
        ? `/contracts?client=${contract.client_id}&open=1&sales_process=${contract.sales_process_id}`
        : `/contracts?client=${contract.client_id}&open=1`,
    );
  };

  // Cashflow forecast (server-side aggregation)
  const {
    data: forecast = [],
    isFetching: loadingForecast,
    isError: errorForecast,
  } = useMockableQuery<CashflowRow[]>({
    queryKey: queryKeys.cashflowForecast,
    queryFn: () => getCashflowForecast(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<CashflowRow>(d),
    mockData: mockCashflowForecast as CashflowRow[],
  });

  // Cashflow metrics (server-side) — avg YTD, confirmed next3, etc.
  const { data: metrics, isFetching: loadingMetrics } =
    useMockableQuery<CashflowMetrics | null>({
      queryKey: queryKeys.cashflowMetrics,
      queryFn: () => getCashflowMetrics(),
      retry: false,
      staleTime: 5 * 60 * 1000,
      select: (d) => d ?? null,
      mockData: null,
    });

  // Sales processes (used to compute earliest contact date for reset)
  const { data: salesProcesses = [] } = useMockableQuery<SalesProcess[]>({
    queryKey: queryKeys.salesProcesses,
    queryFn: getSalesProcesses,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<SalesProcess>,
    mockData: mockSalesProcesses,
  });

  /* ---------------- Used for Contracts Table and Monthly Cashflow Calculation  ---------------- */
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1

  /* ---------------- KPIs from contracts ---------------- */
  const totalRevenue = contracts.reduce((sum, c) => sum + c.revenue_total, 0);

  // "Active" = contract that has not yet ended (end >= today),
  // including future contracts that have already been confirmed
  const activeContracts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contracts.filter((c) => {
      const cStart = toDateStartOfDay(c.start_date as string | null);
      if (!cStart) return false;
      const cEnd = getContractEndDate(c);
      // Future-start contracts are considered active (no confirmation required)

      if (!cEnd) return true; // open-ended → active
      return cEnd >= today; // not yet ended (includes future starts)
    });
  }, [contracts]);

  const activeCount = activeContracts.length;
  const avgContractValue = activeCount ? totalRevenue / activeCount : 0;

  /* ---- YTD average monthly cashflow (1.1. bis jetzt) — use metrics if available ---- */
  const monthsElapsedYtd = now.getMonth() + 1; // Jan..current month inclusive
  const avgMonthlyYtd = metrics?.avg_monthly_ytd ?? 0;
  const ytdPaidAmountDisplay = metrics?.ytd_paid_amount ?? 0;

  /* ---- Filtered Contracts for Active Contracts table ---- */
  const [dateStart, setDateStart] = useState<string>(toYmdLocal(startOfYear));
  const [dateEnd, setDateEnd] = useState<string>(toYmdLocal(now));

  const filteredContracts = useMemo(() => {
    let list = contracts;

    // client filter
    if (clientFilter) {
      list = list.filter((c) => String(c.client_id) === clientFilter);
    }

    // date range filter (Active Contracts table semantics):
    // - Include contracts whose [start, end] period overlaps the selected window.
    // - Additionally include future-start contracts (start > viewEnd) that were
    //   created/confirmed within the selected window.
    // Only apply when BOTH bounds are set. If either input is cleared, show all.
    if (dateStart && dateEnd) {
      const viewStart = toDateStartOfDay(dateStart ?? null);
      const viewEnd = toDateStartOfDay(dateEnd ?? null);

      list = list.filter((c) => {
        const cStart = toDateStartOfDay(c.start_date as string | null);
        const endFromServer = c.end_date ?? undefined;
        let cEnd = endFromServer ? toDateStartOfDay(endFromServer) : null;

        if (!cStart) return false;

        if (!cEnd) {
          if (typeof c.duration_months === "number") {
            cEnd = addMonthsDate(cStart, c.duration_months);
            cEnd = new Date(
              cEnd.getFullYear(),
              cEnd.getMonth(),
              cEnd.getDate(),
            );
          } else {
            cEnd = null; // open-ended
          }
        }

        // This logic requires a bounded, parseable window.
        // If parsing fails, don't hide everything.
        if (!viewStart || !viewEnd) return true;

        const created = toDateStartOfDay((c as Contract).created_at ?? null);

        const overlapsWindow =
          cStart <= viewEnd && (!cEnd || cEnd >= viewStart);

        const isFutureStart = cStart > viewEnd;
        const createdInWindow =
          !!created && created >= viewStart && created <= viewEnd;
        // Future-start contracts that are still active (end >= viewEnd / today)
        // must always appear in the table so the count matches the metric chip.
        const isFutureActive = isFutureStart && (!cEnd || cEnd >= viewEnd);

        return (
          overlapsWindow || (isFutureStart && createdInWindow) || isFutureActive
        );
      });
    }

    if (!showExpiredContracts) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter((contract) => !isContractExpired(contract, today));
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) =>
        (c.client_name || "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [
    contracts,
    clientFilter,
    dateEnd,
    dateStart,
    showExpiredContracts,
    searchTerm,
  ]);

  const sortedContracts = useMemo(() => {
    const sortNow = new Date();

    return [...filteredContracts].sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;

      if (sortField === "client_name") {
        return (
          (a.client_name ?? "").localeCompare(b.client_name ?? "", "de") *
          direction
        );
      }

      if (sortField === "duration_months") {
        return (
          ((a.duration_months ?? 0) - (b.duration_months ?? 0)) * direction
        );
      }

      if (sortField === "progress") {
        const aProgress =
          a.duration_months > 0
            ? getElapsedContractMonths(
                a.start_date,
                sortNow,
                a.duration_months,
              ) / a.duration_months
            : 0;
        const bProgress =
          b.duration_months > 0
            ? getElapsedContractMonths(
                b.start_date,
                sortNow,
                b.duration_months,
              ) / b.duration_months
            : 0;
        return (aProgress - bProgress) * direction;
      }

      const aStart =
        toDateStartOfDay(a.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bStart =
        toDateStartOfDay(b.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;

      return (aStart - bStart) * direction;
    });
  }, [filteredContracts, sortField, sortOrder]);

  const onSortBy = (
    field: "client_name" | "start_date" | "duration_months" | "progress",
  ) => {
    if (sortField === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortOrder(field === "start_date" ? "desc" : "asc");
  };

  /* ----------------- Pagination ---------------- */
  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedContracts,
  } = usePagination(sortedContracts, 10);

  /* ---------------- Effects ---------------- */
  // Auto-open contract based on URL
  useEffect(() => {
    const openParam = searchParams.get("open");

    if (salesProcessParam) {
      const spId = Number(salesProcessParam);
      if (!Number.isNaN(spId)) {
        const match = contracts.find((c) => c.sales_process_id === spId);
        if (match) {
          const cStart = toDateStartOfDay(match.start_date as string | null);
          const cEndFromServer = match.end_date ?? undefined;
          const cEnd = cEndFromServer
            ? toDateStartOfDay(cEndFromServer)
            : addMonthsDate(cStart ?? new Date(), match.duration_months ?? 0);

          const viewStart = toDateStartOfDay(dateStart ?? null);
          const viewEnd = toDateStartOfDay(dateEnd ?? null);

          const needsExpand =
            (cStart && viewStart && cStart < viewStart) ||
            (cEnd && viewEnd && cEnd > viewEnd) ||
            (!viewStart && cStart) ||
            (!viewEnd && cEnd);

          if (needsExpand) {
            if (cStart) setDateStart(toYmdLocal(cStart));
            if (cEnd) setDateEnd(toYmdLocal(cEnd));
          }

          if (String(match.client_id) !== clientFilter) {
            const params = new URLSearchParams(
              Array.from(searchParams.entries()),
            );
            params.set("client", String(match.client_id));
            params.set("open", "1");
            params.set("sales_process", String(spId));
            navigate(
              { pathname: "/contracts", search: params.toString() },
              { replace: true },
            );
            return;
          }

          setSelectedContract(match);
          return;
        }
      }
    }

    if (openParam && filteredContracts.length > 0) {
      setSelectedContract(filteredContracts[0]);
    }
  }, [
    clientFilter,
    contracts,
    dateEnd,
    dateStart,
    filteredContracts,
    navigate,
    salesProcessParam,
    searchParams,
  ]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [
    dateStart,
    dateEnd,
    clientFilter,
    showExpiredContracts,
    sortField,
    sortOrder,
    searchTerm,
    setPage,
  ]);

  // Ensure the dateEnd filter at least reaches the latest contract end date,
  // but only when the end date is not set (empty). We intentionally avoid
  // touching the default (today) so the default timeframe remains 01.01.–today.
  useEffect(() => {
    if (!contracts || contracts.length === 0) return;

    // Only auto-expand when `dateEnd` is empty (i.e. user hasn't chosen an end)
    if (dateEnd) return;

    let maxDate: Date | null = null;
    for (const c of contracts) {
      // prefer server-provided computed end date
      const endFromServer = (c as Contract).end_date ?? null;
      let e: Date | null = null;
      if (endFromServer) e = toDateStartOfDay(endFromServer);
      else if (c.start_date && typeof c.duration_months === "number")
        e = toDateStartOfDay(addMonthsIso(c.start_date, c.duration_months));

      if (!e) continue;
      if (!maxDate || e > maxDate) maxDate = e;
    }

    if (maxDate) {
      const currentEnd = toDateStartOfDay(dateEnd ?? null);
      if (!currentEnd || maxDate > currentEnd) {
        setDateEnd(toYmdLocal(maxDate));
      }
    }
  }, [contracts, dateEnd]);

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

  const next3MonthKeys = Array.from({ length: 3 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

  // If server metrics available, prefer them; else compute from `forecast`
  const next3FromMetrics =
    metrics?.confirmed_next3?.map((m) => ({
      month: m.month,
      confirmed: Math.round(m.confirmed ?? 0),
      potential: 0,
    })) ?? null;

  const next3FromForecast = (forecast ?? [])
    .filter((r) => r.month >= nowYm) // keep current & future months
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(0, 3)
    .map((r) => ({
      month: r.month,
      confirmed: Math.round(r.confirmed ?? 0),
      potential: Math.round(r.potential ?? 0),
    }));

  const next3Data =
    next3FromMetrics ?? (next3FromForecast.length > 0 ? next3FromForecast : []);

  const next3Display = next3Data.map((r) => {
    const total = r.confirmed; // confirmed-only KPI
    return {
      ym: r.month,
      label: formatMonthLabel(r.month),
      confirmed: r.confirmed,
      potential: r.potential,
      total,
    };
  });

  const avgNext3 =
    next3Display.length > 0
      ? Math.round(
          next3Display.reduce((s, r) => s + r.total, 0) / next3Display.length,
        )
      : (metrics?.avg_confirmed_next3 ?? 0);

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
          popover={`Summe der Vertragswerte aller aktiven Verträge`}
        />

        <MetricChip
          icon={<FileText className="w-4 h-4" />}
          iconBg="bg-warning/10 text-warning"
          value={String(activeCount)}
          label="Aktive Verträge"
          popover={`Anzahl heute aktiver Verträge = ${activeCount}`}
        />

        <MetricChip
          icon={<Users className="w-4 h-4" />}
          iconBg="bg-accent/20 text-accent-foreground"
          value={euro(Math.round(avgContractValue))}
          label="Ø Vertragswert"
          popover={
            `Ø Vertragswert = Gesamt-Vertragswert / Anzahl Verträge\n` +
            `= ${euro(totalRevenue)} / ${activeCount || 1}\n` +
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
            `YTD Cashflow: ${euro(ytdPaidAmountDisplay)}\n` +
            `Ø pro Monat: ${euro(avgMonthlyYtd)}`
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
        <CardHeader className="space-y-6">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Verträge
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* DATE RANGE FILTER */}
              <div className="flex items-center gap-2">
                <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={showExpiredContracts}
                    onChange={(e) => setShowExpiredContracts(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Abgelaufene Verträge anzeigen
                </label>
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
                <button
                  type="button"
                  title="Filter zurücksetzen – alle Verträge anzeigen"
                  onClick={() => {
                    // Reset to range: earliest contact (fallback: earliest contract start)
                    // → today. This keeps the active-contract filter meaningful.
                    const defaultStart = toYmdLocal(startOfYear);
                    const defaultEnd = toYmdLocal(new Date());

                    // earliest initial_contact_date from sales processes
                    let earliestContact: string | null = null;
                    for (const sp of salesProcesses) {
                      if (!sp.initial_contact_date) continue;
                      const d = sp.initial_contact_date.split("T")[0];
                      earliestContact =
                        !earliestContact || d < earliestContact
                          ? d
                          : earliestContact;
                    }

                    // fallback to earliest contract start_date
                    if (!earliestContact) {
                      earliestContact = contracts.reduce<string | null>(
                        (min, c) => {
                          if (!c.start_date) return min;
                          const sd = c.start_date.split("T")[0];
                          return !min || sd < min ? sd : min;
                        },
                        null,
                      );
                    }

                    setDateStart(earliestContact ?? defaultStart);
                    setDateEnd(defaultEnd);
                  }}
                  className="ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Kundensuche"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => onSortBy("client_name")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "client_name" && sortOrder === "asc"
                        ? "Nach Kunde absteigend sortieren"
                        : "Nach Kunde aufsteigend sortieren"
                    }
                  >
                    Kunde
                    {sortField === "client_name" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => onSortBy("start_date")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "start_date" && sortOrder === "asc"
                        ? "Nach Startdatum absteigend sortieren"
                        : "Nach Startdatum aufsteigend sortieren"
                    }
                  >
                    Startdatum
                    {sortField === "start_date" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => onSortBy("duration_months")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "duration_months" && sortOrder === "asc"
                        ? "Nach Laufzeit absteigend sortieren"
                        : "Nach Laufzeit aufsteigend sortieren"
                    }
                  >
                    Laufzeit
                    {sortField === "duration_months" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Zahlungsfrequenz</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => onSortBy("progress")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "progress" && sortOrder === "asc"
                        ? "Nach Fortschritt absteigend sortieren"
                        : "Nach Fortschritt aufsteigend sortieren"
                    }
                  >
                    Fortschritt
                    {sortField === "progress" ? (
                      sortOrder === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContracts.map((contract) => {
                const elapsedMonths = getElapsedContractMonths(
                  contract.start_date,
                  now,
                  contract.duration_months,
                );
                const contractExpired = isContractExpired(contract, now);
                const progressPercent =
                  contract.duration_months > 0
                    ? (elapsedMonths / contract.duration_months) * 100
                    : 0;
                return (
                  <TableRow
                    key={contract.id}
                    className={cn(
                      contractExpired &&
                        "bg-muted/20 text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{contract.client_name}</span>
                        {contractExpired && (
                          <Badge variant="secondary">Abgelaufen</Badge>
                        )}
                      </div>
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
                        <Progress
                          value={progressPercent}
                          className={cn("h-2", contractExpired && "bg-muted")}
                          indicatorClassName={
                            contractExpired ? "bg-slate-400" : undefined
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          {elapsedMonths}/{contract.duration_months} Monate
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
                        className={cn(
                          "text-sm hover:underline",
                          contractExpired
                            ? "text-muted-foreground"
                            : "text-blue-600",
                        )}
                      >
                        Vertrag anzeigen
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {sortedContracts.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {paginatedContracts.length} von {sortedContracts.length}{" "}
                Einträgen
              </span>
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
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
          {drawerContract && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Vertrag mit {drawerContract.client_name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Laufzeit
                  </h3>
                  <p>{drawerContract.duration_months} Monate</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Startdatum
                  </h3>
                  <p>
                    {drawerContract.start_date
                      ? formatDateOnly(drawerContract.start_date)
                      : "–"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Zahlungsfrequenz
                  </h3>
                  <Badge variant="outline">
                    {drawerContract.payment_frequency}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Umsatz
                  </h3>
                  <p>€{drawerContract.revenue_total.toLocaleString()}</p>
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
                  <CashflowHistoryTable contractId={drawerContract.id} />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Prognose</h3>
                <CashflowUpcomingTable contractId={drawerContract.id} />{" "}
              </div>
              {/* ---------------- Upsell Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upsell / Vertragsverlängerung
                </h3>

                {/* Renewal result contract: show origin info only */}
                {isUpsellResultContract && relatedUpsell && (
                  <div className="p-3 mt-4 border rounded-md bg-muted/30">
                    <div className="font-medium text-sm">
                      Dieser Vertrag entstand aus einer Vertragsverlängerung.
                    </div>
                    {linkedPreviousContract && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Ursprünglicher Vertrag:{" "}
                        {linkedPreviousContract.client_name}
                      </div>
                    )}
                    {linkedPreviousContract && (
                      <button
                        type="button"
                        onClick={() =>
                          openLinkedContract(linkedPreviousContract)
                        }
                        className="mt-3 px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
                      >
                        Ursprünglichen Vertrag öffnen
                      </button>
                    )}
                  </div>
                )}

                {/* Source/original contract: show editable upsell card */}
                {isUpsellSourceContract && relatedUpsell && (
                  <div
                    className="p-3 mt-4 border rounded-md cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setEditingUpsell(relatedUpsell);
                      setShowUpsellModal(true);
                    }}
                  >
                    {/* If result is verlängerung → show contract details */}
                    {relatedUpsell.upsell_result === "verlaengerung" ? (
                      <div className="space-y-1">
                        <div className="font-medium text-green-600">
                          Ergebnis: Vertragsverlängerung
                        </div>

                        {relatedUpsell.contract_start_date && (
                          <div className="text-sm">
                            Neuer Vertrag ab:{" "}
                            {formatDateOnly(relatedUpsell.contract_start_date)}
                          </div>
                        )}

                        {relatedUpsell.contract_duration_months && (
                          <div className="text-sm">
                            Dauer: {relatedUpsell.contract_duration_months}{" "}
                            Monate
                          </div>
                        )}

                        {relatedUpsell.contract_frequency && (
                          <div className="text-sm">
                            Zahlungsfrequenz: {relatedUpsell.contract_frequency}
                          </div>
                        )}

                        {relatedUpsell.upsell_revenue && (
                          <div className="text-sm">
                            Umsatz: €
                            {relatedUpsell.upsell_revenue.toLocaleString()}
                          </div>
                        )}

                        {linkedNewContract && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLinkedContract(linkedNewContract);
                              }}
                              className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
                            >
                              Neuen Vertrag öffnen
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Default: show talk date + status */
                      <div>
                        <div className="font-medium">
                          Upsellgespräch:{" "}
                          {relatedUpsell.upsell_date
                            ? formatDateOnly(relatedUpsell.upsell_date)
                            : "–"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Status: {relatedUpsell.upsell_result ?? "offen"}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If no upsell exists on the source contract → show button */}
                {!relatedUpsell && !isUpsellResultContract && (
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
                  entityId={drawerContract.id}
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
            refetchAllUpsells();
          }}
        />
      )}
      {showContractEdit && (
        <ContractEditModal
          contract={drawerContract}
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
                setSelectedContract(updated); // refreshes the drawer details
              }
            });

            queryClient.invalidateQueries({
              queryKey: queryKeys.cashflowEntries,
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cashflowForecast,
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.cashflowMetrics,
            });
          }}
        />
      )}
    </div>
  );
}
