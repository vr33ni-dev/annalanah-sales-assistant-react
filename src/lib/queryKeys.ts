export const queryKeys = {
  sales: ["sales"] as const,
  stages: ["stages"] as const,
  leads: ["leads"] as const,
  clients: ["clients"] as const,
  comments: (entityType: string, entityId: number) =>
    ["comments", entityType, entityId] as const,
  contracts: ["contracts"] as const,
  contract: (id: number) => ["contracts", id] as const,
  upsell: (salesProcessId?: number) => ["upsell", salesProcessId] as const,
  settings: ["settings"] as const,
  setting: (key: string) => ["settings", key] as const,
  cashflow: ["cashflow"] as const,
  stageParticipants: (stageId: number) =>
    ["stage-participants", stageId] as const,
};
