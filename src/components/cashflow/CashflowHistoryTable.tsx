import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "lucide-react";
import {
  Contract,
  getContractById,
  getContracts,
  type CashflowEntry,
} from "@/lib/api";
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

export function CashflowHistoryTable({ contractId }: { contractId?: number }) {
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

  useEffect(() => {
    setRange("30");
  }, [contractId]);

  const now = new Date();

  const contractSource =
    typeof contractId === "number"
      ? contractDetail
        ? [contractDetail]
        : []
      : contracts;

  const entries = contractSource
    .flatMap((contract) => {
      const contractLabel = `${contract.client_name} - ${contract.duration_months} Monate`;
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEntries.map((e) => (
                  <TableRow
                    key={`${e.contractId ?? "na"}-${e.id}-${e.dueDate ?? "na"}`}
                  >
                    {!contractId && (
                      <TableCell className="font-medium">
                        {e.contractLabel}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatYmdToLocale(extractYmd(e.dueDate))}
                      </div>
                    </TableCell>
                    <TableCell>
                      €{Math.round(e.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredEntries.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {displayedEntries.length} von {filteredEntries.length} Einträge angezeigt
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
