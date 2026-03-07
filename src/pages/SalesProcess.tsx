// src/pages/SalesProcess.tsx
import { SALES_STAGE, STAGE_LABELS } from "@/constants/stages";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { parseIsoToLocal } from "@/helpers/date";
import { extractErrorMessage } from "@/helpers/error";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus } from "lucide-react";

import {
  SalesProcessUpdateRequest,
  createLead,
  StartSalesProcessRequest,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { MergeConflicts } from "@/types/merge";
import { isFetchError, StartSalesProcessError } from "@/types/apiError";
import { MergeConflictDialog } from "@/components/MergeConflictDialog";
import { Lead } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { queryKeys } from "@/lib/queryKeys";
import { useSalesProcessFilters } from "@/hooks/useSalesProcessFilters";
import { useSalesProcessData } from "@/hooks/useSalesProcessData";
import type { SalesProcessWithStageId } from "@/hooks/useSalesProcessFilters";
import { SalesProcessWorkflowForm } from "@/components/sales-process/SalesProcessWorkflowForm";
import { SalesProcessTable } from "@/components/sales-process/SalesProcessTable";
import type {
  GespraechType,
  SalesProcessFormData,
  SalesProcessFormStep,
} from "@/components/sales-process/types";

export default function SalesProcessView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [highlightId, setHighlightId] = useState<number | null>(null);

  function isFutureDate(date?: Date | null) {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d > t;
  }

  function showErrorToast(title: string, err: unknown) {
    toast({
      title,
      description: extractErrorMessage(err),
      variant: "destructive",
    });
  }

  // Form state
  const [showForm, setShowForm] = useState(false);
  // formStep: 0 = type selection, 1 = Erstgespräch, 2 = Zweitgespräch (from Aktionen or old flow),
  //           3 = Ergebnis, 4 = Abschluss, 5 = old Zweitgespräch full flow step 1
  const [formStep, setFormStep] = useState<SalesProcessFormStep>(0);
  const [gespraechType, setGespraechType] =
    useState<GespraechType>("erstgespraech");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingInitialId, setEditingInitialId] = useState<number | null>(null);
  const [popoverSide, setPopoverSide] = useState<"top" | "bottom">("bottom");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [existingClientId, setExistingClientId] = useState<number | null>(null);
  const [hasActiveContract, setHasActiveContract] = useState(false);

  // Form Merge conflict state
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflicts | null>(
    null,
  );
  const [pendingPayload, setPendingPayload] =
    useState<StartSalesProcessRequest | null>(null);

  const [formData, setFormData] = useState<SalesProcessFormData>({
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
    contractFrequency: "" as
      | ""
      | "monthly"
      | "bi-monthly"
      | "quarterly"
      | "one-time"
      | "bi-yearly",
    clientId: undefined as number | undefined,
    leadId: undefined as number | undefined,
    completedAt: null as string | null,
  });

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

  const {
    sales,
    loadingSales,
    errorSales,
    stages,
    loadingStages,
    errorStages,
    mStart,
    mPatch,
  } = useSalesProcessData({
    onStartSuccess: () => {
      setMergeConflicts(null);
      setPendingPayload(null);
      setExistingClientId(null);
      setHasActiveContract(false);
      resetAll();
    },
    onClientHasActiveContract: (clientId) => {
      setHasActiveContract(true);
      setMergeConflicts({});
      setPendingPayload(null);
      setExistingClientId(clientId);
    },
    onClientExists: ({
      clientId,
      hasActiveContract,
      conflicts,
      originalPayload,
    }) => {
      setExistingClientId(clientId);
      setHasActiveContract(hasActiveContract);
      setMergeConflicts(conflicts);
      setPendingPayload(originalPayload);
    },
    showErrorToast,
  });

  // If navigated here with ?sales_process=<id>, scroll to and briefly highlight that row
  useEffect(() => {
    const spParam = searchParams.get("sales_process");
    if (!spParam) return;
    const spId = Number(spParam);
    if (Number.isNaN(spId)) return;

    // Wait until `sales` are present in the DOM
    const el = document.getElementById(`sales-${spId}`);
    if (el) {
      // scroll into view and highlight
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(spId);
      window.setTimeout(() => setHighlightId(null), 3000);
    }
  }, [sales, searchParams]);

  const {
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
  } = useSalesProcessFilters(sales);

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

  const {
    page: salesPage,
    setPage: setSalesPage,
    totalPages: salesTotalPages,
    paginatedItems: paginatedSales,
  } = usePagination(filteredEntries, 10);

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
    ["monthly", "bi-monthly", "quarterly", "bi-yearly", "one-time"].includes(
      formData.contractFrequency,
    );

  const canSubmit = formData.abschluss !== true || isContractValid;

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
        showErrorToast("Fehler beim Anlegen des Leads", err);
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
      try {
        await mPatch.mutateAsync({
          id: formData.salesProcessId,
          payload: {
            follow_up_date: format(formData.zweitgespraechDate, "yyyy-MM-dd"),
          } as SalesProcessUpdateRequest,
        });
        toast({
          title: "Zweitgespräch gespeichert",
          description: "Das Zweitgespräch wurde erfolgreich geplant.",
          variant: "default",
          duration: 3500,
        });
        resetAll();
      } catch (err) {
        toast({
          title: "Fehler beim Speichern",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
      return;
    }

    // Step 3: Zweitgespräch Ergebnis
    if (formStep === 3) {
      if (!formData.salesProcessId) return;
      try {
        await mPatch.mutateAsync({
          id: formData.salesProcessId,
          payload: { follow_up_result: formData.zweitgespraechResult },
        });
        toast({
          title: "Ergebnis gespeichert",
          description: "Das Ergebnis des Zweitgesprächs wurde gespeichert.",
          variant: "default",
          duration: 3500,
        });
        resetAll();
      } catch (err) {
        toast({
          title: "Fehler beim Speichern",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
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
          | "quarterly"
          | "one-time"
          | "bi-yearly";
      }

      try {
        await mPatch.mutateAsync({ id: formData.salesProcessId, payload });
        toast({
          title: "Abschluss gespeichert",
          description: "Der Abschluss wurde erfolgreich gespeichert.",
          variant: "default",
          duration: 3500,
        });
        resetAll();
      } catch (err) {
        toast({
          title: "Fehler beim Speichern",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      }
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

  const handleSelectLead = (lead: Lead | null) => {
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
  };

  const handleSaveInitialContactDate = async (id: number, newDate: Date) => {
    try {
      await mPatch.mutateAsync({
        id,
        payload: {
          initial_contact_date: format(newDate, "yyyy-MM-dd"),
        } as SalesProcessUpdateRequest,
      });
      await qc.invalidateQueries({ queryKey: queryKeys.sales });
    } catch (err) {
      showErrorToast("Fehler beim Speichern", err);
      throw err;
    }
  };

  const handleSaveFollowUpDate = async (id: number, newDate: Date) => {
    try {
      await mPatch.mutateAsync({
        id,
        payload: {
          follow_up_date: format(newDate, "yyyy-MM-dd"),
        } as SalesProcessUpdateRequest,
      });
      await qc.invalidateQueries({ queryKey: queryKeys.sales });
    } catch (err) {
      showErrorToast("Fehler beim Speichern", err);
      throw err;
    }
  };

  const handlePlanFollowUp = (entry: SalesProcessWithStageId) => {
    setShowForm(true);
    setFormStep(2);
    setFormData((prev) => ({
      ...prev,
      name: entry.client_name,
      salesProcessId: entry.id,
      clientId: entry.client_id,
      zweitgespraechDate: null,
    }));
  };

  const handleEnterResult = (entry: SalesProcessWithStageId) => {
    setShowForm(true);
    setFormStep(3);

    const followUpDate = parseIsoToLocal(entry.follow_up_date);
    const now = new Date();
    const defaultResult =
      followUpDate && followUpDate > now
        ? null
        : (entry.follow_up_result ?? null);

    setFormData((prev) => ({
      ...prev,
      name: entry.client_name,
      salesProcessId: entry.id,
      clientId: entry.client_id,
      zweitgespraechResult: defaultResult,
      zweitgespraechDate: followUpDate,
    }));
  };

  const handleEnterClosing = (entry: SalesProcessWithStageId) => {
    setShowForm(true);
    setFormStep(4);
    setFormData((prev) => ({
      ...prev,
      name: entry.client_name,
      salesProcessId: entry.id,
      clientId: entry.client_id,
      zweitgespraechResult: true,
      abschluss: null,
      zweitgespraechDate: parseIsoToLocal(entry.follow_up_date),
    }));
  };

  const handleShowContract = (entry: SalesProcessWithStageId) => {
    const base = `/contracts?client=${entry.client_id}&open=1`;
    const url = entry.id ? `${base}&sales_process=${entry.id}` : base;
    navigate(url);
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

      <SalesProcessWorkflowForm
        showForm={showForm}
        title={cardTitle()}
        formStep={formStep}
        setFormStep={setFormStep}
        gespraechType={gespraechType}
        setGespraechType={setGespraechType}
        formData={formData}
        setFormData={setFormData}
        stages={stages}
        isStartPending={mStart.isPending}
        isPatchPending={mPatch.isPending}
        canSubmit={canSubmit}
        isFollowUpFuture={isFollowUpFuture}
        onClose={() => setShowForm(false)}
        onErstgespraechSave={handleErstgespraechSave}
        onZweitgespraechStart={handleZweitgespraechStart}
        onSubmit={handleSubmit}
        onSelectLead={handleSelectLead}
      />

      <SalesProcessTable
        statusFilter={statusFilter}
        setActiveStatusFilters={setActiveStatusFilters}
        activeStatusFilters={activeStatusFilters}
        activeSourceFilters={activeSourceFilters}
        setActiveSourceFilters={setActiveSourceFilters}
        toggleStatusFilter={toggleStatusFilter}
        toggleSourceFilter={toggleSourceFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        paginatedSales={paginatedSales}
        stages={stages}
        highlightId={highlightId}
        editingId={editingId}
        setEditingId={setEditingId}
        editingInitialId={editingInitialId}
        setEditingInitialId={setEditingInitialId}
        popoverSide={popoverSide}
        setPopoverSide={setPopoverSide}
        savingId={savingId}
        setSavingId={setSavingId}
        onSaveInitialContactDate={handleSaveInitialContactDate}
        onSaveFollowUpDate={handleSaveFollowUpDate}
        onPlanFollowUp={handlePlanFollowUp}
        onEnterResult={handleEnterResult}
        onEnterClosing={handleEnterClosing}
        onShowContract={handleShowContract}
        page={salesPage}
        totalPages={salesTotalPages}
        onPageChange={setSalesPage}
      />
    </div>
  );
}
