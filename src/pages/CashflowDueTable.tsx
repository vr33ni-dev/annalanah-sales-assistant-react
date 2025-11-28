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

function calcNextDueAmount(c: Contract): number {
  switch (c.payment_frequency) {
    case "monthly":
      return c.monthly_amount;
    case "bi-monthly":
      return c.monthly_amount * 2;
    case "quarterly":
      return c.monthly_amount * 3;
    default:
      return c.monthly_amount;
  }
}

export function CashflowDueTable({ contractId }: { contractId?: number }) {
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

  // ✅ Apply optional filtering if a contractId is provided
  const filteredEntries = contractId
    ? entries.filter((e) => e.id === contractId)
    : entries;

  if (isFetching && data.length === 0) {
    return (
      <Card>
        <CardHeader>
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
