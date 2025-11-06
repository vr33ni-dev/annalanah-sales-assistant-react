// src/pages/SalesProcess.tsx
import { SALES_STAGE } from "@/constants/stages";
import { STAGE_LABELS } from "@/constants/labels";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { extractErrorMessage } from "@/helpers/error";
import { useNavigate } from "react-router-dom";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
import { TrendingUp, CalendarPlus, Users, CalendarIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";

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
  const navigate = useNavigate();

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

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>([]);
  const [activeSourceFilters, setActiveSourceFilters] = useState<string[]>([]);

  const toggleStatusFilter = (value: string) => {
    setActiveStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };
  const toggleSourceFilter = (value: string) => {
    setActiveSourceFilters((prev) =>
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
    if (activeSourceFilters.length > 0) {
      result = result.filter((e) =>
        e.client_source ? activeSourceFilters.includes(e.client_source) : false
      );
    }

    return result;
  }, [sales, activeStatusFilters, activeSourceFilters]);

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

  // Validations
  const isContractValid =
    !!formData.revenue &&
    Number(formData.revenue) > 0 &&
    !!formData.contractDuration &&
    Number(formData.contractDuration) > 0 &&
    !!formData.contractStart &&
    !!formData.contractFrequency &&
    ["monthly", "bi-monthly", "quarterly"].includes(formData.contractFrequency);

  const canSubmit = formData.abschluss !== true || isContractValid;

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

  const handleSubmit = async () => {
    if (formStep === 1) {
      // Step 1: schedule zweitgespräch
      if (!formData.name || !formData.zweitgespraechDate || !formData.source)
        return;

      const payload = {
        name: formData.name,
        email: formData.email ?? "",
        phone: formData.phone ?? "",
        source: formData.source,
        source_stage_id:
          formData.source === "paid" ? formData.stageId ?? null : null,
        follow_up_date: formData.zweitgespraechDate
          ? format(formData.zweitgespraechDate, "yyyy-MM-dd")
          : null,
      };

      await mStart.mutateAsync(payload);
      return;
    }

    if (formStep === 2) {
      // Step 2: record zweitgespräch result
      if (!formData.salesProcessId || formData.zweitgespraechResult === null)
        return;

      await mPatch.mutateAsync({
        id: formData.salesProcessId,
        payload: { follow_up_result: formData.zweitgespraechResult },
      });

      resetAll();
      return;
    }

    if (formStep === 3) {
      // Step 3: record closing
      if (!formData.salesProcessId) return;

      const revenueNum =
        formData.abschluss && formData.revenue
          ? Number(formData.revenue)
          : null;

      const payload: SalesProcessUpdateRequest = {
        follow_up_result: formData.zweitgespraechResult ?? true,
        closed: formData.abschluss ?? null,
        revenue: revenueNum,
        completed_at: formData.completedAt
          ? format(formData.completedAt, "yyyy-MM-dd")
          : undefined,
      };

      // Contract details if closed (required by backend)
      if (formData.abschluss) {
        payload.contract_duration_months = Number(formData.contractDuration);
        payload.contract_start_date = formData.contractStart
          ? format(formData.contractStart, "yyyy-MM-dd")
          : undefined;
        payload.contract_frequency = (formData.contractFrequency ||
          undefined) as "monthly" | "bi-monthly" | "quarterly" | undefined;
      }

      await mPatch.mutateAsync({ id: formData.salesProcessId, payload });
      resetAll();
    }
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

      {/* Workflow Form */}
      {showForm && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {formStep === 1 && "Schritt 1: Zweitgespräch planen"}
              {formStep === 2 && "Schritt 2: Zweitgespräch Ergebnis"}
              {formStep === 3 && "Schritt 3: Abschluss"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1 */}
            {formStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (Vor- und Nachname)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Max Mustermann"
                    className="bg-success/5 border-success/30 focus:border-success"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="max@example.com"
                    className="bg-success/5 border-success/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+49 123 456789"
                    className="bg-success/5 border-success/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Datum des Zweitgesprächs</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                          !formData.zweitgespraechDate &&
                            "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.zweitgespraechDate
                          ? format(formData.zweitgespraechDate, "PPP", {
                              locale: de,
                            })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.zweitgespraechDate ?? undefined}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            zweitgespraechDate: date ?? null,
                          })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Quelle</Label>
                  <Select
                    value={formData.source ?? ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        source: value as "organic" | "paid",
                      })
                    }
                  >
                    <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                      <SelectValue placeholder="Quelle auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organic">Organisch</SelectItem>
                      <SelectItem value="paid">Bezahlt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source === "paid" && (
                  <div className="space-y-2">
                    <Label>Bühne auswählen</Label>
                    <Select
                      value={String(formData.stageId ?? "")}
                      onValueChange={(value) =>
                        setFormData({ ...formData, stageId: Number(value) })
                      }
                    >
                      <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                        <SelectValue placeholder="Bühne auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((st) => (
                          <SelectItem key={st.id} value={String(st.id)}>
                            {st.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="col-span-full flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !formData.name ||
                      !formData.zweitgespraechDate ||
                      !formData.source
                    }
                  >
                    Speichern
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {formStep === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Zweitgespräch am:{" "}
                    {formData.zweitgespraechDate
                      ? format(formData.zweitgespraechDate, "PPP", {
                          locale: de,
                        })
                      : "—"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Ist der Kunde erschienen?</Label>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.zweitgespraechResult === true}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          zweitgespraechResult: checked,
                        })
                      }
                    />
                    <span className="text-sm">
                      {formData.zweitgespraechResult === true
                        ? "Ja, erschienen"
                        : formData.zweitgespraechResult === false
                        ? "Nein, nicht erschienen"
                        : "Bitte auswählen"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setFormStep(1)} variant="outline">
                    Zurück
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={formData.zweitgespraechResult === null}
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {formStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Erschienen: {formData.zweitgespraechResult ? "Ja" : "Nein"}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Abschluss erfolgreich?</Label>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.abschluss === true}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, abschluss: checked })
                      }
                    />
                    <span className="text-sm">
                      {formData.abschluss === true
                        ? "Ja, Vertrag abgeschlossen"
                        : formData.abschluss === false
                        ? "Nein, kein Abschluss"
                        : "Bitte auswählen"}
                    </span>
                  </div>
                </div>

                {formData.abschluss && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-success/10 rounded-lg">
                    <div className="space-y-2">
                      <Label>Umsatz (€)</Label>
                      <Input
                        type="number"
                        value={formData.revenue}
                        onChange={(e) =>
                          setFormData({ ...formData, revenue: e.target.value })
                        }
                        placeholder="4800"
                        className="bg-success/5 border-success/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vertragsdauer (Monate)</Label>
                      <Select
                        value={formData.contractDuration ?? ""}
                        onValueChange={(value) =>
                          setFormData({ ...formData, contractDuration: value })
                        }
                      >
                        <SelectTrigger className="bg-success/5 border-success/30">
                          <SelectValue placeholder="Dauer auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-success/5 border-success/30",
                              !formData.contractStart && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.contractStart
                              ? format(formData.contractStart, "PPP", {
                                  locale: de,
                                })
                              : "Startdatum auswählen"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.contractStart ?? undefined}
                            onSelect={(date) =>
                              setFormData({
                                ...formData,
                                contractStart: date ?? null,
                              })
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Zahlungsfrequenz</Label>
                      <Select
                        value={formData.contractFrequency ?? ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            contractFrequency: value as
                              | "monthly"
                              | "bi-monthly"
                              | "quarterly",
                          })
                        }
                      >
                        <SelectTrigger className="bg-success/5 border-success/30">
                          <SelectValue placeholder="Frequenz auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                          <SelectItem value="bi-monthly">
                            Zweimonatlich
                          </SelectItem>
                          <SelectItem value="quarterly">
                            Quartalsweise
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Abschlussdatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-success/5 border-success/30",
                              !formData.completedAt && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.completedAt
                              ? format(formData.completedAt, "PPP", {
                                  locale: de,
                                })
                              : "Datum auswählen"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              formData.completedAt
                                ? new Date(formData.completedAt)
                                : undefined
                            }
                            onSelect={(date) =>
                              setFormData({
                                ...formData,
                                completedAt: date ? date.toISOString() : null,
                              })
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => setFormStep(2)}
                    variant="outline"
                    className="mt-4"
                  >
                    Zurück
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`mt-4 ${
                      !canSubmit ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Speichern & Abschließen
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Select
              value={statusFilter}
              onValueChange={(v: StatusFilter) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
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
                        {/* "Alle" (All) option */}
                        <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                          <Checkbox
                            id="filter-all"
                            checked={activeSourceFilters.length === 0}
                            onCheckedChange={() => setActiveSourceFilters([])}
                          />
                          <label
                            htmlFor="filter-all"
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
                    <TableCell>
                      {e.follow_up_date
                        ? new Date(e.follow_up_date).toLocaleDateString("de-DE")
                        : "-"}
                    </TableCell>
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

                    {/* NEW: Actions column */}
                    <TableCell>
                      <div className="flex gap-2">
                        {e.stage === SALES_STAGE.FOLLOW_UP &&
                          e.follow_up_result == null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowForm(true);
                                setFormStep(2);
                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.client_name,
                                  salesProcessId: e.id,
                                  clientId: e.client_id,
                                  zweitgespraechResult: null,
                                  zweitgespraechDate: e.follow_up_date
                                    ? new Date(e.follow_up_date)
                                    : null,
                                }));
                              }}
                            >
                              Ergebnis eintragen
                            </Button>
                          )}

                        {e.stage === SALES_STAGE.FOLLOW_UP &&
                          e.follow_up_result === true && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowForm(true);
                                setFormStep(3);
                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.client_name,
                                  salesProcessId: e.id,
                                  clientId: e.client_id,
                                  zweitgespraechResult: true,
                                  abschluss: null,
                                  zweitgespraechDate: e.follow_up_date
                                    ? new Date(e.follow_up_date)
                                    : null,
                                }));
                              }}
                            >
                              Abschluss eingeben
                            </Button>
                          )}

                        {e.stage === SALES_STAGE.CLOSED && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/contracts?client=${e.client_id}&open=1`
                              )
                            }
                          >
                            Vertrag anzeigen
                          </Button>
                        )}
                      </div>
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
