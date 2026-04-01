// src/components/CashflowUpcomingTable.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  Contract,
  getContractById,
  getCashflowForecast,
  getContracts,
  getNumericSetting,
  type CashflowRow,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockContracts, mockCashflowForecast } from "@/lib/mockData";
import { asArray } from "@/lib/safe";
import { extractYmd, formatMonthLabel, toYmdLocal } from "@/helpers/date";
import { queryKeys } from "@/lib/queryKeys";

export function CashflowUpcomingTable({ contractId }: { contractId?: number }) {
  const { enabled } = useAuthEnabled();
  const isContractView = typeof contractId === "number";

  const {
    data: forecast = [],
    isFetching: isFetchingForecast,
    isError: isErrorForecast,
  } = useMockableQuery<CashflowRow[]>({
    queryKey: queryKeys.cashflowForecastByContract(contractId),
    queryFn: () => getCashflowForecast(contractId),
    enabled: !isContractView,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<CashflowRow>,
    mockData: mockCashflowForecast as CashflowRow[],
  });

  const {
    data: contracts = [],
    isFetching: isFetchingContracts,
    isError: isErrorContracts,
  } = useMockableQuery<Contract[]>({
    queryKey: queryKeys.contractsList({ compact: true }),
    queryFn: () => getContracts({ compact: true }),
    enabled: !isContractView,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Contract>,
    mockData: mockContracts,
  });

  const {
    data: contractDetail,
    isFetching: isFetchingContractDetail,
    isError: isErrorContractDetail,
  } = useMockableQuery<Contract | null>({
    queryKey: contractId ? queryKeys.contract(contractId) : ["contract", null],
    queryFn: () =>
      typeof contractId === "number" ? getContractById(contractId) : null,
    enabled: isContractView,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: (contract) => contract ?? null,
    mockData:
      typeof contractId === "number"
        ? (mockContracts.find((contract) => contract.id === contractId) ?? null)
        : null,
  });

  const { data: potentialMonths = 6 } = useQuery<number>({
    queryKey: queryKeys.numericSetting("potential_months"),
    queryFn: () => getNumericSetting("potential_months", 6),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const { data: avgRevenue = 600 } = useQuery<number>({
    queryKey: queryKeys.numericSetting("avg_revenue_per_contract"),
    queryFn: () => getNumericSetting("avg_revenue_per_contract", 600),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  const showPotential = !contractId; // only show potential if all contracts view
  const selectedContract =
    contractDetail ??
    (typeof contractId === "number"
      ? contracts.find((contract) => contract.id === contractId)
      : undefined);

  const rows = useMemo(() => {
    if (!isContractView) return forecast;

    const entries = Array.isArray(selectedContract?.cashflow)
      ? selectedContract.cashflow
      : [];

    if (entries.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYmd = toYmdLocal(today);

    const byMonth = new Map<string, number>();

    for (const entry of entries) {
      const amount = Number(entry?.amount ?? NaN);
      if (!entry?.due_date || !Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      const dueYmd = extractYmd(entry.due_date);
      if (!dueYmd) continue;
      if (dueYmd <= todayYmd) continue;

      const ym = dueYmd.slice(0, 7);
      byMonth.set(ym, (byMonth.get(ym) ?? 0) + amount);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, confirmed: amount, potential: 0 }));
  }, [forecast, isContractView, selectedContract?.cashflow]);

  const isFetching = isContractView
    ? isFetchingContractDetail
    : isFetchingForecast;
  const isError = isContractView ? isErrorContractDetail : isErrorForecast;

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
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground">Keine Prognosedaten.</div>
        ) : (
          <div className="space-y-4">
            {rows.slice(0, potentialMonths).map((row) => {
              const total = showPotential
                ? Math.round((row.confirmed ?? 0) + (row.potential ?? 0))
                : Math.round(row.confirmed ?? 0);

              return (
                <div key={row.month} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {formatMonthLabel(row.month)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {/* Always show confirmed */}
                    <div className="flex justify-between text-sm">
                      <span className="text-success">
                        {isContractView ? "Geplant" : "Bestätigt"}
                      </span>
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
