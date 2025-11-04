// src/components/CashflowUpcomingTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCashflowForecast, type CashflowRow } from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";

function labelFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

export function CashflowUpcomingTable({ contractId }: { contractId?: number }) {
  const { enabled } = useAuthEnabled();

  const {
    data: forecast = [],
    isFetching,
    isError,
  } = useQuery<CashflowRow[]>({
    queryKey: ["cashflow-forecast", contractId],
    queryFn: ({ queryKey }) =>
      getCashflowForecast(queryKey[1] as number | undefined),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<CashflowRow>,
  });

  const showPotential = !contractId; // only show potential if all contracts view

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {contractId
            ? "Cashflow Prognose (dieser Vertrag – nächste 6 Monate)"
            : "Cashflow Prognose (alle Verträge – nächste 6 Monate)"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFetching && forecast.length === 0 ? (
          <div>Forecast wird geladen…</div>
        ) : isError ? (
          <div className="text-red-500">Fehler beim Laden des Forecasts.</div>
        ) : forecast.length === 0 ? (
          <div className="text-muted-foreground">Keine Prognosedaten.</div>
        ) : (
          <div className="space-y-4">
            {forecast.map((row) => {
              const total = showPotential
                ? Math.round((row.confirmed ?? 0) + (row.potential ?? 0))
                : Math.round(row.confirmed ?? 0);

              return (
                <div key={row.month} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {labelFromYm(row.month)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* Always show confirmed */}
                    <div className="flex justify-between text-sm">
                      <span className="text-success">Bestätigt</span>
                      <span>€{row.confirmed.toLocaleString()}</span>
                    </div>

                    {/* Show potential and total only in all-contract view */}
                    {showPotential && (
                      <>
                        {row.potential > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-warning">Potenziell</span>
                            <span>€{row.potential.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            Gesamt (Bestätigt + Potenziell)
                          </span>
                          <span className="font-medium">
                            €{total.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
