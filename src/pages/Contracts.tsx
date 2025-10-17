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
  TrendingUp,
  Users,
  Calendar,
} from "lucide-react";
import { CashflowEntriesTable } from "./CashflowEntries";
import { useQuery } from "@tanstack/react-query";
import {
  Contract,
  getContracts,
  getCashflowForecast,
  type CashflowRow,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";

// ---- helpers ---------------------------------------------------------------
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
// "YYYY-MM" -> "Oct 2025"
function labelFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}
// ----------------------------------------------------------------------------

export default function Contracts() {
  const { enabled } = useAuthEnabled();

  // Contracts for table + KPIs
  const {
    data: contracts = [],
    isFetching: loadingContracts,
    isError: errorContracts,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled, // ← only run when /api/me succeeded
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>, // ← guarantee an array
  });

  // Cashflow forecast (server-side aggregation)
  const {
    data: forecast = [],
    isFetching: loadingForecast,
    isError: errorForecast,
  } = useQuery<CashflowRow[]>({
    queryKey: ["cashflow-forecast"],
    queryFn: getCashflowForecast,
    enabled, // ← same gate
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<CashflowRow>, // ← guarantee an array
  });

  if (loadingContracts && contracts.length === 0) {
    return <div className="p-6">Lade Verträge…</div>;
  }
  if (errorContracts) {
    return (
      <div className="p-6 text-red-500">Fehler beim Laden der Verträge.</div>
    );
  }

  // KPIs (safe: contracts is always an array)
  const totalRevenue = contracts.reduce((sum, c) => sum + c.revenue_total, 0);
  const monthlyRecurring = contracts.reduce(
    (sum, c) => sum + c.monthly_amount,
    0
  );
  const activeContracts = contracts.length;
  const avgContractValue = activeContracts ? totalRevenue / activeContracts : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Verträge & Cashflow
          </h1>
          <p className="text-muted-foreground">
            Verträge verfolgen und Umsatzprognosen
          </p>
        </div>
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
                <p className="text-2xl font-bold">
                  €{totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gesamter Vertragswert
                </p>
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
                <p className="text-2xl font-bold">
                  €{monthlyRecurring.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Monatlich wiederkehrend
                </p>
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
                <p className="text-2xl font-bold">
                  €{Math.round(avgContractValue).toLocaleString()}
                </p>
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
              {contracts.map((contract) => {
                const progressPercent =
                  (contract.paid_months / contract.duration_months) * 100;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.client_name}
                    </TableCell>
                    <TableCell>{contract.start_date}</TableCell>
                    <TableCell>{contract.duration_months} Monate</TableCell>
                    <TableCell>
                      €{contract.revenue_total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {contract.payment_frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={progressPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {contract.paid_months}/{contract.duration_months}{" "}
                          Monate
                          {contract.next_due_date
                            ? ` • Nächste: ${contract.next_due_date}`
                            : ""}
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
              Cashflow Prognose (nächste 6 Monate)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingForecast && forecast.length === 0 ? (
              <div>Forecast wird geladen…</div>
            ) : errorForecast ? (
              <div className="text-red-500">
                Fehler beim Laden des Forecasts.
              </div>
            ) : forecast.length === 0 ? (
              <div className="text-muted-foreground">Keine Prognosedaten.</div>
            ) : (
              <div className="space-y-4">
                {forecast.map((row) => (
                  <div key={row.month} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {labelFromYm(row.month)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-success">
                          Bestätigt (Aktive Verträge)
                        </span>
                        <span>€{row.confirmed.toLocaleString()}</span>
                      </div>
                      {row.potential > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-warning">
                            Potentiell (Ausstehende Deals)
                          </span>
                          <span>€{row.potential.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
