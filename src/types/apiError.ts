import { StartSalesProcessRequest } from "@/lib/api";
import { MergeConflicts } from "./merge";

// src/types/apiError.ts
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

export type StartSalesProcessError = {
  error: "client_exists" | "client_has_active_contract";
  client_id: number;
  has_active_contract?: boolean;
  has_open_sales?: boolean;
  conflicts?: MergeConflicts;
  original_payload?: StartSalesProcessRequest;
};
