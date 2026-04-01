import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  getStatusFilterLabel,
  useSalesProcessFilters,
  STATUS_FILTER_OPTIONS,
} from "../useSalesProcessFilters";
import { SALES_STAGE } from "@/constants/stages";
import type { SalesProcessWithStageId } from "../useSalesProcessFilters";

// ─── helpers ──────────────────────────────────────────────────────────────────

const today = new Date();

function makeEntry(overrides: Partial<SalesProcessWithStageId> = {}): SalesProcessWithStageId {
  return {
    id: 1,
    client_id: 1,
    client_name: "Test User",
    stage: SALES_STAGE.INITIAL_CONTACT,
    initial_contact_date: null,
    follow_up_date: null,
    follow_up_result: null,
    client_source: "organic",
    ...overrides,
  };
}

function daysFromNow(delta: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── getStatusFilterLabel ─────────────────────────────────────────────────────

describe("getStatusFilterLabel", () => {
  describe("INITIAL_CONTACT stage", () => {
    it("returns 'erstgespräch' when initial contact is in the future", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.INITIAL_CONTACT,
        initial_contact_date: daysFromNow(5),
        follow_up_date: null,
      });
      expect(getStatusFilterLabel(entry)).toBe("erstgespräch");
    });

    it("returns 'erstgespräch abgeschlossen' when initial contact is in the past and no follow-up yet", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.INITIAL_CONTACT,
        initial_contact_date: daysFromNow(-3),
        follow_up_date: daysFromNow(10),
      });
      expect(getStatusFilterLabel(entry)).toBe("erstgespräch abgeschlossen");
    });

    it("returns 'erstgespräch abgeschlossen' when initial contact is in the past and no follow-up date", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.INITIAL_CONTACT,
        initial_contact_date: daysFromNow(-3),
        follow_up_date: null,
      });
      expect(getStatusFilterLabel(entry)).toBe("erstgespräch abgeschlossen");
    });

    it("returns 'erstgespräch' when no initial_contact_date is set", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.INITIAL_CONTACT,
        initial_contact_date: null,
      });
      expect(getStatusFilterLabel(entry)).toBe("erstgespräch");
    });
  });

  describe("FOLLOW_UP stage", () => {
    it("returns 'zweitgespräch geplant' when follow_up_result is null", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.FOLLOW_UP,
        follow_up_result: null,
      });
      expect(getStatusFilterLabel(entry)).toBe("zweitgespräch geplant");
    });

    it("returns 'zweitgespräch abgeschlossen' when follow_up_result is set", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.FOLLOW_UP,
        follow_up_result: true,
      });
      expect(getStatusFilterLabel(entry)).toBe("zweitgespräch abgeschlossen");
    });

    it("returns 'zweitgespräch abgeschlossen' when follow_up_result is false", () => {
      const entry = makeEntry({
        stage: SALES_STAGE.FOLLOW_UP,
        follow_up_result: false,
      });
      expect(getStatusFilterLabel(entry)).toBe("zweitgespräch abgeschlossen");
    });
  });

  describe("CLOSED stage", () => {
    it("returns 'abgeschlossen'", () => {
      const entry = makeEntry({ stage: SALES_STAGE.CLOSED });
      expect(getStatusFilterLabel(entry)).toBe("abgeschlossen");
    });
  });

  describe("LOST stage", () => {
    it("returns 'verloren'", () => {
      const entry = makeEntry({ stage: SALES_STAGE.LOST });
      expect(getStatusFilterLabel(entry)).toBe("verloren");
    });
  });
});

// ─── useSalesProcessFilters ───────────────────────────────────────────────────

