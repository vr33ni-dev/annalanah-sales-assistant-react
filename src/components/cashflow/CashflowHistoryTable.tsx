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
  getContractById,
  getContracts,
  patchCashflowEntryStatus,
  type CashflowEntry,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockContracts } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import { useEffect, useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { extractYmd, formatYmdToLocale, toYmdLocal } from "@/helpers/date";
import { queryKeys } from "@/lib/queryKeys";

function calcNextDueAmount(c: Contract): number {
  switch (c.payment_frequency) {
    case "monthly":
      return c.base_monthly_amount;
    case "bi-monthly":
      return c.base_monthly_amount * 2;
    case "quarterly":
      return c.base_monthly_amount * 3;
    case "bi-yearly":
      return c.base_monthly_amount * 6;
    case "one-time":
      return c.revenue_total;
    default:
      return c.base_monthly_amount;
  }
}

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
    data: contracts = [],
    isFetching: fetchingContracts,
    isError: contractsError,
  } = useMockableQuery<Contract[]>({
    queryKey: queryKeys.contractsList({ compact: true }),
    queryFn: () => getContracts({ compact: true }),
    enabled: typeof contractId !== "number",
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  const {
    data: contractDetail,
    isFetching: fetchingContractDetail,
    isError: contractDetailError,
  } = useMockableQuery<Contract | null>({
    queryKey: contractId ? queryKeys.contract(contractId) : ["contract", null],
    queryFn: () =>
      typeof contractId === "number" ? getContractById(contractId) : null,
    enabled: typeof contractId === "number",
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (contract) => contract ?? null,
    mockData:
      typeof contractId === "number"
        ? (mockContracts.find((contract) => contract.id === contractId) ?? null)
        : null,
  });

  type RangeFilter = "all" | "30" | "90" | "365";

  const [range, setRange] = useState<RangeFilter>("30");
  // Optimistic local status overrides: entryId -> "overdue" | "confirmed"
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, "overdue" | "confirmed">
  >({});
  const queryClient = useQueryClient();

  useEffect(() => {
    setRange("30");
  }, [contractId, clientId]);

  const now = new Date();

  const contractSource =
    typeof contractId === "number"
      ? contractDetail
        ? [contractDetail]
        : []
      : typeof clientId === "number"
        ? contracts.filter((c) => c.client_id === clientId)
        : contracts;

  const contractById = Object.fromEntries(contractSource.map((c) => [c.id, c]));

  const entries = contractSource
    .flatMap((contract) => {
      const contractLabel = contract.client_name;
      const embeddedEntries = Array.isArray(contract.cashflow)
        ? contract.cashflow
            .filter((entry) => Number(entry.amount ?? 0) > 0)
            .map((entry) => ({
              id: entry.id,
              contractId:
                typeof entry.contract_id === "number"
                  ? entry.contract_id
                  : contract.id,
              contractLabel,
              dueDate: entry.due_date,
              amount: entry.amount,
              confirmed: entry.confirmed ?? true,
              status: entry.status ?? null,
            }))
        : [];

      if (embeddedEntries.length > 0) return embeddedEntries;

      const due = contract.next_due_date ?? contract.start_date ?? null;
      if (!due) return [];

      return [
        {
          id: contract.id,
          contractId: contract.id,
          contractLabel,
          dueDate: due,
          amount: calcNextDueAmount(contract),
          confirmed: true,
          status: null,
        },
      ].filter((entry) => entry.amount > 0);
    })
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));

  const isFetching =
    typeof contractId === "number" ? fetchingContractDetail : fetchingContracts;
  const isError =
    typeof contractId === "number" ? contractDetailError : contractsError;

  // ✅ Apply optional filtering if a contractId is provided and if the user selected a range
  const filteredEntries = entries
    .filter((e) => !contractId || e.contractId === contractId)
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
                  <TableHead>Betrag</TableHead>
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
                      // Clear override — let fresh backend data take over
                      setStatusOverrides((prev) => {
                        const copy = { ...prev };
                        delete copy[e.id];
                        return copy;
                      });
                      // Invalidate all contract query variants so both the list
                      // view and the detail view reflect the updated status.
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
