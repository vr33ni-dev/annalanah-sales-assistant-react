// src/pages/SalesProcess.tsx
import { SALES_STAGE } from "@/constants/stages";
import { STAGE_LABELS } from "@/constants/labels";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import { mockSalesProcesses, mockStages } from "@/lib/mockData";
import { format } from "date-fns";
import { extractErrorMessage } from "@/helpers/error";
import { useNavigate } from "react-router-dom";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Pencil, Save, X } from "lucide-react";

import {
  SalesProcess,
  Stage,
  getSalesProcesses,
  getStages,
  startSalesProcess,
  updateSalesProcess,
  SalesProcessUpdateRequest,
  createLead,
  StartSalesProcessResponse,
  StartSalesProcessRequest,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MergeConflicts } from "@/types/merge";
import { isFetchError, StartSalesProcessError } from "@/types/apiError";
import { MergeConflictDialog } from "@/components/MergeConflictDialog";
import { LeadSearch } from "@/components/LeadSearch";
import { Lead } from "@/lib/api";
import { CommentsDialog } from "@/components/comments/CommentsDialog";

type SalesProcessWithStageId = SalesProcess & {
  stage_id?: number | null;
};

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

// gespräch type: which flow the user chose
type GespraechType = "erstgespraech" | "zweitgespraech";

