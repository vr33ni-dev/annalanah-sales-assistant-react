import { SALES_STAGE } from "./stages";

export const STAGE_LABELS: Record<
  (typeof SALES_STAGE)[keyof typeof SALES_STAGE],
  string
> = {
  [SALES_STAGE.ERSTGESPRAECH]: "Erstgespräch",
  [SALES_STAGE.FOLLOW_UP]: "Zweitgespräch",
  [SALES_STAGE.CLOSED]: "Abgeschlossen",
  [SALES_STAGE.LOST]: "Verloren",
};
