import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Calendar, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Contract,
  getContracts,
  getCashflowEntries,
  patchCashflowEntryStatus,
  type CashflowEntry,
} from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockContracts } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import { useEffect, useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { extractYmd, formatYmdToLocale, toYmdLocal } from "@/helpers/date";
import { queryKeys } from "@/lib/queryKeys";

export function CashflowHistoryTable({
  contractId,
  clientId,
  onContractClick,
}: {
  contractId?: number;
  clientId?: number;
  onContractClick?: (contract: Contract) => void;
}) {
  const {
    data: rawEntries = [],
    isFetching: fetchingEntries,
    isError: entriesError,
  } = useMockableQuery<CashflowEntry[]>({
    queryKey: contractId
      ? queryKeys.cashflowEntriesByContract(contractId)
      : clientId
        ? [...queryKeys.cashflowEntries, { clientId }]
        : queryKeys.cashflowEntries,
    queryFn: () => getCashflowEntries(contractId, clientId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<CashflowEntry>,
    mockData: [],
  });

  // Contracts list — only needed for clientId filtering and click-through handling
  const needsContracts =
    typeof clientId === "number" || typeof onContractClick === "function";
  const { data: contracts = [] } = useMockableQuery<Contract[]>({
    queryKey: queryKeys.contractsList({ compact: true }),
    queryFn: () => getContracts({ compact: true }),
    enabled: needsContracts,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  type RangeFilter = "all" | "30" | "90" | "365";

  const [range, setRange] = useState<RangeFilter>("30");
  const queryClient = useQueryClient();

  // Shared status overrides stored in React Query cache so all
  // CashflowHistoryTable instances (main page + detail drawer) stay in sync.
  const OVERRIDES_KEY = ["cashflow-status-overrides"] as const;
  const { data: statusOverrides = {} } = useQuery<
    Record<number, "overdue" | "confirmed">
  >({
    queryKey: OVERRIDES_KEY,
    queryFn: () => ({}),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const setStatusOverrides = (
    updater: (
      prev: Record<number, "overdue" | "confirmed">,
    ) => Record<number, "overdue" | "confirmed">,
  ) => {
    queryClient.setQueryData<Record<number, "overdue" | "confirmed">>(
      OVERRIDES_KEY,
      (prev = {}) => updater(prev),
    );
  };

  useEffect(() => {
    setRange("30");
  }, [contractId, clientId]);

  const now = new Date();

  const contractById = Object.fromEntries(contracts.map((c) => [c.id, c]));

  const entries = rawEntries
    .filter((e) => Number(e.amount ?? 0) > 0)
    .map((e) => ({
      id: e.id,
      contractId: e.contract_id ?? 0,
      contractLabel: e.contract_label ?? contractById[e.contract_id ?? 0]?.client_name ?? "",
      dueDate: e.due_date,
      amount: e.amount,
      confirmed: e.confirmed ?? true,
      status: e.status ?? null,
    }))
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));

  const isFetching = fetchingEntries;
  const isError = entriesError;

  const filteredEntries = entries
    .filter((e) => {
      const dueYmd = extractYmd(e.dueDate);
      if (!dueYmd) return false;
      const todayYmd = toYmdLocal(now);

      // "all" = only past & today
      if (range === "all") return dueYmd <= todayYmd;

      // last X days
      const days = parseInt(range, 10);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffYmd = toYmdLocal(cutoff);

      return dueYmd >= cutoffYmd && dueYmd <= todayYmd;
    });

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredEntries,
    10,
  );
  const displayedEntries = paginatedItems;

  // const historyEntries = entries.filter(e => new Date(e.dueDate) <= today);

  if (isFetching && entries.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Cashflow Einträge (Zahlungsverlauf)
          </CardTitle>
        </CardHeader>

        <CardContent>Loading…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cashflow Einträge (Zahlungsverlauf)
        </CardTitle>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeFilter)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">Alle</option>
          <option value="30">Letzte 30 Tage</option>
          <option value="90">Letzte 90 Tage</option>
          <option value="365">Letztes Jahr</option>
        </select>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-red-500">Fehler beim Laden der Cashflows.</div>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground">
            Keine anstehenden Zahlungen.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {!contractId && <TableHead>Vertrag</TableHead>}
                  <TableHead>Fälligkeitsdatum</TableHead>
                  <TableHead>Betrag (Brutto)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEntries.map((e) => {
                  const dueYmd = extractYmd(e.dueDate);
                  // Effective status: local override wins, then backend status, then default confirmed
                  const effectiveStatus =
                    statusOverrides[e.id] ??
                    (e.status === "overdue" ? "overdue" : "confirmed");
                  const isOverdue = effectiveStatus === "overdue";

                  const handleToggle = async () => {
                    const next = isOverdue ? "confirmed" : "overdue";
                    const nextLocal = isOverdue ? "confirmed" : "overdue";
                    setStatusOverrides((prev) => ({
                      ...prev,
                      [e.id]: nextLocal,
                    }));
                    try {
                      await patchCashflowEntryStatus(e.id, next);
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.cashflowEntries,
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.cashflowEntriesByContract(
                          e.contractId,
                        ),
                      });
                      if (contractId && contractId !== e.contractId) {
                        queryClient.invalidateQueries({
                          queryKey:
                            queryKeys.cashflowEntriesByContract(contractId),
                        });
                      }
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.contractsList({ compact: true }),
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.contractsList({}),
                      });
                      queryClient.invalidateQueries({
                        queryKey: queryKeys.contract(e.contractId),
                      });
                      if (contractId && contractId !== e.contractId) {
                        queryClient.invalidateQueries({
                          queryKey: queryKeys.contract(contractId),
                        });
                      }
                    } catch {
                      // Revert on error
                      setStatusOverrides((prev) => {
                        const copy = { ...prev };
                        delete copy[e.id];
                        return copy;
                      });
                    }
                  };

                  const canClick = !contractId && !!onContractClick;

                  return (
                    <TableRow
                      key={`${e.contractId ?? "na"}-${e.id}-${e.dueDate ?? "na"}`}
                      className={
                        [
                          isOverdue ? "bg-destructive/5" : "",
                          canClick ? "cursor-pointer hover:bg-muted/50" : "",
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      onClick={
                        canClick
                          ? () => {
                              const c = contractById[e.contractId];
                              if (c) onContractClick(c);
                            }
                          : undefined
                      }
                    >
                      {!contractId && (
                        <TableCell className="font-medium">
                          {e.contractLabel}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatYmdToLocale(dueYmd)}
                        </div>
                      </TableCell>
                      <TableCell>
                        €{Math.round(e.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isOverdue ? (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Überfällig
                            </Badge>
                          ) : (
                            <Badge className="flex items-center gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle className="w-3 h-3" />
                              Bestätigt
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleToggle();
                            }}
                          >
                            {isOverdue
                              ? "Als bestätigt markieren"
                              : "Als überfällig markieren"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredEntries.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {displayedEntries.length} von {filteredEntries.length}{" "}
                  Einträgen
                </span>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
