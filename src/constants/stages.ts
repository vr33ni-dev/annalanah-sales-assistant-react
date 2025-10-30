// src/constants/stages.ts
export const SALES_STAGE = {
  FOLLOW_UP: "follow_up",
  CLOSED: "closed",
  LOST: "lost",
} as const;

export type SalesStage = (typeof SALES_STAGE)[keyof typeof SALES_STAGE];
