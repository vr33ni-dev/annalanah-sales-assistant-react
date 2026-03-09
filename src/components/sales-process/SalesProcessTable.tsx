import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Filter, Info } from "lucide-react";
import { SALES_STAGE, STAGE_LABELS } from "@/constants/stages";
import { parseIsoToLocal } from "@/helpers/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TablePagination } from "@/components/TablePagination";
import { STATUS_FILTER_OPTIONS } from "@/hooks/useSalesProcessFilters";
import type {
  DateFilterType,
  StatusFilter,
} from "@/hooks/useSalesProcessFilters";
import type { SalesProcessTableProps } from "./types";

const stageBadgeClass: Record<
  (typeof SALES_STAGE)[keyof typeof SALES_STAGE],
  string
> = {
  [SALES_STAGE.INITIAL_CONTACT]:
    "bg-blue-100 text-blue-800 border border-blue-200",
  [SALES_STAGE.FOLLOW_UP]: "bg-warning text-warning-foreground",
  [SALES_STAGE.CLOSED]: "bg-success text-success-foreground",
  [SALES_STAGE.LOST]: "bg-destructive text-destructive-foreground",
};

export function SalesProcessTable({
  statusFilter,
  setActiveStatusFilters,
  activeStatusFilters,
  activeSourceFilters,
  setActiveSourceFilters,
  toggleStatusFilter,
  toggleSourceFilter,
  dateFilter,
  setDateFilter,
  paginatedSales,
  stages,
  highlightId,
  onShowDetails,
  onPlanFollowUp,
  onEnterResult,
  onEnterClosing,
  page,
  totalPages,
  onPageChange,
}: SalesProcessTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <Select
            value={statusFilter}
            onValueChange={(value: StatusFilter) =>
              setActiveStatusFilters(value === "all" ? [] : [value])
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="erstgespräch">Erstgespräch</SelectItem>
              <SelectItem value="erstgespräch abgeschlossen">
                Erstgespräch abgeschlossen
              </SelectItem>
              <SelectItem value="zweitgespräch geplant">
                Zweitgespräch geplant
              </SelectItem>
              <SelectItem value="zweitgespräch abgeschlossen">
                Zweitgespräch abgeschlossen
              </SelectItem>
              <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
              <SelectItem value="verloren">Verloren</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 font-semibold hover:text-primary">
                      Status
                      <Filter className="w-3 h-3 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                        <Checkbox
                          id="filter-all"
                          checked={activeStatusFilters.length === 0}
                          onCheckedChange={() => setActiveStatusFilters([])}
                        />
                        <label
                          htmlFor="filter-all"
                          className="text-sm font-medium"
                        >
                          Alle
                        </label>
                      </div>

                      {STATUS_FILTER_OPTIONS.map((status) => {
                        const capitalized =
                          status.charAt(0).toUpperCase() + status.slice(1);
                        return (
                          <div
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`filter-${status}`}
                              checked={activeStatusFilters.includes(status)}
                              onCheckedChange={() => toggleStatusFilter(status)}
                            />
                            <label
                              htmlFor={`filter-${status}`}
                              className="text-sm"
                            >
                              {capitalized}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead>Erstgespräch</TableHead>
              <TableHead>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 font-semibold hover:text-primary">
                      Zweitgespräch
                      <Filter className="w-3 h-3 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Zeitraum</Label>
                      <Select
                        value={dateFilter}
                        onValueChange={(val) =>
                          setDateFilter(val as DateFilterType)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Zeitraum wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle</SelectItem>
                          <SelectItem value="past">Vergangene</SelectItem>
                          <SelectItem value="upcoming">Zukünftige</SelectItem>
                          <SelectItem value="today">Heute</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead>Ergebnis</TableHead>
              <TableHead>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 font-semibold hover:text-primary">
                      Quelle
                      <Filter className="w-3 h-3 opacity-70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                        <Checkbox
                          id="filter-source-all"
                          checked={activeSourceFilters.length === 0}
                          onCheckedChange={() => setActiveSourceFilters([])}
                        />
                        <label
                          htmlFor="filter-source-all"
                          className="text-sm font-medium"
                        >
                          Alle
                        </label>
                      </div>

                      {[
                        { value: "paid", label: "Bezahlt" },
                        { value: "organic", label: "Organisch" },
                      ].map(({ value, label }) => (
                        <div
                          key={value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-source-${value}`}
                            checked={activeSourceFilters.includes(value)}
                            onCheckedChange={() => toggleSourceFilter(value)}
                          />
                          <label
                            htmlFor={`filter-source-${value}`}
                            className="text-sm"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </TableHead>
              <TableHead>Bühne</TableHead>
              <TableHead>Umsatz</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((entry) => {
              const linkedStage =
                typeof entry.stage_id === "number"
                  ? (stages.find((stage) => stage.id === entry.stage_id)
                      ?.name ?? null)
                  : (entry.source_stage_name ?? null);
              return (
                <TableRow
                  key={entry.id}
                  id={`sales-${entry.id}`}
                  className={
                    highlightId === entry.id ? "ring-2 ring-primary" : undefined
                  }
                >
                  <TableCell>{entry.client_name}</TableCell>
                  <TableCell>
                    <Badge className={stageBadgeClass[entry.stage]}>
                      {entry.stage === SALES_STAGE.INITIAL_CONTACT
                        ? "Erstgespräch"
                        : STAGE_LABELS[entry.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {entry.initial_contact_date
                        ? format(
                            parseIsoToLocal(entry.initial_contact_date)!,
                            "dd.MM.yyyy",
                            { locale: de },
                          )
                        : "–"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {entry.follow_up_date &&
                      entry.stage !== SALES_STAGE.INITIAL_CONTACT
                        ? format(
                            parseIsoToLocal(entry.follow_up_date)!,
                            "dd.MM.yyyy",
                            { locale: de },
                          )
                        : "–"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.stage === SALES_STAGE.INITIAL_CONTACT
                      ? "–"
                      : entry.follow_up_result === true
                        ? "Erschienen"
                        : entry.follow_up_result === false
                          ? "Nicht erschienen"
                          : "Ausstehend"}
                  </TableCell>
                  <TableCell>
                    {entry.client_source
                      ? entry.client_source === "paid"
                        ? "Bezahlt"
                        : "Organisch"
                      : "-"}
                  </TableCell>
                  <TableCell>{linkedStage ?? "-"}</TableCell>
                  <TableCell>
                    {entry.revenue ? `€${entry.revenue.toLocaleString()}` : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      {entry.stage === SALES_STAGE.INITIAL_CONTACT && (
                        <Button size="sm" onClick={() => onPlanFollowUp(entry)}>
                          Zweitgespräch planen
                        </Button>
                      )}

                      {entry.stage === SALES_STAGE.FOLLOW_UP &&
                        entry.follow_up_result == null && (
                          <Button
                            size="sm"
                            onClick={() => onEnterResult(entry)}
                          >
                            Ergebnis eintragen
                          </Button>
                        )}

                      {entry.stage === SALES_STAGE.FOLLOW_UP &&
                        entry.follow_up_result === true && (
                          <Button
                            size="sm"
                            onClick={() => onEnterClosing(entry)}
                          >
                            Abschluss eingeben
                          </Button>
                        )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2"
                        onClick={() => onShowDetails(entry)}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}
