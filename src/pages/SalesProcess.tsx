// src/pages/SalesProcess.tsx
import { SALES_STAGE } from "@/constants/stages";
import { STAGE_LABELS } from "@/constants/labels";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { extractErrorMessage } from "@/helpers/error";
import { useNavigate } from "react-router-dom";
import {
  SalesProcess,
  Stage,
  getSalesProcesses,
  getStages,
  startSalesProcess,
  updateSalesProcess,
  SalesProcessUpdateRequest,
} from "@/lib/api";

import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { asArray } from "@/lib/safe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, CalendarPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SalesProcessWithStageId = SalesProcess & {
  stage_id?: number | null;
};

const stageBadgeClass: Record<
  (typeof SALES_STAGE)[keyof typeof SALES_STAGE],
  string
> = {
  [SALES_STAGE.FOLLOW_UP]: "bg-warning text-warning-foreground",
  [SALES_STAGE.CLOSED]: "bg-success text-success-foreground",
  [SALES_STAGE.LOST]: "bg-destructive text-destructive-foreground",
};

export default function SalesProcessView() {
  const qc = useQueryClient();
  const { enabled } = useAuthEnabled();

  // Queries
  const {
    data: sales = [],
    isFetching: loadingSales,
    isError: errorSales,
  } = useQuery<SalesProcessWithStageId[]>({
    queryKey: ["sales"],
    queryFn: getSalesProcesses as unknown as () => Promise<
      SalesProcessWithStageId[]
    >,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<SalesProcessWithStageId>,
  });

  const {
    data: stages = [],
    isFetching: loadingStages,
    isError: errorStages,
  } = useQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Stage>,
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  type StatusFilter =
    | "all"
    | "zweitgespräch geplant"
    | "zweitgespräch abgeschlossen"
    | "abgeschlossen"
    | "verloren";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    source: "" as "" | "organic" | "paid",
    stageId: null as number | null,
    zweitgespraechDate: null as Date | null,
    salesProcessId: undefined as number | undefined,
    zweitgespraechResult: null as boolean | null,
    abschluss: null as boolean | null,
    revenue: "",
    contractDuration: "",
    contractStart: null as Date | null,
    contractFrequency: "" as "" | "monthly" | "bi-monthly" | "quarterly",
    clientId: undefined as number | undefined,
    completedAt: null as string | null,
  });

  const mStart = useMutation({
    mutationFn: startSalesProcess,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      resetAll();
    },
    onError: (err: unknown) =>
      alert(`Fehler beim Anlegen: ${extractErrorMessage(err)}`),
  });

  const mPatch = useMutation<
    Awaited<ReturnType<typeof updateSalesProcess>>,
    unknown,
    { id: number; payload: SalesProcessUpdateRequest }
  >({
    mutationFn: ({ id, payload }) => updateSalesProcess(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }),
    onError: (err: unknown) =>
      alert(`Fehler beim Aktualisieren: ${extractErrorMessage(err)}`),
  });

  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>([]);
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const toggleStatusFilter = (value: string) => {
    setActiveStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const filteredEntries = useMemo(() => {
    let result = sales;

    if (activeStatusFilters.length > 0) {
      result = result.filter((e) => {
        const label =
          e.stage === SALES_STAGE.FOLLOW_UP
            ? (e.follow_up_result ?? null) == null
              ? "zweitgespräch geplant"
              : "zweitgespräch abgeschlossen"
            : e.stage === SALES_STAGE.CLOSED
            ? "abgeschlossen"
            : "verloren";
        return activeStatusFilters.includes(label);
      });
    }

    return result;
  }, [sales, activeStatusFilters]);

  if (
    ((loadingSales || loadingStages) && (!sales.length || !stages.length)) ||
    errorStages
  ) {
    if (errorSales)
      return (
        <div className="p-6 text-red-500">Fehler beim Laden der Pipeline.</div>
      );
    return <div className="p-6">Lade Verkaufsdaten…</div>;
  }

  const resetAll = () => {
    setShowForm(false);
    setFormStep(1);
    setFormData({
      name: "",
      email: "",
      phone: "",
      source: "",
      stageId: null,
      zweitgespraechDate: null,
      salesProcessId: undefined,
      zweitgespraechResult: null,
      abschluss: null,
      revenue: "",
      contractDuration: "",
      contractStart: null,
      contractFrequency: "",
      clientId: undefined,
      completedAt: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Verkaufsprozess</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Verkaufspipeline
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setShowForm(true);
            setFormStep(1);
          }}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Zweitgespräch planen
        </Button>
      </div>

      {/* table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Verkaufspipeline
            </CardTitle>
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
                        {/* "Alle" (All) option */}
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

                        {/* Individual statuses */}
                        {[
                          "zweitgespräch geplant",
                          "zweitgespräch abgeschlossen",
                          "abgeschlossen",
                          "verloren",
                        ].map((status) => {
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
                                onCheckedChange={() =>
                                  toggleStatusFilter(status)
                                }
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
                <TableHead>Zweitgespräch Datum</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Bühne</TableHead>
                <TableHead>Umsatz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => {
                const linkedStage =
                  typeof e.stage_id === "number"
                    ? stages.find((s) => s.id === e.stage_id)?.name ?? null
                    : null;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.client_name}</TableCell>
                    <TableCell>
                      <Badge className={stageBadgeClass[e.stage]}>
                        {STAGE_LABELS[e.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.follow_up_date ?? "-"}</TableCell>
                    <TableCell>
                      {e.follow_up_result === true && "Erschienen"}
                      {e.follow_up_result === false && "Nicht erschienen"}
                      {e.follow_up_result === null && "Ausstehend"}
                    </TableCell>
                    <TableCell>
                      {e.client_source
                        ? e.client_source === "paid"
                          ? "Bezahlt"
                          : "Organisch"
                        : "-"}
                    </TableCell>
                    <TableCell>{linkedStage ?? "-"}</TableCell>
                    <TableCell>
                      {e.revenue ? `€${e.revenue.toLocaleString()}` : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
