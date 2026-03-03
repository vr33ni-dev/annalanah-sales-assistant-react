import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contract, SalesProcess, ContractUpsell } from "@/lib/api";

interface MonthlyKPITableProps {
  contracts: Contract[];
  salesProcesses: SalesProcess[];
  upsells: ContractUpsell[];
}

interface MonthlyData {
  month: string;
  monthNum: number;
  revenue: number;
  newCustomerRevenue: number;
  renewalRevenue: number;
  closedDeals: number;
  closingRate: number | null;
}

const euro = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    n,
  );

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function MonthlyKPITable({
  contracts,
  salesProcesses,
  upsells,
}: MonthlyKPITableProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Parse YYYY-MM-DD or full ISO to a local Date (avoid timezone shifts)
  const parseIsoToLocal = (dateStr?: string | null): Date | null => {
    if (!dateStr) return null;
    const datePart = String(dateStr).split("T")[0];
    const parts = datePart.split("-").map((v) => Number(v));
    if (parts.length < 3) return null;
    const [y, m, d] = parts;
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  // Group upsells per client for renewal classification
  const upsellByClient: Record<number, ContractUpsell[]> = {};
  upsells.forEach((u) => {
    if (!upsellByClient[u.client_id]) upsellByClient[u.client_id] = [];
    upsellByClient[u.client_id].push(u);
  });

  function isRenewalProcess(sp: SalesProcess) {
    const clientUpsells = upsellByClient[sp.client_id] ?? [];
    if (!sp.follow_up_date) return false;
    const f = parseIsoToLocal(sp.follow_up_date);
    if (!f) return false;
    return clientUpsells.some((u) => {
      if (!u.upsell_date) return false;
      const uDate = parseIsoToLocal(u.upsell_date);
      if (!uDate) return false;
      return uDate < f;
    });
  }

  // Calculate monthly data
  const monthlyData: MonthlyData[] = [];

  for (let m = 0; m <= currentMonth; m++) {
    const monthStart = new Date(currentYear, m, 1);
    const monthEnd = new Date(currentYear, m + 1, 0);

    const inMonth = (dateStr?: string | null) => {
      const d = parseIsoToLocal(dateStr);
      if (!d) return false;
      return d >= monthStart && d <= monthEnd;
    };

    // Month basis:
    // - Abschlüsse (wins): completed_at month
    // - Abschlussquote (decided): closed true/false
    //   - wins bucketed by completed_at
    //   - losses bucketed by updated_at (fallback follow_up_date/created_at)

    const wonNewCustomerInMonth = salesProcesses.filter((sp) => {
      if (sp.closed !== true) return false;
      if (!sp.completed_at) return false;
      if (!inMonth(sp.completed_at)) return false;
      return !isRenewalProcess(sp);
    });

    const decidedNewCustomerInMonth = salesProcesses.filter((sp) => {
      if (sp.closed !== true && sp.closed !== false) return false;
      // Losses should only count if a follow-up call actually happened.
      if (sp.closed === false && sp.follow_up_result !== true) return false;

      const decisionDate =
        sp.closed === true
          ? sp.completed_at
          : (sp.updated_at ?? sp.follow_up_date ?? sp.created_at ?? null);
      if (!decisionDate) return false;
      if (!inMonth(decisionDate)) return false;
      return !isRenewalProcess(sp);
    });

    // New-customer revenue: use the sales process revenue for won deals in this month.
    const newCustomerRevenue = wonNewCustomerInMonth.reduce(
      (s, sp) => s + (sp.revenue ?? 0),
      0,
    );

    // Renewal revenue: successful upsells by upsell_date in this month.
    const renewalRevenue = upsells
      .filter((u) => {
        if (u.upsell_result !== "verlaengerung") return false;
        if (u.upsell_revenue == null) return false;
        return inMonth(u.upsell_date);
      })
      .reduce((s, u) => s + (u.upsell_revenue ?? 0), 0);

    const revenue = newCustomerRevenue + renewalRevenue;

    const closedDeals = wonNewCustomerInMonth.length;
    const closingRate =
      decidedNewCustomerInMonth.length > 0
        ? Math.round((closedDeals / decidedNewCustomerInMonth.length) * 100)
        : null;

    monthlyData.push({
      month: MONTH_NAMES[m],
      monthNum: m,
      revenue,
      newCustomerRevenue,
      renewalRevenue,
      closedDeals,
      closingRate,
    });
  }

  // Calculate trends (compare to previous month)
  const getTrend = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  const TrendIndicator = ({ value }: { value: number | null }) => {
    if (value === null)
      return <Minus className="w-3 h-3 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="w-3 h-3 text-success" />;
    if (value < 0) return <TrendingDown className="w-3 h-3 text-destructive" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monatlicher KPI-Vergleich {currentYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Monat</TableHead>
              <TableHead className="text-right">Gesamtumsatz</TableHead>
              <TableHead className="text-right">Neukunden</TableHead>
              <TableHead className="text-right">Verlängerungen</TableHead>
              <TableHead className="text-right">Abschlüsse</TableHead>
              <TableHead className="text-right">Abschlussquote</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((data, idx) => {
              const prev = monthlyData[idx - 1];
              const revenueTrend = getTrend(data.revenue, prev?.revenue);

              return (
                <TableRow
                  key={data.monthNum}
                  className={cn(
                    data.monthNum === currentMonth && "bg-accent/30",
                  )}
                >
                  <TableCell className="font-medium">{data.month}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{euro(data.revenue)}</span>
                      <TrendIndicator value={revenueTrend} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {euro(data.newCustomerRevenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {euro(data.renewalRevenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.closedDeals}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.closingRate !== null ? `${data.closingRate}%` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
