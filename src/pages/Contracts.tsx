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
  getDashboardKPIs,
  type CashflowRow,
  type CashflowMetrics,
  type DashboardKPIs,
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
  mockDashboardKPIs,
  getMockUpsellsForSalesProcess,
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
import {
  addMonthsDate,
  addMonthsIso,
  getContractEndDate,
  getElapsedContractMonths,
  isContractExpired,
  selectActiveUpsell,
  selectDisplayUpsell,
  toDateStartOfDay,
} from "@/helpers/contract";
import { ContractEditModal } from "@/components/contract/ContractEditModal";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

function euro(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

function euro2(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function paymentFrequencyLabel(frequency?: string | null): string {
  switch (frequency) {
    case "monthly":
      return "Monatlich";
    case "bi-monthly":
      return "Zweimonatlich";
    case "quarterly":
      return "Vierteljährlich";
    case "bi-yearly":
      return "Halbjährlich";
    case "one-time":
      return "Einmalig";
    default:
      return frequency ?? "–";
  }
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
  const [showHistory, setShowHistory] = useState(false);
  const [showExpiredContracts, setShowExpiredContracts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<
    | "client_name"
    | "start_date"
    | "end_date"
    | "duration_months"
    | "progress"
    | "revenue"
  >("start_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const shouldFetchExpiredContracts = showExpiredContracts;

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

  // Upsell for the currently viewed contract: match by previous_contract_id,
  // exclude already-executed upsells (new_contract_id set), pick most recently updated.
  const { data: savedUpsells = [] } = useMockableQuery<ContractUpsell[]>({
    queryKey: queryKeys.upsell(drawerContract?.sales_process_id ?? undefined),
    queryFn: () =>
      drawerContract?.sales_process_id
        ? getUpsellForSalesProcess(drawerContract.sales_process_id)
        : Promise.resolve([]),
    enabled: !!drawerContract?.sales_process_id,
    retry: false,
    staleTime: 0,
    select: (d) => d,
    mockData: drawerContract?.sales_process_id
      ? getMockUpsellsForSalesProcess(drawerContract.sales_process_id)
      : [],
  });
  const savedUpsell = useMemo(
    () =>
      drawerContract
        ? selectActiveUpsell(savedUpsells, drawerContract.id)
        : null,
    [savedUpsells, drawerContract],
  );
  const displayUpsell = useMemo(
    () =>
      drawerContract
        ? selectDisplayUpsell(savedUpsells, drawerContract.id)
        : null,
    [savedUpsells, drawerContract],
  );

  const verlaengerungUpsell = useMemo(
    () =>
      drawerContract
        ? savedUpsells.find((u) => u.upsell_result === "verlaengerung")
        : null,
    [savedUpsells, drawerContract],
  );

  // Chain is embedded in the GET /contracts/{id} response.
  const contractChain = useMemo(
    () => selectedContractDetail?.chain ?? [],
    [selectedContractDetail?.chain],
  );

  const chainWithLabels = useMemo(() => {
    const sorted = contractChain
      .slice()
      .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
    return sorted.map((c, i) => ({
      ...c,
      label: i === 0 ? "Aktueller Vertrag" : `Verlängerung #${i}`,
      // Only the first contract (original) is ever 'geöffnet' (current)
      isCurrent: i === 0,
    }));
  }, [contractChain]);

  // Chain-level aggregates for the drawer header
  const sortedChain = useMemo(
    () =>
      contractChain
        .slice()
        .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "")),
    [contractChain],
  );
  const chainTotal = sortedChain.reduce((sum, c) => sum + c.revenue_total, 0);
  const chainStart = sortedChain[0]?.start_date ?? null;
  const chainEnd = sortedChain[sortedChain.length - 1]?.end_date ?? null;
  const chainDuration = sortedChain.reduce(
    (sum, c) => sum + (c.duration_months ?? 0),
    0,
  );

  // Find the current or next contract in the chain
  const today = new Date();
  const currentOrNextContract = useMemo(() => {
    if (!sortedChain.length) return drawerContract;
    // 1. Try to find contract where today is within [start, end]
    for (const c of sortedChain) {
      const start = toDateStartOfDay(c.start_date);
      const end = getContractEndDate(c);
      if (start && end && start <= today && end >= today) return c;
      if (start && !end && start <= today) return c; // open-ended
    }
    // 2. If all are in the future, return the first (soonest)
    for (const c of sortedChain) {
      const start = toDateStartOfDay(c.start_date);
      if (start && start > today) return c;
    }
    // 3. If all are expired, return the last (most recent)
    return sortedChain[sortedChain.length - 1];
  }, [sortedChain, drawerContract, today]);

  const verlaengerungIsFuture = useMemo(() => {
    if (!verlaengerungUpsell?.contract_start_date) return false;
    // Compare date string directly to avoid timezone shifts
    const renewalDateStr =
      verlaengerungUpsell.contract_start_date.split("T")[0];
    const todayStr = toYmdLocal(new Date());
    return renewalDateStr > todayStr;
  }, [verlaengerungUpsell]);

  const clientContracts = useMemo(
    () =>
      drawerContract
        ? contracts
            .filter((c) => c.client_id === drawerContract.client_id)
            .sort((a, b) =>
              (a.start_date ?? "").localeCompare(b.start_date ?? ""),
            )
        : [],
    [contracts, drawerContract],
  );

  const clientTotalRevenue = clientContracts.reduce(
    (sum, c) => sum + c.revenue_total,
    0,
  );

  const openLinkedContract = (contract: Contract) => {
    setSelectedContract(contract);
    navigate(
      contract.sales_process_id
        ? `/contracts?client=${contract.client_id}&open=1&sales_process=${contract.sales_process_id}`
        : `/contracts?client=${contract.client_id}&open=1`,
    );
  };

  // Cashflow forecast (server-side aggregation)
  const { data: forecast = [] } = useMockableQuery<CashflowRow[]>({
    queryKey: queryKeys.cashflowForecast,
    queryFn: () => getCashflowForecast(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<CashflowRow>(d),
    mockData: mockCashflowForecast as CashflowRow[],
  });

  // Cashflow metrics (server-side) — avg YTD, confirmed next3, etc.
  const { data: metrics } = useMockableQuery<CashflowMetrics | null>({
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
  const now = useMemo(() => new Date(), []);
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1

  /* ---- YTD average monthly cashflow (1.1. bis jetzt) — use metrics if available ---- */
  const monthsElapsedYtd = now.getMonth() + 1; // Jan..current month inclusive
  const avgMonthlyYtd = metrics?.avg_monthly_ytd ?? 0;
  const ytdPaidAmountDisplay = metrics?.ytd_paid_amount ?? 0;

  /* ---- Filtered Contracts for Active Contracts table ---- */
  const [dateStart, setDateStart] = useState<string>(toYmdLocal(startOfYear));
  const [dateEnd, setDateEnd] = useState<string>(toYmdLocal(now));

  // All-time KPIs (no date filter) — used for all metric chips on this page
  const { data: kpisAllTime } = useMockableQuery<DashboardKPIs>({
    queryKey: queryKeys.dashboardKpis({ scope: "all-time" }),
    queryFn: () => getDashboardKPIs(),
    staleTime: 5 * 60 * 1000,
    mockData: mockDashboardKPIs,
  });

  const dashboardValuesAreNet =
    (kpisAllTime?.monetary_mode ?? contracts[0]?.monetary_mode ?? "netto") ===
    "netto";
  const cashflowValuesAreNet =
    (metrics?.monetary_mode ?? forecast[0]?.monetary_mode ?? "brutto") ===
    "netto";

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

    if (searchTerm && searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      list = list.filter((c) =>
        (c.client_name || "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [contracts, clientFilter, dateEnd, dateStart, searchTerm]);

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

      if (sortField === "revenue") {
        return (a.revenue_total - b.revenue_total) * direction;
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

      if (sortField === "end_date") {
        const aEnd =
          getContractEndDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bEnd =
          getContractEndDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
        return (aEnd - bEnd) * direction;
      }

      const aStart =
        toDateStartOfDay(a.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bStart =
        toDateStartOfDay(b.start_date)?.getTime() ?? Number.POSITIVE_INFINITY;

      return (aStart - bStart) * direction;
    });
  }, [filteredContracts, sortField, sortOrder]);

  const clientGroups = useMemo(() => {
    const map = new Map<number, Contract[]>();
    for (const c of filteredContracts) {
      const group = map.get(c.client_id) ?? [];
      group.push(c);
      map.set(c.client_id, group);
    }
    return Array.from(map.values()).map((group) => {
      const sorted = [...group].sort((a, b) =>
        (a.start_date ?? "").localeCompare(b.start_date ?? ""),
      );
      const latest = sorted[sorted.length - 1];
      // Chain members all share the same sales_process_id — deduplicate so
      // renewals/upsells don't inflate the badge count. History is shown in
      // the drawer's Vertragshistorie, not as separate table entries.
      const seenProcessIds = new Set<number>();
      const distinctContracts = sorted.filter((c) => {
        if (!c.sales_process_id) return true;
        if (seenProcessIds.has(c.sales_process_id)) return false;
        seenProcessIds.add(c.sales_process_id);
        return true;
      });
      return {
        client_id: latest.client_id,
        client_name: latest.client_name,
        contracts: distinctContracts,
        latest,
        totalRevenue: group.reduce((sum, c) => sum + c.revenue_total, 0),
      };
    });
  }, [filteredContracts]);

  const sortedClientGroups = useMemo(() => {
    return [...clientGroups].sort((a, b) => {
      const direction = sortOrder === "asc" ? 1 : -1;
      if (sortField === "client_name") {
        return (
          (a.client_name ?? "").localeCompare(b.client_name ?? "", "de") *
          direction
        );
      }
      if (sortField === "revenue") {
        return (a.totalRevenue - b.totalRevenue) * direction;
      }

      if (sortField === "progress") {
        const aP =
          a.latest.duration_months > 0
            ? getElapsedContractMonths(
                a.latest.start_date,
                now,
                a.latest.duration_months,
              ) / a.latest.duration_months
            : 0;
        const bP =
          b.latest.duration_months > 0
            ? getElapsedContractMonths(
                b.latest.start_date,
                now,
                b.latest.duration_months,
              ) / b.latest.duration_months
            : 0;
        return (aP - bP) * direction;
      }
      if (sortField === "end_date") {
        const aEnd =
          getContractEndDate(a.latest)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bEnd =
          getContractEndDate(b.latest)?.getTime() ?? Number.POSITIVE_INFINITY;
        return (aEnd - bEnd) * direction;
      }
      const aStart =
        toDateStartOfDay(a.latest.start_date)?.getTime() ??
        Number.POSITIVE_INFINITY;
      const bStart =
        toDateStartOfDay(b.latest.start_date)?.getTime() ??
        Number.POSITIVE_INFINITY;
      return (aStart - bStart) * direction;
    });
  }, [clientGroups, sortField, sortOrder, now]);

  const onSortBy = (
    field:
      | "client_name"
      | "start_date"
      | "end_date"
      | "duration_months"
      | "progress"
      | "revenue",
  ) => {
    if (sortField === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortOrder(
      field === "start_date" || field === "end_date" ? "desc" : "asc",
    );
  };

  /* ----------------- Pagination ---------------- */
  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedClientGroups,
  } = usePagination(sortedClientGroups, 10);

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
          value={euro(kpisAllTime?.clv_active_clients ?? 0)}
          label="CLV aktive Kunden"
          popover={`Gesamtwert aller Vertragsperioden aktiver Kunden (historisch + aktuell)`}
          netAmount={dashboardValuesAreNet}
        />

        <MetricChip
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-success/20 text-success"
          value={euro(kpisAllTime?.clv_all_time ?? 0)}
          label="CLV gesamt (all-time)"
          popover={`Summe aller Verträge ever – inkl. inaktiver/verlorener Kunden`}
          netAmount={dashboardValuesAreNet}
        />

        <MetricChip
          icon={<FileText className="w-4 h-4" />}
          iconBg="bg-warning/10 text-warning"
          value={String(kpisAllTime?.active_contracts_count ?? 0)}
          label="Aktive Verträge"
          popover={`Anzahl heute aktiver Verträge = ${kpisAllTime?.active_contracts_count ?? 0}`}
        />

        <MetricChip
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={euro(kpisAllTime?.active_revenue ?? 0)}
          label="Aktiver Umsatz"
          popover={`Summe der laufenden Vertragsperioden (nicht abgelaufen)\n= ${euro(kpisAllTime?.active_revenue ?? 0)}`}
          netAmount={dashboardValuesAreNet}
        />

        <MetricChip
          icon={<Users className="w-4 h-4" />}
          iconBg="bg-accent/20 text-accent-foreground"
          value={euro(kpisAllTime?.avg_vertragswert ?? 0)}
          label="Ø Vertragswert"
          popover={
            `Ø Vertragswert aktiver Verträge\n` +
            `= ${euro(kpisAllTime?.active_revenue ?? 0)} / ${kpisAllTime?.active_contracts_count || 1}\n` +
            `= ${euro(kpisAllTime?.avg_vertragswert ?? 0)}`
          }
          netAmount={dashboardValuesAreNet}
        />

        <MetricChip
          icon={<Users className="w-4 h-4" />}
          iconBg="bg-muted/40 text-muted-foreground"
          value={euro(
            Math.round(
              kpisAllTime?.active_contracts_count
                ? kpisAllTime.clv_active_clients /
                    kpisAllTime.active_contracts_count
                : 0,
            ),
          )}
          label="Ø CLV pro Vertrag"
          popover={
            `Ø Kundenwert (Laufzeit) pro Vertrag\n` +
            `= ${euro(kpisAllTime?.clv_active_clients ?? 0)} / ${kpisAllTime?.active_contracts_count || 1}\n` +
            `= ${euro(Math.round(kpisAllTime?.active_contracts_count ? kpisAllTime.clv_active_clients / kpisAllTime.active_contracts_count : 0))}`
          }
          netAmount={dashboardValuesAreNet}
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
          netAmount={cashflowValuesAreNet}
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
          netAmount={cashflowValuesAreNet}
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
              {/* AKTIVE / ABGELAUFENE TOGGLE */}
              <div className="flex rounded-md border overflow-hidden text-sm">
                <button
                  className={`px-3 py-1.5 transition-colors ${
                    !showExpiredContracts
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setShowExpiredContracts(false)}
                >
                  Aktive
                </button>
                <button
                  className={`px-3 py-1.5 border-l transition-colors ${
                    showExpiredContracts
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setShowExpiredContracts(true)}
                >
                  Abgelaufene
                </button>
              </div>
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
                    onClick={() => onSortBy("end_date")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "end_date" && sortOrder === "asc"
                        ? "Nach Enddatum absteigend sortieren"
                        : "Nach Enddatum aufsteigend sortieren"
                    }
                  >
                    Enddatum
                    {sortField === "end_date" ? (
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
                    onClick={() => onSortBy("revenue")}
                    className="inline-flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground"
                    title={
                      sortField === "revenue" && sortOrder === "asc"
                        ? "Nach Umsatz absteigend sortieren"
                        : "Nach Umsatz aufsteigend sortieren"
                    }
                  >
                    Umsatz
                    {sortField === "revenue" ? (
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
              {paginatedClientGroups.map((group) => {
                const { latest } = group;
                const elapsedMonths = getElapsedContractMonths(
                  latest.start_date,
                  now,
                  latest.duration_months,
                );
                const contractExpired = isContractExpired(latest, now);
                const progressPercent =
                  latest.duration_months > 0
                    ? (elapsedMonths / latest.duration_months) * 100
                    : 0;
                const earliestStart = group.contracts[0]?.start_date;
                return (
                  <TableRow
                    key={group.client_id}
                    className={cn(
                      contractExpired &&
                        "bg-muted/20 text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{group.client_name}</span>
                        {group.contracts.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {group.contracts.length} Verträge
                          </Badge>
                        )}
                        {contractExpired && (
                          <Badge variant="secondary">Abgelaufen</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {earliestStart ? formatDateOnly(earliestStart) : "–"}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const end = getContractEndDate(latest);
                        return end ? formatDateOnly(end.toISOString()) : "–";
                      })()}
                    </TableCell>
                    <TableCell>{euro2(group.totalRevenue)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {paymentFrequencyLabel(latest.payment_frequency)}
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
                          {elapsedMonths}/{latest.duration_months} Monate
                          {latest.next_due_date
                            ? ` • Nächste: ${formatDateOnly(latest.next_due_date)}`
                            : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedContract(latest)}
                        className={cn(
                          "text-sm hover:underline",
                          contractExpired
                            ? "text-muted-foreground"
                            : "text-blue-600",
                        )}
                      >
                        Verträge anzeigen
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
                {paginatedClientGroups.length} von {sortedContracts.length}{" "}
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
        <CashflowHistoryTable onContractClick={setSelectedContract} />
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
                    Laufzeit (gesamt)
                  </h3>
                  <p>
                    {chainDuration > 0
                      ? `${chainDuration} Monate`
                      : `${drawerContract.duration_months} Monate`}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Startdatum
                  </h3>
                  <p>
                    {(chainStart ?? drawerContract.start_date)
                      ? formatDateOnly(
                          (chainStart ?? drawerContract.start_date)!,
                        )
                      : "–"}
                  </p>
                </div>
                {chainEnd && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Enddatum
                    </h3>
                    <p>{formatDateOnly(chainEnd)}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    CLV (Netto)
                  </h3>
                  <p>
                    {euro2(
                      chainTotal > 0
                        ? chainTotal
                        : drawerContract.revenue_total,
                    )}
                  </p>
                </div>

                {/* Current period / edit button */}
                {sortedChain.length > 1 ? (
                  <div className="mt-2 p-3 border rounded-md bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Aktuelle Periode
                    </p>
                    <div className="space-y-1 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Dauer: </span>
                        {formatDateOnly(currentOrNextContract.start_date)}
                        {" – "}
                        {(() => {
                          const end = getContractEndDate(currentOrNextContract);
                          return end ? formatDateOnly(end.toISOString()) : "–";
                        })()}
                        {" ("}
                        {currentOrNextContract.duration_months}
                        {" Monate)"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Umsatz (Netto):
                        </span>{" "}
                        {euro2(currentOrNextContract.revenue_total)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Zahlungsfrequenz:
                        </span>
                        <Badge variant="outline">
                          {paymentFrequencyLabel(
                            currentOrNextContract.payment_frequency,
                          )}
                        </Badge>
                      </div>
                    </div>
                    <button
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90"
                      onClick={() => setShowContractEdit(true)}
                    >
                      Vertragsdetails bearbeiten
                    </button>
                  </div>
                ) : (
                  <button
                    className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                    onClick={() => setShowContractEdit(true)}
                  >
                    Vertragsdetails bearbeiten
                  </button>
                )}

                {/* ------------- CashflowEntriesTable --------------*/}
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Zahlungsverlauf</h3>
                  <CashflowHistoryTable contractId={currentOrNextContract.id} />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Prognose</h3>
                {isContractExpired(currentOrNextContract, new Date()) ? (
                  <p className="text-sm text-muted-foreground">
                    Für abgelaufene Verträge gibt es keine Prognose.
                  </p>
                ) : (
                  <CashflowUpcomingTable
                    contractId={currentOrNextContract.id}
                  />
                )}
              </div>
              {/* ---------------- Upsell Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upsell / Vertragsverlängerung
                </h3>

                {/* Show saved upsell if one exists, otherwise show plan button */}
                <button
                  onClick={() => {
                    setEditingUpsell(null);
                    setShowUpsellModal(true);
                  }}
                  disabled={savedUpsells.length > 0}
                  title={
                    savedUpsells.length > 0
                      ? "Es existiert bereits ein Upsell für diesen Vertrag. Bitte den bestehenden Eintrag bearbeiten."
                      : undefined
                  }
                  className={
                    savedUpsells.length > 0
                      ? "mt-4 px-4 py-2 border border-border bg-muted text-muted-foreground rounded-md cursor-not-allowed"
                      : "mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  }
                >
                  Upsell planen
                </button>
                {displayUpsell &&
                  displayUpsell.upsell_result !== "verlaengerung" && (
                    <div className="mt-4 p-4 border rounded-md space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {displayUpsell.upsell_result === "keine_verlaengerung"
                            ? "❌ Keine Verlängerung"
                            : "⏳ Offen"}
                        </span>
                        <button
                          onClick={() => {
                            setEditingUpsell(displayUpsell);
                            setShowUpsellModal(true);
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Bearbeiten
                        </button>
                      </div>
                      {displayUpsell.upsell_date && (
                        <div className="text-sm text-muted-foreground">
                          Gesprächsdatum:{" "}
                          {formatDateOnly(displayUpsell.upsell_date)}
                        </div>
                      )}
                      {displayUpsell.contract_start_date && (
                        <div className="text-sm text-muted-foreground">
                          Neues Startdatum:{" "}
                          {formatDateOnly(displayUpsell.contract_start_date)}
                        </div>
                      )}
                      {displayUpsell.contract_duration_months != null && (
                        <div className="text-sm text-muted-foreground">
                          Laufzeit: {displayUpsell.contract_duration_months}{" "}
                          Monate
                        </div>
                      )}
                    </div>
                  )}

                {verlaengerungUpsell && verlaengerungIsFuture && (
                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                      ✅ Verlängerung
                    </span>
                  </div>
                )}
                {/* ---- Vertragshistorie (all periods in chain) ---- */}
                {chainWithLabels.length > 1 && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setShowHistory((v) => !v)}
                      className="px-3 py-1.5 border rounded-md text-sm hover:bg-muted"
                    >
                      {showHistory
                        ? "Vertragshistorie schließen"
                        : `Vertragshistorie öffnen (${chainWithLabels.length})`}
                    </button>

                    {showHistory && (
                      <>
                        {chainWithLabels.map((c, i) => {
                          const endDate = getContractEndDate(c);
                          const expired = isContractExpired(c, new Date());
                          return (
                            <div key={c.id} className="mt-4">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {c.label}
                                  {c.isCurrent && " (geöffnet)"}
                                </span>
                                {/* Verlängerung edit button if not expired */}
                                {i > 0 && !expired && (
                                  <button
                                    className="ml-2 text-xs text-blue-600 hover:underline"
                                    onClick={() => {
                                      setSelectedContract(c);
                                      setShowContractEdit(true);
                                    }}
                                  >
                                    Bearbeiten
                                  </button>
                                )}
                              </div>
                              <div
                                className={`p-3 border rounded-md ${expired ? "opacity-60" : ""}`}
                              >
                                <div className="mb-2">
                                  {expired ? (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                      Abgelaufen
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                      Aktiv
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    Startdatum:{" "}
                                    {c.start_date
                                      ? formatDateOnly(c.start_date)
                                      : "–"}
                                  </div>
                                  <div className="text-sm">
                                    Enddatum:{" "}
                                    {endDate
                                      ? endDate.toLocaleDateString("de-DE")
                                      : "–"}
                                  </div>
                                  {c.duration_months && (
                                    <div className="text-sm">
                                      Dauer: {c.duration_months} Monate
                                    </div>
                                  )}
                                  {c.payment_frequency && (
                                    <div className="text-sm">
                                      Zahlungsfrequenz:{" "}
                                      {paymentFrequencyLabel(
                                        c.payment_frequency,
                                      )}
                                    </div>
                                  )}
                                  <div className="text-sm flex items-center gap-1.5">
                                    <span
                                      className={
                                        c.source === "imported"
                                          ? "text-muted-foreground italic"
                                          : ""
                                      }
                                    >
                                      Umsatz: {euro2(c.revenue_total)}
                                    </span>
                                    {c.source === "imported" && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground border"
                                        title="Umsatz aus Import geschätzt – CLV gleichmäßig auf Perioden aufgeteilt"
                                      >
                                        Geschätzt
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ---------------- Comments Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <CommentsSection
                  entityType="contract"
                  entityId={drawerContract.id}
                  clientId={drawerContract.client_id}
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
            queryClient.invalidateQueries({
              queryKey: queryKeys.contract(selectedContract!.id),
            });
            if (selectedContract?.sales_process_id) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.upsell(selectedContract.sales_process_id),
              });
            }
          }}
        />
      )}
      {showContractEdit && (
        <ContractEditModal
          contract={drawerContract}
          onClose={() => setShowContractEdit(false)}
          onSaved={() => {
            setShowContractEdit(false);
            const selectedId = selectedContract?.id;

            toast({
              title: "Vertrag gespeichert",
              description: "Die Änderungen wurden erfolgreich gespeichert.",
            });

            if (selectedId) {
              queryClient.invalidateQueries({
                queryKey: queryKeys.contract(selectedId),
              });
              queryClient.refetchQueries({
                queryKey: queryKeys.contract(selectedId),
                type: "active",
              });
            }

            refetchContracts().then((result) => {
              // Get fresh contract from server
              const updated = result.data?.find((c) => c.id === selectedId);
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
