import type { MergeConflicts } from "@/types/merge";
import type { StartSalesProcessRequest } from "@/lib/api";

// Generic fetch error wrapper
export type FetchError<T = unknown> = {
  response: {
    status: number;
    data: T;
  };
};

export function isFetchError<T = unknown>(err: unknown): err is FetchError<T> {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  );
}

// --- Specific API error payloads ---

export type ClientExistsError = {
  error: "client_exists";
  client_id: number;
  has_active_contract: boolean;
  conflicts: MergeConflicts;
  original_payload: StartSalesProcessRequest;
  overwrite_allowed: boolean;
  match_reason: "email" | "lead";
};

export type ClientHasActiveContractError = {
  error: "client_has_active_contract";
  client_id: number;
};

export type StartSalesProcessError =
  | ClientExistsError
  | ClientHasActiveContractError;
