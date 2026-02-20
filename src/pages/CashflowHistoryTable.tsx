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
import { useQuery } from "@tanstack/react-query";
import { Contract, getContracts } from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";
import { useState } from "react";

function calcNextDueAmount(c: Contract): number {
  switch (c.payment_frequency) {
    case "monthly":
      return c.monthly_amount;
    case "bi-monthly":
      return c.monthly_amount * 2;
    case "quarterly":
      return c.monthly_amount * 3;
    case "bi-yearly":
      return c.monthly_amount * 6;
    case "one-time":
      return c.revenue_total;
    default:
      return c.monthly_amount;
  }
}

export function CashflowHistoryTable({ contractId }: { contractId?: number }) {
  const { enabled } = useAuthEnabled();

  const {
    data = [],
    isFetching,
    isError,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
  });

  type RangeFilter = "all" | "30" | "90" | "365";

  const [range, setRange] = useState<RangeFilter>("all");

  const now = new Date();

  // Derive "entries" from contracts that have a next due date
  const entries = data
    .filter((c) => !!c.next_due_date)
    .map((c) => ({
      id: c.id,
      contractLabel: `${c.client_name} - ${c.duration_months}M`,
      dueDate: c.next_due_date as string,
      amount: calcNextDueAmount(c),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

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

  // const historyEntries = entries.filter(e => new Date(e.dueDate) <= today);

  if (isFetching && data.length === 0) {
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vertrag</TableHead>
                <TableHead>Fälligkeitsdatum</TableHead>
                <TableHead>Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => (
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
        )}
      </CardContent>
    </Card>
  );
}