export default function SalesProcessView() {
  const qc = useQueryClient();
  const { useMockData } = useAuthEnabled();
  const navigate = useNavigate();

  function isFutureDate(date?: Date | null) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d > t;
  }

  // Queries
  const {
    data: sales = [],
    isFetching: loadingSales,
    isError: errorSales,
  } = useMockableQuery<SalesProcessWithStageId[]>({
    queryKey: ["sales"],
    queryFn: getSalesProcesses as unknown as () => Promise<
      SalesProcessWithStageId[]
    >,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<SalesProcessWithStageId>,
    mockData: mockSalesProcesses as SalesProcessWithStageId[],
  });

  const {
    data: stages = [],
    isFetching: loadingStages,
    isError: errorStages,
  } = useMockableQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
    retry: false,
    staleTime: 5 * 60 * 1000,
    select: asArray<Stage>,
    mockData: mockStages,
  });

  // Form state
  const [showForm, setShowForm] = useState(false);
  // formStep: 0 = type selection, 1 = Erstgespräch, 2 = Zweitgespräch (from Aktionen or old flow),
  //           3 = Ergebnis, 4 = Abschluss, 5 = old Zweitgespräch full flow step 1
  const [formStep, setFormStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [gespraechType, setGespraechType] = useState<GespraechType>("erstgespraech");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [existingClientId, setExistingClientId] = useState<number | null>(null);
  const [hasActiveContract, setHasActiveContract] = useState(false);

  // Form Merge conflict state
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflicts | null>(
    null,
  );
  const [pendingPayload, setPendingPayload] =
    useState<StartSalesProcessRequest | null>(null);

  type StatusFilter =
    | "all"
    | "erstgespräch"
    | "erstgespräch abgeschlossen"
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
    erstgespraechDate: null as Date | null,
    zweitgespraechDate: null as Date | null,
    salesProcessId: undefined as number | undefined,
    zweitgespraechResult: null as boolean | null,
    abschluss: null as boolean | null,
    revenue: "",
    contractDuration: "",
    contractStart: null as Date | null,
    contractFrequency: "" as "" | "monthly" | "bi-monthly" | "quarterly",
    clientId: undefined as number | undefined,
    leadId: undefined as number | undefined,
    completedAt: null as string | null,
  });

  const mStart = useMutation({
    mutationFn: startSalesProcess,

    onSuccess: (data: StartSalesProcessResponse) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
      setMergeConflicts(null);
      setPendingPayload(null);
      setExistingClientId(null);
      setHasActiveContract(false);
      resetAll();
    },

    onError: (err: unknown) => {
      if (!isFetchError(err)) {
        alert(`Fehler beim Anlegen: ${extractErrorMessage(err)}`);
        return;
      }

      const { status, data } = err.response;

      if (status !== 409 || typeof data !== "object" || data === null) {
        alert(`Fehler beim Anlegen: ${extractErrorMessage(err)}`);
        return;
      }

      const apiError = data as StartSalesProcessError;

      if (apiError.error === "client_has_active_contract") {
        setHasActiveContract(true);
        setMergeConflicts({});
        setPendingPayload(null);
        setExistingClientId(apiError.client_id);
        return;
      }

      if (apiError.error === "client_exists") {
        setExistingClientId(apiError.client_id);
        setHasActiveContract(apiError.has_active_contract ?? false);
        setMergeConflicts(apiError.conflicts ?? {});
        setPendingPayload(apiError.original_payload);
        return;
      }

      alert(`Fehler beim Anlegen: ${extractErrorMessage(err)}`);
    },
  });

  const mPatch = useMutation<
    Awaited<ReturnType<typeof updateSalesProcess>>,
    unknown,
    { id: number; payload: SalesProcessUpdateRequest }
  >({
    mutationFn: ({ id, payload }) => updateSalesProcess(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      if (vars.payload.closed === true) {
        qc.invalidateQueries({ queryKey: ["contracts"] });
        qc.invalidateQueries({ queryKey: ["contracts", vars.id] });
      }
    },
    onError: (err: unknown) =>
      alert(`Fehler beim Aktualisieren: ${extractErrorMessage(err)}`),
  });

  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>([]);
  const [activeSourceFilters, setActiveSourceFilters] = useState<string[]>([]);

  const toggleStatusFilter = (value: string) => {
    setActiveStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };
  const toggleSourceFilter = (value: string) => {
    setActiveSourceFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  function parseDateSafe(input?: string | null): Date | null {
    if (!input) return null;
    try {
      const date = new Date(input);
      return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      );
    } catch {
      return null;
    }
  }

  function normalizeStartPayload(
    p: StartSalesProcessRequest,
  ): StartSalesProcessRequest {
    return {
      ...p,
      initial_contact_date:
        typeof p.initial_contact_date === "string"
          ? p.initial_contact_date.slice(0, 10)
          : format(p.initial_contact_date!, "yyyy-MM-dd"),
    };
  }

  type DateFilterType = "all" | "past" | "upcoming" | "today";
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");

  const filteredEntries = useMemo(() => {
    let result = sales;

    if (activeStatusFilters.length > 0) {
      result = result.filter((e) => {
        let label: string;
        const now = new Date();
        const erstDate = parseDateSafe(e.initial_contact_date);
        const zweitDate = parseDateSafe(e.follow_up_date);

        if (e.stage === SALES_STAGE.INITIAL_CONTACT) {
          if (erstDate && erstDate > now) {
            label = "erstgespräch";
          } else if (erstDate && (!zweitDate || zweitDate > now)) {
            label = "erstgespräch abgeschlossen";
          } else {
            label = "erstgespräch";
          }
        } else if (e.stage === SALES_STAGE.FOLLOW_UP) {
          if ((e.follow_up_result ?? null) == null) {
            label = "zweitgespräch geplant";
          } else {
            label = "zweitgespräch abgeschlossen";
          }
        } else if (e.stage === SALES_STAGE.CLOSED) {
          label = "abgeschlossen";
        } else {
          label = "verloren";
        }
        return activeStatusFilters.includes(label);
      });
    }

    if (activeSourceFilters.length > 0) {
      result = result.filter((e) =>
        e.client_source ? activeSourceFilters.includes(e.client_source) : false,
      );
    }

    if (dateFilter !== "all") {
      const today = new Date();
      result = result.filter((e) => {
        const d = parseDateSafe(e.follow_up_date);
        if (!d) return false;
        if (dateFilter === "past") return d < today;
        if (dateFilter === "upcoming") return d > today;
        if (dateFilter === "today")
          return d.toDateString() === today.toDateString();
        return true;
      });
    }

    return result;
  }, [sales, activeStatusFilters, activeSourceFilters, dateFilter]);

  if (
    ((loadingSales || loadingStages) && (!sales.length || !stages.length)) ||
    errorStages
  ) {
    if (errorSales)
      return (
        <div className="p-6 text-destructive">
          Fehler beim Laden der Pipeline.
        </div>
      );
    return <div className="p-6">Lade Verkaufsdaten…</div>;
  }

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
    setFormStep(0);
    setGespraechType("erstgespraech");
    setFormData({
      name: "",
      email: "",
      phone: "",
      source: "",
      stageId: null,
      erstgespraechDate: null,
      zweitgespraechDate: null,
      salesProcessId: undefined,
      zweitgespraechResult: null,
      abschluss: null,
      revenue: "",
      contractDuration: "",
      contractStart: null,
      contractFrequency: "",
      clientId: undefined,
      leadId: undefined,
      completedAt: null,
    });
  };

  // ── Erstgespräch: Step 1 save & close ──────────────────────────────
  const handleErstgespraechSave = async () => {
    if (!formData.name || !formData.source) return;

    let resolvedLeadId: number | undefined = formData.leadId;

    // Always create a lead for Erstgespräch
    if (!resolvedLeadId) {
      try {
        const lead = await createLead({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          source: formData.source,
          source_stage_id:
            formData.source === "paid" ? (formData.stageId ?? null) : null,
        });
        resolvedLeadId = lead.id;
      } catch (err: unknown) {
        alert("Fehler beim Anlegen des Leads: " + extractErrorMessage(err));
        return;
      }
    }

    const payload: StartSalesProcessRequest = {
      name: formData.name,
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      source: formData.source,
      source_stage_id:
        formData.source === "paid" ? (formData.stageId ?? null) : null,
      lead_id: resolvedLeadId,
      initial_contact_date: formData.erstgespraechDate
        ? format(formData.erstgespraechDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      stage: SALES_STAGE.INITIAL_CONTACT,
    };

    await mStart.mutateAsync(payload);
  };

  // ── Zweitgespräch (old flow, step 5): full start ───────────────────
  const handleZweitgespraechStart = async () => {
    if (!formData.name || !formData.source) return;

    const payload: StartSalesProcessRequest = {
      name: formData.name,
      email: formData.email ?? "",
      phone: formData.phone ?? "",
      source: formData.source,
      source_stage_id:
        formData.source === "paid" ? (formData.stageId ?? null) : null,
      lead_id: formData.leadId,
      initial_contact_date: formData.zweitgespraechDate
        ? format(formData.zweitgespraechDate, "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      follow_up_date: formData.zweitgespraechDate
        ? format(formData.zweitgespraechDate, "yyyy-MM-dd")
        : undefined,
      stage: SALES_STAGE.FOLLOW_UP,
    };

    await mStart.mutateAsync(payload);
  };

  const handleSubmit = async () => {
    // Step 2: Zweitgespräch planen (from table Aktionen)
    if (formStep === 2) {
      if (!formData.salesProcessId || !formData.zweitgespraechDate) return;

      await mPatch.mutateAsync({
        id: formData.salesProcessId,
        payload: {
          follow_up_date: format(formData.zweitgespraechDate, "yyyy-MM-dd"),
        } as SalesProcessUpdateRequest,
      });

      resetAll();
      return;
    }

    // Step 3: Zweitgespräch Ergebnis
    if (formStep === 3) {
      if (!formData.salesProcessId) return;

      await mPatch.mutateAsync({
        id: formData.salesProcessId,
        payload: { follow_up_result: formData.zweitgespraechResult },
      });

      resetAll();
      return;
    }

    // Step 4: Abschluss
    if (formStep === 4) {
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

      if (formData.abschluss) {
        payload.contract_duration_months = Number(formData.contractDuration);
        payload.contract_start_date = formData.contractStart
          ? format(formData.contractStart, "yyyy-MM-dd")
          : undefined;
        payload.contract_frequency = formData.contractFrequency as
          | "monthly"
          | "bi-monthly"
          | "quarterly";
      }

      await mPatch.mutateAsync({ id: formData.salesProcessId, payload });
      resetAll();
    }
  };

  const isFollowUpFuture = isFutureDate(formData.zweitgespraechDate);

  const handleMergeKeepExisting = async () => {
    if (!pendingPayload) return;
    await mStart.mutateAsync({
      ...pendingPayload,
      merge_strategy: "keep_existing",
    });
  };

  const handleMergeOverwrite = async () => {
    if (hasActiveContract) return;
    if (!pendingPayload) return;

    await mStart.mutateAsync(
      normalizeStartPayload({
        ...pendingPayload,
        merge_strategy: "overwrite",
      }),
    );
  };

  // Card title per step
  const cardTitle = () => {
    if (formStep === 0) return "Verkaufsgespräch planen";
    if (formStep === 1) return "Schritt 1: Erstgespräch planen";
    if (formStep === 2) return "Zweitgespräch planen";
    if (formStep === 3) return "Schritt 3: Zweitgespräch Ergebnis";
    if (formStep === 4) return "Schritt 4: Abschluss";
    if (formStep === 5) return "Schritt 1: Zweitgespräch planen";
    return "";
  };

  return (
    <div className="space-y-6">
      <MergeConflictDialog
        open={mergeConflicts !== null}
        conflicts={mergeConflicts ?? {}}
        hasActiveContract={hasActiveContract}
        disableOverwrite={hasActiveContract}
        onCancel={() => {
          setMergeConflicts(null);
          setPendingPayload(null);
          setExistingClientId(null);
        }}
        onKeepExisting={handleMergeKeepExisting}
        onOverwrite={handleMergeOverwrite}
      />

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
            setFormStep(0);
          }}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Verkaufsgespräch planen
        </Button>
      </div>

      {/* Workflow Form */}
      {showForm && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {cardTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Step 0: Type selection */}
            {formStep === 0 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium">Welche Art von Gespräch möchten Sie planen?</Label>
                  <RadioGroup
                    value={gespraechType}
                    onValueChange={(v) => setGespraechType(v as GespraechType)}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="erstgespraech" id="type-erst" className="mt-0.5" />
                      <label htmlFor="type-erst" className="cursor-pointer flex-1">
                        <div className="font-medium">Erstgespräch</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          Erster Kontakt mit einem neuen Interessenten. Ein Lead wird automatisch angelegt.
                        </div>
                      </label>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="zweitgespraech" id="type-zweit" className="mt-0.5" />
                      <label htmlFor="type-zweit" className="cursor-pointer flex-1">
                        <div className="font-medium">Zweitgespräch</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          Folgegespräch mit einem bestehenden Lead. Sie können einen vorhandenen Lead auswählen.
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setFormStep(gespraechType === "erstgespraech" ? 1 : 5)}
                  >
                    Weiter
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 1: Erstgespräch planen — saves & closes */}
            {formStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (Vor- und Nachname) *</Label>
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
                  <Label>Datum des Erstgesprächs</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                          !formData.erstgespraechDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.erstgespraechDate
                          ? format(formData.erstgespraechDate, "PPP", { locale: de })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.erstgespraechDate ?? undefined}
                        onSelect={(date) =>
                          setFormData({ ...formData, erstgespraechDate: date ?? null })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Quelle *</Label>
                  <Select
                    value={formData.source ?? ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        source: value as "organic" | "paid",
                        stageId: value !== "paid" ? null : formData.stageId,
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
                  <Button variant="outline" onClick={() => setFormStep(0)}>
                    Zurück
                  </Button>
                  <Button
                    onClick={handleErstgespraechSave}
                    disabled={!formData.name || !formData.source || mStart.isPending}
                  >
                    {mStart.isPending ? "Speichern…" : "Speichern & Schließen"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Zweitgespräch planen (opened from table Aktionen) */}
            {formStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Zweitgespräch planen für{" "}
                    <span className="font-medium text-foreground">
                      {formData.name}
                    </span>
                  </p>
                </div>

                <div className="space-y-2 col-span-full md:col-span-1">
                  <Label>Datum des Zweitgesprächs *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                          !formData.zweitgespraechDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.zweitgespraechDate
                          ? format(formData.zweitgespraechDate, "PPP", { locale: de })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.zweitgespraechDate ?? undefined}
                        onSelect={(date) =>
                          setFormData({ ...formData, zweitgespraechDate: date ?? null })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="col-span-full flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.zweitgespraechDate || mPatch.isPending}
                  >
                    {mPatch.isPending ? "Speichern…" : "Speichern"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Zweitgespräch Ergebnis */}
            {formStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Zweitgespräch am:{" "}
                    {formData.zweitgespraechDate
                      ? format(formData.zweitgespraechDate, "PPP", { locale: de })
                      : "—"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Ergebnis des Zweitgesprächs</Label>
                  <Select
                    disabled={isFollowUpFuture}
                    value={
                      formData.zweitgespraechResult === true
                        ? "erschienen"
                        : formData.zweitgespraechResult === false
                          ? "nicht_erschienen"
                          : "ausstehend"
                    }
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        zweitgespraechResult:
                          value === "erschienen"
                            ? true
                            : value === "nicht_erschienen"
                              ? false
                              : null,
                      });
                    }}
                  >
                    <SelectTrigger className="bg-muted/5 border-muted/30 focus:border-success">
                      <SelectValue placeholder="Ergebnis auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ausstehend">Ausstehend</SelectItem>
                      <SelectItem value="erschienen">Erschienen</SelectItem>
                      <SelectItem value="nicht_erschienen">
                        Nicht erschienen
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {isFollowUpFuture && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Das Zweitgespräch liegt in der Zukunft. Ergebnis kann erst
                      nach dem Termin eingetragen werden.
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSubmit}>Speichern</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Abschluss */}
            {formStep === 4 && (
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
                              !formData.contractStart && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.contractStart
                              ? format(formData.contractStart, "PPP", { locale: de })
                              : "Startdatum auswählen"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.contractStart ?? undefined}
                            onSelect={(date) =>
                              setFormData({ ...formData, contractStart: date ?? null })
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
                          <SelectItem value="bi-monthly">Zweimonatlich</SelectItem>
                          <SelectItem value="quarterly">Quartalsweise</SelectItem>
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
                              !formData.completedAt && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.completedAt
                              ? format(formData.completedAt, "PPP", { locale: de })
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
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="mt-4"
                  >
                    Speichern & Abschließen
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)} className="mt-4">
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Zweitgespräch — full new entry (old first-step flow) */}
            {formStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lead search */}
                <div className="col-span-full space-y-2">
                  <Label>Bestehenden Lead auswählen (optional)</Label>
                  <LeadSearch
                    selectedLeadId={formData.leadId ?? null}
                    onSelectLead={(lead: Lead | null) => {
                      if (lead) {
                        setFormData((prev) => ({
                          ...prev,
                          leadId: lead.id,
                          name: lead.name,
                          email: lead.email ?? "",
                          phone: lead.phone ?? "",
                          source: (lead.source as "organic" | "paid") ?? "",
                          stageId: lead.source_stage_id ?? null,
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          leadId: undefined,
                        }));
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name-zweit">Name (Vor- und Nachname) *</Label>
                  <Input
                    id="name-zweit"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Max Mustermann"
                    className="bg-success/5 border-success/30 focus:border-success"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-zweit">Email</Label>
                  <Input
                    id="email-zweit"
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
                  <Label htmlFor="phone-zweit">Telefon</Label>
                  <Input
                    id="phone-zweit"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+49 123 456789"
                    className="bg-success/5 border-success/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Datum des Zweitgesprächs *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                          !formData.zweitgespraechDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.zweitgespraechDate
                          ? format(formData.zweitgespraechDate, "PPP", { locale: de })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.zweitgespraechDate ?? undefined}
                        onSelect={(date) =>
                          setFormData({ ...formData, zweitgespraechDate: date ?? null })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Quelle *</Label>
                  <Select
                    value={formData.source ?? ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        source: value as "organic" | "paid",
                        stageId: value !== "paid" ? null : formData.stageId,
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
                  <Button variant="outline" onClick={() => setFormStep(0)}>
                    Zurück
                  </Button>
                  <Button
                    onClick={handleZweitgespraechStart}
                    disabled={
                      !formData.name ||
                      !formData.source ||
                      !formData.zweitgespraechDate ||
                      mStart.isPending
                    }
                  >
                    {mStart.isPending ? "Speichern…" : "Speichern"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>
                    Abbrechen
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
                          <label htmlFor="filter-all" className="text-sm font-medium">
                            Alle
                          </label>
                        </div>

                        {[
                          "erstgespräch",
                          "erstgespräch abgeschlossen",
                          "zweitgespräch geplant",
                          "zweitgespräch abgeschlossen",
                          "abgeschlossen",
                          "verloren",
                        ].map((status) => {
                          const capitalized =
                            status.charAt(0).toUpperCase() + status.slice(1);
                          return (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`filter-${status}`}
                                checked={activeStatusFilters.includes(status)}
                                onCheckedChange={() => toggleStatusFilter(status)}
                              />
                              <label htmlFor={`filter-${status}`} className="text-sm">
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
                          <label htmlFor="filter-source-all" className="text-sm font-medium">
                            Alle
                          </label>
                        </div>

                        {[
                          { value: "paid", label: "Bezahlt" },
                          { value: "organic", label: "Organisch" },
                        ].map(({ value, label }) => (
                          <div key={value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`filter-source-${value}`}
                              checked={activeSourceFilters.includes(value)}
                              onCheckedChange={() => toggleSourceFilter(value)}
                            />
                            <label htmlFor={`filter-source-${value}`} className="text-sm">
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
                    ? (stages.find((s) => s.id === e.stage_id)?.name ?? null)
                    : null;
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.client_name}</TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <Badge className={stageBadgeClass[e.stage]}>
                        {e.stage === SALES_STAGE.INITIAL_CONTACT
                          ? "Erstgespräch"
                          : STAGE_LABELS[e.stage]}
                      </Badge>
                    </TableCell>

                    {/* Erstgespräch date */}
                    <TableCell>
                      <span className="text-sm">
                        {e.initial_contact_date
                          ? format(
                              parseDateSafe(e.initial_contact_date)!,
                              "dd.MM.yyyy",
                              { locale: de },
                            )
                          : "–"}
                      </span>
                    </TableCell>

                    {/* Zweitgespräch date with inline edit */}
                    <TableCell>
                      <div className="flex items-center gap-2 relative">
                        <span className="text-sm">
                          {e.follow_up_date && e.stage !== SALES_STAGE.INITIAL_CONTACT
                            ? format(
                                parseDateSafe(e.follow_up_date)!,
                                "dd.MM.yyyy",
                                { locale: de },
                              )
                            : "–"}
                        </span>
                        {e.stage !== SALES_STAGE.INITIAL_CONTACT && e.follow_up_date && (
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={savingId === e.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setEditingId(e.id);
                            }}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}

                        {editingId === e.id && (
                          <Popover open onOpenChange={() => setEditingId(null)}>
                            <PopoverTrigger asChild>
                              <button
                                className="absolute inset-0"
                                style={{ pointerEvents: "none" }}
                                aria-hidden="true"
                              />
                            </PopoverTrigger>
                            <PopoverContent
                              className="absolute left-0 mt-2 w-auto p-2 z-50 bg-background border rounded-md shadow-md"
                              align="start"
                              side="bottom"
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <Calendar
                                mode="single"
                                selected={
                                  parseDateSafe(e.follow_up_date ?? null) ??
                                  undefined
                                }
                                onSelect={async (newDate) => {
                                  if (!newDate) return;
                                  try {
                                    setSavingId(e.id);
                                    await mPatch.mutateAsync({
                                      id: e.id,
                                      payload: {
                                        follow_up_date: format(
                                          newDate,
                                          "yyyy-MM-dd",
                                        ),
                                      } as SalesProcessUpdateRequest,
                                    });
                                    await qc.invalidateQueries({
                                      queryKey: ["sales"],
                                    });
                                  } catch (err) {
                                    alert(
                                      "Fehler beim Speichern: " +
                                        extractErrorMessage(err),
                                    );
                                  } finally {
                                    setSavingId(null);
                                    setEditingId(null);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>

                    {/* Result */}
                    <TableCell>
                      {e.stage === SALES_STAGE.INITIAL_CONTACT
                        ? "–"
                        : e.follow_up_result === true
                          ? "Erschienen"
                          : e.follow_up_result === false
                            ? "Nicht erschienen"
                            : "Ausstehend"}
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

                    {/* Actions column */}
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <CommentsDialog
                          entityType="salesprocess"
                          entityId={e.id}
                          entityName={e.client_name}
                        />

                        {/* Zweitgespräch planen — only for Erstgespräch stage */}
                        {e.stage === SALES_STAGE.INITIAL_CONTACT && (
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
                                zweitgespraechDate: null,
                              }));
                            }}
                          >
                            Zweitgespräch planen
                          </Button>
                        )}

                        {/* Ergebnis eintragen — only for follow_up with no result yet */}
                        {e.stage === SALES_STAGE.FOLLOW_UP &&
                          e.follow_up_result == null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowForm(true);
                                setFormStep(3);

                                const followUpDate = parseDateSafe(e.follow_up_date);
                                const now = new Date();

                                const defaultResult =
                                  followUpDate && followUpDate > now
                                    ? null
                                    : (e.follow_up_result ?? null);

                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.client_name,
                                  salesProcessId: e.id,
                                  clientId: e.client_id,
                                  zweitgespraechResult: defaultResult,
                                  zweitgespraechDate: followUpDate,
                                }));
                              }}
                            >
                              Ergebnis eintragen
                            </Button>
                          )}

                        {/* Abschluss eingeben */}
                        {e.stage === SALES_STAGE.FOLLOW_UP &&
                          e.follow_up_result === true && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowForm(true);
                                setFormStep(4);
                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.client_name,
                                  salesProcessId: e.id,
                                  clientId: e.client_id,
                                  zweitgespraechResult: true,
                                  abschluss: null,
                                  zweitgespraechDate: parseDateSafe(e.follow_up_date),
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
                                `/contracts?client=${e.client_id}&open=1&sales_process=${e.id}`,
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
