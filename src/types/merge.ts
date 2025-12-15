// src/types/merge.ts
import type { StartSalesProcessRequest } from "@/lib/api";

// --------------------
// Field-level conflicts
// --------------------
export type FieldConflict<T = string> = {
  existing: T | null;
  incoming: T | null;
};

// --------------------
// Merge Conflicts
// --------------------
export type MergeConflicts = {
  name?: FieldConflict<string>;
  phone?: FieldConflict<string>;
  source?: FieldConflict<string>;
};

// --------------------
// Client Exists Error Response
// --------------------
export type ClientExistsErrorResponse = {
  error: "client_exists";
  client_id: number;
  has_active_contract: boolean;
  conflicts: MergeConflicts;
  original_payload: StartSalesProcessRequest;
};

export type ClientHasActiveContractError = {
  error: "client_has_active_contract";
  client_id: number;
};

// --------------------
// Start Sales Process with Merge Strategy
// --------------------

export type StartSalesProcessWithMerge = StartSalesProcessRequest & {
  client_id: number;
  merge_strategy: "overwrite" | "keep_existing";
};
