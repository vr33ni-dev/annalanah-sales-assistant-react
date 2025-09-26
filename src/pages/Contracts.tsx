import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  AlertTriangle
} from "lucide-react";
import { CashflowEntriesTable } from "./CashflowEntries";

// Mock contracts data - aligned with closed clients
const mockContracts = [
  {
    id: 1,
    client: "Max Mustermann",
    startDate: "2024-01-15",
    duration: 12,
    totalValue: 3200,
    frequency: "monatlich",
    monthlyAmount: 267,
    nextPayment: "2024-02-15",
    paidMonths: 1
  },
  {
    id: 2,
    client: "Thomas Weber",
    startDate: "2024-01-10",
    duration: 6,
    totalValue: 2850,
    frequency: "monatlich",
    monthlyAmount: 475,
    nextPayment: "2024-02-10",
    paidMonths: 1
  }
];

// Mock cashflow forecast data
// Confirmed = Existing active contracts (guaranteed income)
// Potential = Prospects/pending deals that may convert
const cashflowForecast = [
  { month: "Feb 2024", expected: 942, confirmed: 742, potential: 200 },
  { month: "Mar 2024", expected: 942, confirmed: 742, potential: 200 },
  { month: "Apr 2024", expected: 942, confirmed: 742, potential: 200 },
  { month: "May 2024", expected: 942, confirmed: 742, potential: 200 },
  { month: "Jun 2024", expected: 942, confirmed: 742, potential: 200 },
];

const statusColors = {
  active: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  overdue: "bg-destructive text-destructive-foreground",
  completed: "bg-muted text-muted-foreground"
};

export default function Contracts() {
  const totalRevenue = mockContracts.reduce((sum, contract) => sum + contract.totalValue, 0);
  const monthlyRecurring = mockContracts.reduce((sum, contract) => sum + contract.monthlyAmount, 0);
  const activeContracts = mockContracts.length;
  const avgContractValue = totalRevenue / mockContracts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Verträge & Cashflow</h1>
          <p className="text-muted-foreground">Verträge verfolgen und Umsatzprognosen</p>
        </div>
        <Button>
          <FileText className="w-4 h-4 mr-2" />
          Neuer Vertrag
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Gesamter Vertragswert</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{monthlyRecurring.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monatlich wiederkehrend</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeContracts}</p>
                <p className="text-xs text-muted-foreground">Aktive Verträge</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">€{Math.round(avgContractValue).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Ø Vertragswert</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Aktive Verträge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>Laufzeit</TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Zahlungsfrequenz</TableHead>
                <TableHead>Fortschritt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockContracts.map((contract) => {
                const progressPercent = (contract.paidMonths / contract.duration) * 100;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.client}</TableCell>
                    <TableCell>{contract.startDate}</TableCell>
                    <TableCell>{contract.duration} Monate</TableCell>
                    <TableCell>€{contract.totalValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contract.frequency}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {contract.paidMonths}/{contract.duration} Monate
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashflow Entries & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashflowEntriesTable />
        
        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cashflow Prognose
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cashflowForecast.map((month, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{month.month}</span>
                    <span className="font-bold">€{month.expected.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-success">Bestätigt (Aktive Verträge)</span>
                      <span>€{month.confirmed.toLocaleString()}</span>
                    </div>
                    {month.potential > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-warning">Potentiell (Ausstehende Deals)</span>
                        <span>€{month.potential.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <Progress value={(month.confirmed / month.expected) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Zahlungsstatus
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-8 h-8 text-success" />
                <div className="flex-1">
                  <p className="font-medium">Planmäßig</p>
                  <p className="text-sm text-muted-foreground">
                    {mockContracts.length} Verträge zahlen pünktlich
                  </p>
                </div>
                <p className="font-bold text-success">€{monthlyRecurring.toLocaleString()}</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                <Clock className="w-8 h-8 text-warning" />
                <div className="flex-1">
                  <p className="font-medium">Bald fällig</p>
                  <p className="text-sm text-muted-foreground">
                    2 Zahlungen in den nächsten 7 Tagen fällig
                  </p>
                </div>
                <p className="font-bold text-warning">€742</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}