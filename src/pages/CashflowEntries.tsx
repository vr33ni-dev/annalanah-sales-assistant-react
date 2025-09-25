import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, AlertTriangle } from "lucide-react";

// Mock cashflow entries data  
const cashflowEntries = [
  {
    id: 1,
    contract: "Max Mustermann - 12M",
    dueDate: "2024-02-15",
    amount: 267,
    status: "pending"
  },
  {
    id: 2,
    contract: "Thomas Weber - 6M", 
    dueDate: "2024-02-10",
    amount: 475,
    status: "pending"
  },
  {
    id: 3,
    contract: "Sarah Schmidt - 24M",
    dueDate: "2024-01-01", 
    amount: 200,
    status: "overdue"
  },
  {
    id: 4,
    contract: "Max Mustermann - 12M",
    dueDate: "2024-01-15",
    amount: 267, 
    status: "paid"
  }
];

const statusColors = {
  pending: "bg-warning text-warning-foreground",
  paid: "bg-success text-success-foreground", 
  overdue: "bg-destructive text-destructive-foreground"
};

export function CashflowEntriesTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cashflow Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contract</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashflowEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.contract}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {entry.status === 'overdue' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {entry.dueDate}
                  </div>
                </TableCell>
                <TableCell>€{entry.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColors[entry.status as keyof typeof statusColors]}>
                    {entry.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}