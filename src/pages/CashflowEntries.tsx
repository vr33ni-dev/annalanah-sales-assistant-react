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

function calcNextDueAmount(c: Contract): number {
  // monthly_amount is revenue_total / duration_months (from backend)
  switch (c.payment_frequency) {
    case "monthly":
      return c.monthly_amount;
    case "bi-monthly":
      // paid every 2 months ⇒ amount is for 2 months
      return c.monthly_amount * 2;
    case "quarterly":
      return c.monthly_amount * 3;
    default:
      return c.monthly_amount; // fallback
  }
}

export function CashflowEntriesTable() {
  const {
    data: contracts = [],
    isLoading,
    isError,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  // Derive "entries" from contracts that have a next due date
  const entries = (contracts ?? [])
    .filter((c) => !!c.next_due_date)
    .map((c) => ({
      id: c.id,
      contractLabel: `${c.client_name} - ${c.duration_months}M`,
      dueDate: c.next_due_date as string,
      amount: calcNextDueAmount(c),
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cashflow Einträge (nächste Fälligkeiten)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading…</div>
        ) : isError ? (
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
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.contractLabel}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {e.dueDate}
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
