// src/pages/Contracts.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricChip } from "@/components/MetricChip";
import { useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  Info,
} from "lucide-react";

import { CashflowHistoryTable } from "./CashflowHistoryTable";
import { useQuery } from "@tanstack/react-query";
import {
  Contract,
  getContracts,
  getCashflowForecast,
  type CashflowRow,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CashflowUpcomingTable } from "./CashflowUpcomingTable";
import { formatDateOnly } from "@/helpers/date";

/* ---------------- helpers ---------------- */

// add months to a YYYY-MM-DD string safely
function addMonthsIso(iso: string, m: number): string {
  const [y, mo, d] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setMonth(dt.getMonth() + m);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(dt.getDate()).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// count calendar months overlap between [a1, a2) and [b1, b2) (end exclusive)
function monthsOverlap(a1: Date, a2: Date, b1: Date, b2: Date): number {
  const s = a1 > b1 ? a1 : b1;
  const e = a2 < b2 ? a2 : b2;
  if (e <= s) return 0;
  const months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  // include current month if e is past the 1st
  const includeE = e.getDate() > 1 ? 1 : 0;
  return Math.max(0, months + includeE);
}

function labelFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

function euro(n: number) {
  return `€${Math.round(n).toLocaleString()}`;
}

/* --------------- page ------------------- */

export default function Contracts() {
  const { enabled } = useAuthEnabled();
  const [searchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");
  const navigate = useNavigate();

  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  console.log("Selected contract:", selectedContract);

  // Contracts for table + KPIs
  const {
    data: contracts = [],
    isFetching: loadingContracts,
    isError: errorContracts,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
  });

  // Cashflow forecast (server-side aggregation)
  const {
    data: forecast = [],
    isFetching: loadingForecast,
    isError: errorForecast,
  } = useQuery<CashflowRow[], Error>({
    queryKey: ["cashflow-forecast"],
    queryFn: ({ queryKey }) => {
      const [, id] = queryKey as [string, number?];
      return getCashflowForecast(id);
    },
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (d) => asArray<CashflowRow>(d),
  });

  const filteredContracts = useMemo(() => {
    if (!clientFilter) return contracts;
    return contracts.filter((c) => String(c.client_id) === clientFilter);
  }, [contracts, clientFilter]);

  useEffect(() => {
    const openParam = searchParams.get("open");
    if (openParam && filteredContracts.length > 0) {
      // automatically open the first contract for that client
      setSelectedContract(filteredContracts[0]);
    }
  }, [searchParams, filteredContracts]);

  if (loadingContracts && contracts.length === 0) {
    return <div className="p-6">Lade Verträge…</div>;
  }
  if (errorContracts) {
    return (
      <div className="p-6 text-red-500">Fehler beim Laden der Verträge.</div>
    );
  }

  /* ---------------- KPIs from contracts ---------------- */

  const totalRevenue = contracts.reduce((sum, c) => sum + c.revenue_total, 0);
  const monthlyRecurring = contracts.reduce(
    (sum, c) => sum + c.monthly_amount,
    0
  );
  const activeContracts = contracts.length;
  const avgContractValue = activeContracts ? totalRevenue / activeContracts : 0;

  /* ---- YTD average monthly cashflow (1.1. bis jetzt), REALIZED by paid_months ---- */
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1
  const monthsElapsedYtd = now.getMonth() + 1; // Jan..current month inclusive

  let ytdCashIn = 0;

  for (const c of contracts) {
    // contract active range
    const start = parseIso(c.start_date);
    const end = parseIso(addMonthsIso(c.start_date, c.duration_months)); // exclusive
    // overlap with current year
    const monthsActiveThisYear = monthsOverlap(start, end, startOfYear, now);
    if (monthsActiveThisYear <= 0) continue;
    // realized: use paid_months bounded by active months this year
    const paidInThisYear = Math.min(c.paid_months, monthsActiveThisYear);
    ytdCashIn += paidInThisYear * c.monthly_amount;
  }

  const avgMonthlyYtd =
    monthsElapsedYtd > 0 ? Math.round(ytdCashIn / monthsElapsedYtd) : 0;

  /* ---- Next 3 months (CONFIRMED ONLY) ---- */
  const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const futureMonths = (forecast ?? [])
    .filter((r) => r.month >= nowYm) // keep current & future months
    .sort((a, b) => a.month.localeCompare(b.month));

  const next3 = futureMonths.slice(0, 3);

  const next3Display = next3.map((r) => {
    const confirmed = Math.round(r.confirmed ?? 0);
    // Cashflow KPI should use confirmed only (no pipeline)
    const total = confirmed;

    return {
      ym: r.month,
      label: labelFromYm(r.month),
      confirmed,
      potential: Math.round(r.potential ?? 0), // kept for popover breakdown if desired
      total,
    };
  });

  const avgNext3 =
    next3Display.length > 0
      ? Math.round(
          next3Display.reduce((s, r) => s + r.total, 0) / next3Display.length
        )
      : 0;

  /* ----------------- Render ----------------- */

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

      {/* KPI chips inline (wrap to next line, no card row) */}
      <div className="flex flex-wrap items-stretch gap-3">
        <MetricChip
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={euro(totalRevenue)}
          label="Gesamter Vertragswert"
          popover={
            `Summe der revenue_total über alle aktiven Verträge\n` +
            `= ${
              contracts.map((c) => euro(c.revenue_total)).join(" + ") || "0"
            }\n` +
            `= ${euro(totalRevenue)}`
          }
        />

        <MetricChip
          icon={<FileText className="w-4 h-4" />}
          iconBg="bg-warning/10 text-warning"
          value={String(activeContracts)}
          label="Aktive Verträge"
          popover={`Anzahl aktiver Verträge = ${activeContracts}`}
        />

        <MetricChip
          icon={<Users className="w-4 h-4" />}
          iconBg="bg-accent/20 text-accent-foreground"
          value={euro(Math.round(avgContractValue))}
          label="Ø Vertragswert"
          popover={
            `Ø Vertragswert = Gesamt-Vertragswert / Anzahl Verträge\n` +
            `= ${euro(totalRevenue)} / ${activeContracts || 1}\n` +
            `= ${euro(Math.round(avgContractValue))}`
          }
        />

        <MetricChip
          icon={<Calendar className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={euro(avgMonthlyYtd)}
          label="Ø monatlicher Cashflow YTD"
          popover={
            `Zeitraum: 01.01.–heute (${monthsElapsedYtd} Monate)\n` +
            `YTD Cash-In (realisiert) ≈ Σ(min(paid_months, Monate aktiv in ${now.getFullYear()}) × monthly_amount)\n` +
            `= ${
              contracts.length
                ? contracts
                    .map((c) => {
                      const start = parseIso(c.start_date);
                      const end = parseIso(
                        addMonthsIso(c.start_date, c.duration_months)
                      );
                      const monthsActiveThisYear = monthsOverlap(
                        start,
                        end,
                        new Date(now.getFullYear(), 0, 1),
                        now
                      );
                      const paidInThisYear = Math.min(
                        c.paid_months,
                        monthsActiveThisYear
                      );
                      return `${paidInThisYear}×${euro(c.monthly_amount)}`;
                    })
                    .join(" + ")
                : "0"
            }\n` +
            `= ${euro(ytdCashIn)}\n` +
            `Ø/Monat YTD = ${euro(ytdCashIn)} / ${monthsElapsedYtd} = ${euro(
              avgMonthlyYtd
            )}`
          }
        />

        <MetricChip
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-primary/10 text-primary"
          value={next3Display.length ? euro(avgNext3) : "–"}
          label="Ø bestätigter Cashflow/Monat, nächste 3"
          popover={
            next3Display.length
              ? `Ø aus bestätigten Cashflows (ohne Potenzial)\n` +
                next3Display
                  .map((r) => `${r.label}: ${euro(r.confirmed)}`)
                  .join("\n") +
                `\nØ der nächsten 3 = (${next3Display
                  .map((r) => euro(r.confirmed))
                  .join(" + ")}) / ${next3Display.length} = ${euro(avgNext3)}`
              : "Keine Forecast-Daten für die nächsten 3 Monate."
          }
        />
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
                <TableHead>Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => {
                const progressPercent =
                  (contract.paid_months / contract.duration_months) * 100;
                return (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.client_name}
                    </TableCell>
                    <TableCell>
                      {contract.start_date
                        ? formatDateOnly(contract.start_date)
                        : "–"}
                    </TableCell>
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
                    <TableCell>
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Vertrag anzeigen
                      </button>
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
        <CashflowHistoryTable />
        <CashflowUpcomingTable />
      </div>
      {/* ✅ Contract Detail Drawer */}
      <Sheet
        open={!!selectedContract}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedContract(null);
            // clear client + open params so main list shows again
            navigate("/contracts");
          }
        }}
      >
        <SheetContent className="w-[600px] sm:max-w-full overflow-y-auto">
          {selectedContract && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Vertrag mit {selectedContract.client_name}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Laufzeit
                  </h3>
                  <p>{selectedContract.duration_months} Monate</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Startdatum
                  </h3>
                  <p>
                    {selectedContract.start_date
                      ? formatDateOnly(selectedContract.start_date)
                      : "–"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Zahlungsfrequenz
                  </h3>
                  <Badge variant="outline">
                    {selectedContract.payment_frequency}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Umsatz
                  </h3>
                  <p>€{selectedContract.revenue_total.toLocaleString()}</p>
                </div>

                {/* ------------- CashflowEntriesTable --------------*/}
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Zahlungsverlauf</h3>
                  <CashflowHistoryTable contractId={selectedContract.id} />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold">Prognose</h3>
                <CashflowUpcomingTable contractId={selectedContract.id} />{" "}
              </div>
              {/* ---------------- Upsell Section ---------------- */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upsell / Vertragsverlängerung
                </h3>

                <button
                  onClick={() => {
                    console.log(
                      "Upsell starten für Vertrag",
                      selectedContract.id
                    );
                  }}
                  className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Upsell planen
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
