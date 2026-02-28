// src/components/CashflowUpcomingTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getCashflowForecast,
  getNumericSetting,
  type CashflowRow,
} from "@/lib/api";
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

  const { data: potentialMonths = 6 } = useQuery<number>({
    queryKey: ["setting", "potential_months"],
    queryFn: () => getNumericSetting("potential_months", 6),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const { data: avgRevenue = 600 } = useQuery<number>({
    queryKey: ["setting", "avg_revenue_per_contract"],
    queryFn: () => getNumericSetting("avg_revenue_per_contract", 600),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const showPotential = !contractId; // only show potential if all contracts view

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {contractId
            ? `Cashflow Prognose (dieser Vertrag – nächste ${potentialMonths} Monate)`
            : `Cashflow Prognose (alle Verträge – nächste ${potentialMonths} Monate)`}
        </CardTitle>
        <div className="mt-2 text-sm text-muted-foreground space-y-1">
          <div>
            <strong>Bestätigt:</strong> Verbindliche Zahlungen der nächsten{" "}
            {potentialMonths} Monate aus bestehenden Verträgen.
          </div>
          {showPotential && (
            <div>
              <strong>Potenziell:</strong> Erwartetes Umsatzpotenzial aus
              offenen Deals (verteilt über {potentialMonths} Monate, aktuell
              berechnet mit Ø €{avgRevenue} pro Teilnehmer)
            </div>
          )}
        </div>
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
            {forecast.slice(0, potentialMonths).map((row) => {
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
