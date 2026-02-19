// src/constants/stages.ts
export const SALES_STAGE = {
  ERSTGESPRAECH: "erstgespraech",
  FOLLOW_UP: "follow_up",
  CLOSED: "closed",
  LOST: "lost",
} as const;

export type SalesStage = (typeof SALES_STAGE)[keyof typeof SALES_STAGE];

// ✅ Add readable labels for UI display (used in getSalesProcesses)
export const STAGE_LABELS: Record<SalesStage, string> = {
  erstgespraech: "Erstgespräch",
  follow_up: "Follow-up",
  closed: "Abgeschlossen",
  lost: "Verloren",
};
