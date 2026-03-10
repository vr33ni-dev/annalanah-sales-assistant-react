import { useMemo, useState } from "react";
import { SALES_STAGE } from "@/constants/stages";
import type { SalesProcess } from "@/lib/api";
import { parseIsoToLocal } from "@/helpers/date";

export type SalesProcessWithStageId = SalesProcess & {
  stage_id?: number | null;
  source_stage_name?: string | null;
};

export const STATUS_FILTER_OPTIONS = [
  "erstgespräch",
  "erstgespräch abgeschlossen",
  "zweitgespräch geplant",
  "zweitgespräch abgeschlossen",
  "abgeschlossen",
  "verloren",
] as const;

export type ActiveStatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];
export type StatusFilter = "all" | ActiveStatusFilter;
export type DateFilterType = "all" | "past" | "upcoming" | "today";

export function getStatusFilterLabel(
  entry: SalesProcessWithStageId,
): ActiveStatusFilter {
  const now = new Date();
  const initialContactDate = parseIsoToLocal(entry.initial_contact_date);
  const followUpDate = parseIsoToLocal(entry.follow_up_date);

  if (entry.stage === SALES_STAGE.INITIAL_CONTACT) {
    if (initialContactDate && initialContactDate > now) {
      return "erstgespräch";
    }
    if (initialContactDate && (!followUpDate || followUpDate > now)) {
      return "erstgespräch abgeschlossen";
    }
    return "erstgespräch";
  }

  if (entry.stage === SALES_STAGE.FOLLOW_UP) {
    return (entry.follow_up_result ?? null) == null
      ? "zweitgespräch geplant"
      : "zweitgespräch abgeschlossen";
  }

  return entry.stage === SALES_STAGE.CLOSED ? "abgeschlossen" : "verloren";
}

export function useSalesProcessFilters(sales: SalesProcessWithStageId[]) {
  const [activeStatusFilters, setActiveStatusFilters] = useState<
    ActiveStatusFilter[]
  >([]);
  const [activeSourceFilters, setActiveSourceFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");

  const statusFilter: StatusFilter =
    activeStatusFilters.length === 1 ? activeStatusFilters[0] : "all";

  const toggleStatusFilter = (
    value: (typeof STATUS_FILTER_OPTIONS)[number],
  ) => {
    setActiveStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleSourceFilter = (value: string) => {
    setActiveSourceFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const filteredEntries = useMemo(() => {
    let result = sales;

    if (activeStatusFilters.length > 0) {
      result = result.filter((entry) =>
        activeStatusFilters.includes(getStatusFilterLabel(entry)),
      );
    }

    if (activeSourceFilters.length > 0) {
      result = result.filter((entry) =>
        entry.client_source
          ? activeSourceFilters.includes(entry.client_source)
          : false,
      );
    }

    if (dateFilter !== "all") {
      const today = new Date();
      result = result.filter((entry) => {
        const date = parseIsoToLocal(entry.follow_up_date);
        if (!date) return false;
        if (dateFilter === "past") return date < today;
        if (dateFilter === "upcoming") return date > today;
        if (dateFilter === "today") {
          return date.toDateString() === today.toDateString();
        }
        return true;
      });
    }

    return result;
  }, [sales, activeStatusFilters, activeSourceFilters, dateFilter]);

  return {
    STATUS_FILTER_OPTIONS,
    activeStatusFilters,
    setActiveStatusFilters,
    activeSourceFilters,
    setActiveSourceFilters,
    statusFilter,
    toggleStatusFilter,
    toggleSourceFilter,
    dateFilter,
    setDateFilter,
    filteredEntries,
  };
}
