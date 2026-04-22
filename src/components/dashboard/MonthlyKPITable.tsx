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
import { getMonthlyKPIs } from "@/lib/api";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { queryKeys } from "@/lib/queryKeys";

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

export function MonthlyKPITable() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const { data: apiRows = [] } = useMockableQuery({
    queryKey: queryKeys.monthlyKpis(currentYear),
    queryFn: () => getMonthlyKPIs(currentYear),
    mockData: [],
  });

  // month from API is 1-based; only show months up to and including current
  const monthlyData = apiRows
    .filter((r) => r.month <= currentMonth + 1)
    .map((r) => ({
      month: MONTH_NAMES[r.month - 1],
      monthNum: r.month - 1,
      revenue: r.revenue,
      closedDeals: r.closed_deals,
      closingRate: r.closing_rate,
    }));

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
              <TableHead className="text-right">
                Gesamtumsatz (abzgl MwSt)
              </TableHead>
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
