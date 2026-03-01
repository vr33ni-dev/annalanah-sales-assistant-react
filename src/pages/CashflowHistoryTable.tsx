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
  getContracts,
  getCashflowEntries,
  type CashflowEntry,
} from "@/lib/api";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockContracts } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import { useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

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
  // Prefer a dedicated cashflow entries endpoint; fall back to deriving
  // entries from contracts when the endpoint is not available or returns none.
  const {
    data: entriesFromApi = [],
    isFetching: fetchingEntries,
    isError: entriesError,
  } = useMockableQuery<CashflowEntry[]>({
    queryKey: ["cashflow-entries", contractId],
    queryFn: () => getCashflowEntries(contractId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<CashflowEntry>,
    mockData: [],
  });

  const {
    data: contracts = [],
    isFetching: fetchingContracts,
    isError: contractsError,
  } = useMockableQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  type RangeFilter = "all" | "30" | "90" | "365";

  const [range, setRange] = useState<RangeFilter>("30");

  const now = new Date();

  // Derive "entries" from contracts that have a next due date
  // If the API returned entries, use them. Otherwise derive entries from
  // contracts (as a fallback for older backends or mocks).
  const derivedEntries = contracts
    .map((c) => {
      const due = c.next_due_date ?? c.start_date ?? null;
      return {
        id: c.id,
        contractLabel: `${c.client_name} - ${c.duration_months} Monate`,
        dueDate: due as string | null,
        amount: calcNextDueAmount(c),
      };
    })
    .filter((e) => !!e.dueDate && e.amount > 0)
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));

  const entries =
    entriesFromApi && entriesFromApi.length > 0
      ? entriesFromApi
          .filter((r) => r.amount > 0)
          .map((r) => ({
            id: r.id,
            contractLabel: r.contract_label ?? `Vertrag ${r.contract_id ?? r.id}`,
            dueDate: r.due_date,
            amount: r.amount,
          }))
          .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""))
      : derivedEntries;

  const isFetching = fetchingEntries || fetchingContracts;
  const isError = entriesError || contractsError;

  // ✅ Apply optional filtering if a contractId is provided and if the user selected a range
  const filteredEntries = entries
    .filter((e) => !contractId || e.id === contractId)
    .filter((e) => {
      const due = new Date(e.dueDate);

      // "all" = only past & today
      if (range === "all") return due <= now;

      // last X days
      const days = parseInt(range, 10);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);

      return due >= cutoff && due <= now;
    });

  const showPagination = range === "all";
  const { page, setPage, totalPages, paginatedItems } = usePagination(filteredEntries, 10);
  const displayedEntries = showPagination ? paginatedItems : filteredEntries;

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
                  <TableHead>Vertrag</TableHead>
                  <TableHead>Fälligkeitsdatum</TableHead>
                  <TableHead>Betrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.contractLabel}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {e.dueDate
                          ? new Date(e.dueDate).toLocaleDateString("de-DE")
                          : "–"}
                      </div>
                    </TableCell>
                    <TableCell>
                      €{Math.round(e.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {showPagination && totalPages > 1 && (
              <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
