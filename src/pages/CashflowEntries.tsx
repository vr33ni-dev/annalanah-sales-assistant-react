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

// Mock cashflow entries data - aligned with contracts
const cashflowEntries = [
  {
    id: 1,
    contract: "Max Mustermann - 12M",
    dueDate: "2024-02-15",
    amount: 267
  },
  {
    id: 2,
    contract: "Thomas Weber - 6M", 
    dueDate: "2024-02-10",
    amount: 475
  },
  {
    id: 3,
    contract: "Max Mustermann - 12M",
    dueDate: "2024-01-15",
    amount: 267
  },
  {
    id: 4,
    contract: "Thomas Weber - 6M",
    dueDate: "2024-01-10", 
    amount: 475
  }
];

export function CashflowEntriesTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cashflow Einträge
        </CardTitle>
      </CardHeader>
      <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vertrag</TableHead>
                <TableHead>Fälligkeitsdatum</TableHead>
                <TableHead>Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflowEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.contract}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {entry.dueDate}
                    </div>
                  </TableCell>
                  <TableCell>€{entry.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </CardContent>
    </Card>
  );
}