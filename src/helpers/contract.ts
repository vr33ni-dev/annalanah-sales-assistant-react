import type { Contract } from "@/lib/api";
import type { ContractUpsell } from "@/lib/api";

/**
 * Robustly parse either YYYY-MM-DD or full ISO datetimes and return a
 * Date normalized to local start-of-day (time components zeroed).
 * Avoids timezone shifts caused by native Date parsing of ISO strings.
 */
export function toDateStartOfDay(input?: string | null): Date | null {
  if (!input) return null;
  const m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

/** Add months to a Date, mutating a copy. */
export function addMonthsDate(d: Date, months: number): Date {
  const dt = new Date(d.getTime());
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

/** Add months to a YYYY-MM-DD string safely. */
export function addMonthsIso(iso: string, m: number): string {
  const dateOnly = iso.split("T")[0];
  const [y, mo, d] = dateOnly.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setMonth(dt.getMonth() + m);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Compute the contract end date.
 * Prefers the server-provided end_date; falls back to start_date + duration_months.
 */
export function getContractEndDate(contract: {
  start_date?: string | null;
  end_date?: string | null;
  duration_months?: number | null;
}): Date | null {
  const start = toDateStartOfDay(contract.start_date ?? null);
  const endFromServer = toDateStartOfDay(contract.end_date ?? null);

  if (endFromServer) return endFromServer;
  if (!start || typeof contract.duration_months !== "number") return null;

  return addMonthsDate(start, contract.duration_months);
}

/** Returns true if the contract's end date is strictly before today (start of day). */
export function isContractExpired(
  contract: {
    start_date?: string | null;
    end_date?: string | null;
    duration_months?: number | null;
  },
  today: Date,
): boolean {
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const end = getContractEndDate(contract);
  return !!end && end < current;
}

/**
 * How many months of the contract have elapsed as of `today`.
 * Capped at `durationMonths` if provided. Minimum 1 once started.
 */
export function getElapsedContractMonths(
  startDate: string | null | undefined,
  today: Date,
  durationMonths?: number | null,
): number {
  const start = toDateStartOfDay(startDate);
  if (!start) return 0;

  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  if (start > current) return 0;

  let completedMonths =
    (current.getFullYear() - start.getFullYear()) * 12 +
    (current.getMonth() - start.getMonth());

  if (current.getDate() < start.getDate()) {
    completedMonths -= 1;
  }

  const currentContractMonth = Math.max(1, completedMonths + 1);

  if (typeof durationMonths === "number") {
    return Math.min(currentContractMonth, durationMonths);
  }

  return currentContractMonth;
}

/**
 * From a list of upsells for a sales process, return the one relevant to
 * the given contract: must match previous_contract_id and must not have
 * already produced a new contract (new_contract_id). Picks the most
 * recently updated among candidates.
 */
export function selectActiveUpsell(
  upsells: ContractUpsell[],
  contractId: number,
): ContractUpsell | null {
  const candidates = upsells.filter(
    (u) => u.previous_contract_id === contractId && !u.new_contract_id,
  );
  if (!candidates.length) return null;
  return candidates.reduce((a, b) =>
    (a.updated_at ?? "") >= (b.updated_at ?? "") ? a : b,
  );
}
