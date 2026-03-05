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
import { useEffect, useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

function toYmdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function extractYmd(input?: string | null): string | null {
  if (!input) return null;
  return String(input).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function formatYmdToLocale(ymd?: string | null): string {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "–";
  return new Date(y, m - 1, d).toLocaleDateString("de-DE");
}

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

  const [range, setRange] = useState<RangeFilter>(contractId ? "30" : "all");

  useEffect(() => {
    setRange(contractId ? "30" : "all");
  }, [contractId]);

  const now = new Date();

  // Derive "entries" from contracts that have a next due date
  // If the API returned entries, use them. Otherwise derive entries from
  // contracts (as a fallback for older backends or mocks).
  const derivedEntries = contracts
    .map((c) => {
      const due = c.next_due_date ?? c.start_date ?? null;
      return {
        id: c.id,
        contractId: c.id,
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
          .map((r) => {
            const contract =
              typeof r.contract_id === "number"
                ? contracts.find((c) => c.id === r.contract_id)
                : undefined;

            const contractLabel = contract
              ? `${contract.client_name} - ${contract.duration_months} Monate`
              : (r.contract_label ?? `Vertrag ${r.contract_id ?? r.id}`);

            return {
              id: r.id,
              contractId: r.contract_id,
              contractLabel,
              dueDate: r.due_date,
              amount: r.amount,
            };
          })
          .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""))
      : derivedEntries;

  const isFetching = fetchingEntries || fetchingContracts;
  const isError = entriesError || contractsError;

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
            {totalPages > 1 && (
              <TablePagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
