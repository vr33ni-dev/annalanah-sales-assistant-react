export const queryKeys = {
  sales: ["sales"] as const,
  salesProcesses: ["sales-processes"] as const,
  stages: ["stages"] as const,
  leads: ["leads"] as const,
  clients: (includeInactive = false) =>
    ["clients", { includeInactive }] as const,
  comments: (entityType: string, entityId: number) =>
    ["comments", entityType, entityId] as const,
  commentsByClient: (clientId: number) =>
    ["comments", "client", clientId] as const,
  contracts: ["contracts"] as const,
  contractsList: (options?: { includeExpired?: boolean; compact?: boolean }) =>
    [
      "contracts",
      "list",
      {
        includeExpired: !!options?.includeExpired,
        compact: !!options?.compact,
      },
    ] as const,
  contract: (id: number) => ["contracts", id] as const,
  upsell: (salesProcessId?: number) => ["upsell", salesProcessId] as const,
  upsellsByDateRange: (startDate?: string, endDate?: string) =>
    ["upsells", startDate ?? "", endDate ?? ""] as const,
  settings: ["settings"] as const,
  setting: (key: string) => ["settings", key] as const,
  numericSetting: (key: string) => ["setting", key] as const,
  cashflow: ["cashflow"] as const,
  cashflowEntries: ["cashflow-entries"] as const,
  cashflowEntriesByContract: (contractId?: number) =>
    ["cashflow-entries", contractId] as const,
  cashflowForecast: ["cashflow-forecast"] as const,
  cashflowForecastByContract: (contractId?: number) =>
    ["cashflow-forecast", contractId] as const,
  cashflowMetrics: ["cashflow-metrics"] as const,
  monthlyKpis: (year: number) => ["monthly-kpis", year] as const,
  dashboardKpis: (params?: {
    startDate?: string;
    endDate?: string;
    scope?: "all-time" | "range";
  }) =>
    [
      "dashboard-kpis",
      {
        startDate: params?.startDate ?? "",
        endDate: params?.endDate ?? "",
        scope: params?.scope ?? "range",
      },
    ] as const,
  contractsInRange: (start: string, end: string, type: string) =>
    ["contracts-in-range", start, end, type] as const,
  stageParticipants: (stageId: number) =>
    ["stage-participants", stageId] as const,
};
