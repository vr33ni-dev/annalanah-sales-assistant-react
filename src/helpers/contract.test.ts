import { describe, it, expect } from "vitest";
import type { ContractUpsell } from "@/lib/api";
import {
  toDateStartOfDay,
  addMonthsIso,
  getContractEndDate,
  isContractExpired,
  getElapsedContractMonths,
  selectActiveUpsell,
} from "./contract";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUpsell(overrides: Partial<ContractUpsell> = {}): ContractUpsell {
  return {
    id: 1,
    sales_process_id: 10,
    client_id: 5,
    upsell_date: null,
    upsell_result: null,
    upsell_revenue: null,
    previous_contract_id: null,
    new_contract_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    contract_start_date: null,
    contract_duration_months: null,
    contract_frequency: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toDateStartOfDay
// ---------------------------------------------------------------------------

describe("toDateStartOfDay", () => {
  it("parses YYYY-MM-DD string to local midnight", () => {
    const result = toDateStartOfDay("2024-06-15");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2024);
    expect(result!.getMonth()).toBe(5); // June = 5
    expect(result!.getDate()).toBe(15);
    expect(result!.getHours()).toBe(0);
    expect(result!.getMinutes()).toBe(0);
  });

  it("parses full ISO datetime string using only the date portion", () => {
    const result = toDateStartOfDay("2024-03-20T14:30:00Z");
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2024);
    expect(result!.getMonth()).toBe(2); // March = 2
    expect(result!.getDate()).toBe(20);
    expect(result!.getHours()).toBe(0);
  });

  it("returns null for null input", () => {
    expect(toDateStartOfDay(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toDateStartOfDay(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(toDateStartOfDay("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// addMonthsIso
// ---------------------------------------------------------------------------

describe("addMonthsIso", () => {
  it("adds months within the same year", () => {
    expect(addMonthsIso("2024-03-01", 3)).toBe("2024-06-01");
  });

  it("wraps into the next year", () => {
    expect(addMonthsIso("2024-11-01", 3)).toBe("2025-02-01");
  });

  it("handles the start of a year", () => {
    expect(addMonthsIso("2024-01-01", 12)).toBe("2025-01-01");
  });

  it("handles ISO datetime input (strips time portion)", () => {
    expect(addMonthsIso("2024-06-01T10:00:00Z", 1)).toBe("2024-07-01");
  });
});

// ---------------------------------------------------------------------------
// getContractEndDate
// ---------------------------------------------------------------------------

describe("getContractEndDate", () => {
  it("prefers end_date if provided", () => {
    const result = getContractEndDate({
      start_date: "2024-01-01",
      end_date: "2025-01-01",
      duration_months: 24,
    });
    // Should return 2025-01-01, NOT 2026-01-01
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(0); // January
    expect(result!.getDate()).toBe(1);
  });

  it("falls back to start_date + duration_months when end_date is absent", () => {
    const result = getContractEndDate({
      start_date: "2024-01-01",
      end_date: null,
      duration_months: 12,
    });
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(0);
    expect(result!.getDate()).toBe(1);
  });

  it("returns null when neither end_date nor start_date is provided", () => {
    expect(
      getContractEndDate({
        start_date: null,
        end_date: null,
        duration_months: 12,
      }),
    ).toBeNull();
  });

  it("returns null when start_date is given but duration_months is missing", () => {
    expect(
      getContractEndDate({
        start_date: "2024-01-01",
        end_date: null,
        duration_months: null,
      }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isContractExpired
// ---------------------------------------------------------------------------

describe("isContractExpired", () => {
  const today = new Date(2024, 5, 15); // 2024-06-15

  it("returns true for a contract that ended yesterday", () => {
    expect(
      isContractExpired(
        { start_date: "2024-01-01", end_date: "2024-06-14" },
        today,
      ),
    ).toBe(true);
  });

  it("returns false for a contract that ends today", () => {
    expect(
      isContractExpired(
        { start_date: "2024-01-01", end_date: "2024-06-15" },
        today,
      ),
    ).toBe(false);
  });

  it("returns false for a contract that ends in the future", () => {
    expect(
      isContractExpired(
        { start_date: "2024-01-01", end_date: "2025-06-15" },
        today,
      ),
    ).toBe(false);
  });

  it("returns false when end date cannot be determined", () => {
    expect(
      isContractExpired(
        { start_date: null, end_date: null, duration_months: null },
        today,
      ),
    ).toBe(false);
  });

  it("uses duration_months fallback correctly", () => {
    // Starts 2023-06-15, duration 12 months → ends 2024-06-15 → not expired on that day
    expect(
      isContractExpired(
        { start_date: "2023-06-15", end_date: null, duration_months: 12 },
        today,
      ),
    ).toBe(false);

    // Starts 2023-06-14, duration 12 months → ends 2024-06-14 → expired
    expect(
      isContractExpired(
        { start_date: "2023-06-14", end_date: null, duration_months: 12 },
        today,
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getElapsedContractMonths
// ---------------------------------------------------------------------------

describe("getElapsedContractMonths", () => {
  const today = new Date(2024, 5, 15); // 2024-06-15

  it("returns 0 when start_date is in the future", () => {
    expect(getElapsedContractMonths("2025-01-01", today)).toBe(0);
  });

  it("returns 0 when start_date is null", () => {
    expect(getElapsedContractMonths(null, today)).toBe(0);
  });

  it("returns 1 on the start day itself", () => {
    expect(getElapsedContractMonths("2024-06-15", today)).toBe(1);
  });

  it("returns correct month count mid-contract (same day of month)", () => {
    // Started 2024-01-15, today is 2024-06-15 → 5 complete months + current = month 6
    expect(getElapsedContractMonths("2024-01-15", today)).toBe(6);
  });

  it("returns correct month count when today is before the day-of-month", () => {
    // Started 2024-01-20, today is 2024-06-15 → only 4 complete months → month 5
    expect(getElapsedContractMonths("2024-01-20", today)).toBe(5);
  });

  it("caps at duration_months", () => {
    // Started 2022-06-15, 24 months → would compute 25, should cap at 24
    expect(getElapsedContractMonths("2022-06-15", today, 24)).toBe(24);
  });

  it("does not cap when result is within duration", () => {
    expect(getElapsedContractMonths("2024-01-15", today, 24)).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// selectActiveUpsell
// ---------------------------------------------------------------------------

describe("selectActiveUpsell", () => {
  const contractId = 42;

  it("returns null for an empty list", () => {
    expect(selectActiveUpsell([], contractId)).toBeNull();
  });

  it("returns null when no upsell matches the contractId", () => {
    const u = makeUpsell({ previous_contract_id: 99, new_contract_id: null });
    expect(selectActiveUpsell([u], contractId)).toBeNull();
  });

  it("returns null when the matching upsell already has a new_contract_id", () => {
    const u = makeUpsell({
      previous_contract_id: contractId,
      new_contract_id: 200,
    });
    expect(selectActiveUpsell([u], contractId)).toBeNull();
  });

  it("returns the matching upsell when exactly one candidate", () => {
    const u = makeUpsell({
      id: 7,
      previous_contract_id: contractId,
      new_contract_id: null,
    });
    expect(selectActiveUpsell([u], contractId)?.id).toBe(7);
  });

  it("picks the most recently updated candidate when multiple match", () => {
    const older = makeUpsell({
      id: 1,
      previous_contract_id: contractId,
      new_contract_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    });
    const newer = makeUpsell({
      id: 2,
      previous_contract_id: contractId,
      new_contract_id: null,
      updated_at: "2024-06-01T00:00:00Z",
    });
    expect(selectActiveUpsell([older, newer], contractId)?.id).toBe(2);
    expect(selectActiveUpsell([newer, older], contractId)?.id).toBe(2);
  });

  it("excludes upsells with new_contract_id while keeping open ones", () => {
    const closed = makeUpsell({
      id: 1,
      previous_contract_id: contractId,
      new_contract_id: 100,
      updated_at: "2024-06-15T00:00:00Z",
    });
    const open = makeUpsell({
      id: 2,
      previous_contract_id: contractId,
      new_contract_id: null,
      updated_at: "2024-01-01T00:00:00Z",
    });
    expect(selectActiveUpsell([closed, open], contractId)?.id).toBe(2);
  });
});