describe("useSalesProcessFilters", () => {
  const initialContactFuture = makeEntry({
    id: 1,
    stage: SALES_STAGE.INITIAL_CONTACT,
    initial_contact_date: daysFromNow(5),
    follow_up_date: daysFromNow(10),
    client_source: "organic",
  });

  const initialContactPast = makeEntry({
    id: 2,
    stage: SALES_STAGE.INITIAL_CONTACT,
    initial_contact_date: daysFromNow(-5),
    follow_up_date: daysFromNow(3),
    client_source: "organic",
  });

  const followUpPlanned = makeEntry({
    id: 3,
    stage: SALES_STAGE.FOLLOW_UP,
    follow_up_date: daysFromNow(2),
    follow_up_result: null,
    client_source: "paid",
  });

  const followUpDone = makeEntry({
    id: 4,
    stage: SALES_STAGE.FOLLOW_UP,
    follow_up_date: daysFromNow(-1),
    follow_up_result: true,
    client_source: "paid",
  });

  const closedEntry = makeEntry({
    id: 5,
    stage: SALES_STAGE.CLOSED,
    client_source: "organic",
  });

  const lostEntry = makeEntry({
    id: 6,
    stage: SALES_STAGE.LOST,
    client_source: "paid",
  });

  const allEntries = [
    initialContactFuture,
    initialContactPast,
    followUpPlanned,
    followUpDone,
    closedEntry,
    lostEntry,
  ];

  it("returns all items unfiltered by default", () => {
    const { result } = renderHook(() => useSalesProcessFilters(allEntries));
    expect(result.current.filteredEntries).toHaveLength(allEntries.length);
  });

  it("exports STATUS_FILTER_OPTIONS constant", () => {
    const { result } = renderHook(() => useSalesProcessFilters([]));
    expect(result.current.STATUS_FILTER_OPTIONS).toBe(STATUS_FILTER_OPTIONS);
  });

  describe("status filtering", () => {
    it("filters by a single status", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleStatusFilter("abgeschlossen"));
      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].id).toBe(5);
    });

    it("toggleStatusFilter adds and removes a filter", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleStatusFilter("verloren"));
      expect(result.current.activeStatusFilters).toContain("verloren");
      act(() => result.current.toggleStatusFilter("verloren"));
      expect(result.current.activeStatusFilters).not.toContain("verloren");
    });

    it("filters by multiple statuses (OR logic)", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => {
        result.current.toggleStatusFilter("abgeschlossen");
        result.current.toggleStatusFilter("verloren");
      });
      expect(result.current.filteredEntries).toHaveLength(2);
    });

    it("statusFilter is 'all' when multiple statuses are selected", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => {
        result.current.toggleStatusFilter("abgeschlossen");
        result.current.toggleStatusFilter("verloren");
      });
      expect(result.current.statusFilter).toBe("all");
    });

    it("statusFilter equals the single selected value", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleStatusFilter("verloren"));
      expect(result.current.statusFilter).toBe("verloren");
    });

    it("setActiveStatusFilters replaces the entire filter array", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() =>
        result.current.setActiveStatusFilters(["abgeschlossen", "verloren"])
      );
      expect(result.current.activeStatusFilters).toEqual([
        "abgeschlossen",
        "verloren",
      ]);
    });
  });

  describe("source filtering", () => {
    it("filters by source 'organic'", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleSourceFilter("organic"));
      const organicIds = result.current.filteredEntries.map((e) => e.id);
      expect(organicIds).toContain(1);
      expect(organicIds).toContain(2);
      expect(organicIds).toContain(5);
      expect(organicIds).not.toContain(3); // paid
      expect(organicIds).not.toContain(4); // paid
    });

    it("filters by source 'paid'", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleSourceFilter("paid"));
      const paidIds = result.current.filteredEntries.map((e) => e.id);
      expect(paidIds).toContain(3);
      expect(paidIds).toContain(4);
      expect(paidIds).toContain(6);
    });

    it("toggleSourceFilter removes already-active source", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.toggleSourceFilter("organic"));
      act(() => result.current.toggleSourceFilter("organic"));
      expect(result.current.activeSourceFilters).not.toContain("organic");
      expect(result.current.filteredEntries).toHaveLength(allEntries.length);
    });

    it("excludes entries with null client_source when source filter is active", () => {
      const nullSourceEntry = makeEntry({ id: 99, client_source: null });
      const { result } = renderHook(() =>
        useSalesProcessFilters([...allEntries, nullSourceEntry])
      );
      act(() => result.current.toggleSourceFilter("organic"));
      const ids = result.current.filteredEntries.map((e) => e.id);
      expect(ids).not.toContain(99);
    });
  });

  describe("date filtering", () => {
    it("dateFilter defaults to 'all'", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      expect(result.current.dateFilter).toBe("all");
    });

    it("filters 'upcoming' follow-up dates", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.setDateFilter("upcoming"));
      // followUpPlanned (daysFromNow(2)) and initialContactPast (daysFromNow(3)) have future follow_up_date
      // initialContactFuture (daysFromNow(10)) also has a future follow_up_date
      result.current.filteredEntries.forEach((e) => {
        const d = new Date(e.follow_up_date!);
        expect(d.getTime()).toBeGreaterThan(today.getTime());
      });
    });

    it("filters 'past' follow-up dates", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => result.current.setDateFilter("past"));
      // followUpDone has follow_up_date in the past
      result.current.filteredEntries.forEach((e) => {
        expect(e.follow_up_date).toBeTruthy();
      });
    });

    it("excludes entries without a follow_up_date when date filter is active", () => {
      const noDateEntry = makeEntry({ id: 77, follow_up_date: null });
      const { result } = renderHook(() =>
        useSalesProcessFilters([...allEntries, noDateEntry])
      );
      act(() => result.current.setDateFilter("upcoming"));
      const ids = result.current.filteredEntries.map((e) => e.id);
      expect(ids).not.toContain(77);
    });

    it("filters 'today'", () => {
      const todayEntry = makeEntry({
        id: 88,
        follow_up_date: daysFromNow(0),
      });
      const { result } = renderHook(() =>
        useSalesProcessFilters([...allEntries, todayEntry])
      );
      act(() => result.current.setDateFilter("today"));
      const ids = result.current.filteredEntries.map((e) => e.id);
      expect(ids).toContain(88);
    });
  });

  describe("combined filters", () => {
    it("applies status and source filters together", () => {
      const { result } = renderHook(() => useSalesProcessFilters(allEntries));
      act(() => {
        result.current.toggleStatusFilter("verloren");
        result.current.toggleSourceFilter("paid");
      });
      // Only lostEntry (id=6, stage=LOST, source=paid) matches both
      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].id).toBe(6);
    });
  });
});
