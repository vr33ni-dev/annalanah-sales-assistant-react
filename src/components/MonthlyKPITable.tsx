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
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

export function MonthlyKPITable({ contracts, salesProcesses, upsells }: MonthlyKPITableProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Group upsells per client for renewal classification
  const upsellByClient: Record<number, ContractUpsell[]> = {};
  upsells.forEach((u) => {
    if (!upsellByClient[u.client_id]) upsellByClient[u.client_id] = [];
    upsellByClient[u.client_id].push(u);
  });

  function isRenewalProcess(sp: SalesProcess) {
    const clientUpsells = upsellByClient[sp.client_id] ?? [];
    if (!sp.follow_up_date) return false;
    const f = new Date(sp.follow_up_date);
    return clientUpsells.some((u) => {
      if (!u.upsell_date) return false;
      return new Date(u.upsell_date) < f;
    });
  }

  // Calculate monthly data
  const monthlyData: MonthlyData[] = [];

  for (let m = 0; m <= currentMonth; m++) {
    const monthStart = new Date(currentYear, m, 1);
    const monthEnd = new Date(currentYear, m + 1, 0);

    const inMonth = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    };

    // Contracts started in this month
    const monthContracts = contracts.filter((c) => inMonth(c.start_date));
    const revenue = monthContracts.reduce((s, c) => s + (c.revenue_total ?? 0), 0);

    // New customer revenue
    const newCustomerRevenue = monthContracts
      .filter((c) => {
        const sp = salesProcesses.find((s) => s.id === c.sales_process_id);
        if (!sp) return false;
        return !isRenewalProcess(sp);
      })
      .reduce((s, c) => s + (c.revenue_total ?? 0), 0);

    // Renewal revenue (upsells in this month)
    const renewalRevenue = upsells
      .filter((u) => inMonth(u.upsell_date) && u.upsell_revenue)
      .reduce((s, u) => s + (u.upsell_revenue ?? 0), 0);

    // Sales processes with follow-up in this month
    const monthCalls = salesProcesses.filter(
      (sp) => sp.follow_up_date && inMonth(sp.follow_up_date) && !isRenewalProcess(sp)
    );
    const appeared = monthCalls.filter((sp) => sp.follow_up_result === true).length;
    const closedDeals = monthCalls.filter((sp) => sp.closed === true).length;
    const closingRate = appeared > 0 ? Math.round((closedDeals / appeared) * 100) : null;

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
    if (value === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
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
                    data.monthNum === currentMonth && "bg-accent/30"
                  )}
                >
                  <TableCell className="font-medium">{data.month}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span>{euro(data.revenue)}</span>
                      <TrendIndicator value={revenueTrend} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{euro(data.newCustomerRevenue)}</TableCell>
                  <TableCell className="text-right">{euro(data.renewalRevenue)}</TableCell>
                  <TableCell className="text-right">{data.closedDeals}</TableCell>
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
