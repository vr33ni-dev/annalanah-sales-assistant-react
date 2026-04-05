// src/pages/SalesProcess.tsx
import { SALES_STAGE, STAGE_LABELS } from "@/constants/stages";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { parseIsoToLocal } from "@/helpers/date";
import { extractErrorMessage } from "@/helpers/error";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarPlus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import {
  Client,
  SalesProcessUpdateRequest,
  createLead,
  StartSalesProcessRequest,
  updateClient,
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
import { SalesProcessDetailSheet } from "@/components/sales-process/SalesProcessDetailSheet";
import type { DetailSavePayload } from "@/components/sales-process/SalesProcessDetailSheet";
import type {
  GespraechType,
  SalesProcessFormData,
  SalesProcessFormStep,
} from "@/components/sales-process/types";

export default function SalesProcessView() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
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
  const [selectedDetailEntry, setSelectedDetailEntry] =
    useState<SalesProcessWithStageId | null>(null);
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

  const toLower = (v: unknown) => (v ?? "").toString().toLowerCase();

  // Apply top-level search on the already-filtered sales entries
  const searchedEntries = filteredEntries.filter((entry) => {
    const q = toLower(searchTerm);
    if (!q) return true;
    return (
      toLower(entry.client_name).includes(q) ||
      toLower(entry.client_email).includes(q) ||
      toLower(entry.client_phone).includes(q)
    );
  });

  // Replace pagination source with searched entries
  const {
    page: salesPage2,
    setPage: setSalesPage2,
    totalPages: salesTotalPages2,
    paginatedItems: paginatedSales2,
  } = usePagination(searchedEntries, 10);

  // Use the searched/paginated values below instead of the original ones
  // (we'll shadow the earlier names to minimize other changes)
  const page = salesPage2;
  const setPage = setSalesPage2;
  const totalPages = salesTotalPages2;
  const paginatedSalesFinal = paginatedSales2;

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

    if (formData.leadId != null) {
      const hasActive = sales.some(
        (s) =>
          s.stage !== SALES_STAGE.CLOSED &&
          s.stage !== SALES_STAGE.LOST &&
          ((s.lead_id != null && s.lead_id === formData.leadId) ||
            (s.client_id != null &&
              sales.some(
                (s2) =>
                  s2.lead_id === formData.leadId &&
                  s2.client_id === s.client_id,
              ))),
      );
      if (hasActive) {
        toast({
          title: "Bereits in aktivem Verkaufsprozess",
          description: `Dieser Lead hat bereits einen laufenden Verkaufsprozess.`,
          variant: "destructive",
        });
        return;
      }
    }

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

    let resolvedLeadId: number | undefined = formData.leadId;

    // Create a lead if not already linked (same as Erstgespräch flow)
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
      const hasActive = sales.some(
        (s) =>
          s.stage !== SALES_STAGE.CLOSED &&
          s.stage !== SALES_STAGE.LOST &&
          ((s.lead_id != null && s.lead_id === lead.id) ||
            (lead.converted_client_id != null &&
              s.client_id === lead.converted_client_id)),
      );

      if (hasActive) {
        toast({
          title: "Bereits in aktivem Verkaufsprozess",
          description: `"${lead.name}" hat bereits einen laufenden Verkaufsprozess.`,
          variant: "destructive",
        });
        return;
      }

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

  const handleShowDetails = (entry: SalesProcessWithStageId) => {
    setSelectedDetailEntry(entry);
  };

  const handleSaveDetails = async (id: number, payload: DetailSavePayload) => {
    const entry = sales.find((item) => item.id === id);
    if (!entry) return;

    const selectedStage =
      payload.source === "paid"
        ? stages.find((stage) => stage.id === payload.source_stage_id)
        : null;

    const clientPayload: Partial<Client> = {
      email: payload.client_email || undefined,
      phone: payload.client_phone || undefined,
      source: payload.source || undefined,
      source_stage_id:
        payload.source === "paid" ? (selectedStage?.id ?? null) : null,
      source_stage_name: payload.source === "paid" ? undefined : null,
    };

    const optimisticClient: Client = {
      id: entry.client_id,
      name: entry.client_name,
      email: payload.client_email || entry.client_email || "",
      phone: payload.client_phone || entry.client_phone || "",
      source: payload.source || null,
      source_stage_id:
        payload.source === "paid" ? (selectedStage?.id ?? null) : null,
      source_stage_name:
        payload.source === "paid" ? (selectedStage?.name ?? null) : null,
      status: "",
      completed_at: payload.completed_at ?? entry.completed_at ?? null,
    };

    try {
      const [, savedClient] = await Promise.all([
        mPatch.mutateAsync({
          id,
          payload: {
            initial_contact_date: payload.initial_contact_date,
            follow_up_date:
              entry.stage !== SALES_STAGE.INITIAL_CONTACT
                ? payload.follow_up_date
                : undefined,
            follow_up_result: payload.follow_up_result,
            completed_at: payload.completed_at || undefined,
          },
        }),
        updateClient(entry.client_id, clientPayload),
      ]);

      const mergedClient: Client = {
        ...optimisticClient,
        ...savedClient,
        source: savedClient.source ?? optimisticClient.source,
        source_stage_id:
          (savedClient.source ?? optimisticClient.source) === "paid"
            ? (savedClient.source_stage_id ?? optimisticClient.source_stage_id)
            : null,
        source_stage_name:
          (savedClient.source ?? optimisticClient.source) === "paid"
            ? (savedClient.source_stage_name ??
              optimisticClient.source_stage_name)
            : null,
      };

      qc.setQueryData<SalesProcessWithStageId[]>(queryKeys.sales, (current) =>
        (current ?? []).map((item) =>
          item.id === id
            ? {
                ...item,
                client_email: optimisticClient.email || item.client_email,
                client_phone: optimisticClient.phone || item.client_phone,
                initial_contact_date:
                  payload.initial_contact_date ?? item.initial_contact_date,
                follow_up_date:
                  entry.stage !== SALES_STAGE.INITIAL_CONTACT
                    ? (payload.follow_up_date ?? item.follow_up_date)
                    : item.follow_up_date,
                follow_up_result:
                  payload.follow_up_result !== undefined
                    ? payload.follow_up_result
                    : item.follow_up_result,
                completed_at: payload.completed_at ?? item.completed_at,
                client_source:
                  mergedClient.source === "paid" ||
                  mergedClient.source === "organic"
                    ? mergedClient.source
                    : item.client_source,
                stage_id: mergedClient.source_stage_id ?? null,
                source_stage_name: mergedClient.source_stage_name ?? null,
              }
            : item,
        ),
      );

      qc.setQueryData<Client[]>(queryKeys.clients(false), (current) =>
        (current ?? []).map((client) =>
          client.id === savedClient.id
            ? {
                ...client,
                ...optimisticClient,
                ...savedClient,
                source_stage_id:
                  savedClient.source_stage_id ??
                  optimisticClient.source_stage_id,
                source_stage_name:
                  savedClient.source_stage_name ??
                  optimisticClient.source_stage_name,
              }
            : client,
        ),
      );

      await qc.invalidateQueries({ queryKey: ["clients"] });
      await qc.invalidateQueries({ queryKey: queryKeys.leads });

      toast({
        title: "Eintrag aktualisiert",
        description: "Änderungen wurden gespeichert.",
        variant: "default",
        duration: 3500,
      });
    } catch (err) {
      toast({
        title: "Fehler beim Speichern",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
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
        setActiveStatusFilters={setActiveStatusFilters}
        activeStatusFilters={activeStatusFilters}
        activeSourceFilters={activeSourceFilters}
        setActiveSourceFilters={setActiveSourceFilters}
        toggleStatusFilter={toggleStatusFilter}
        toggleSourceFilter={toggleSourceFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        paginatedSales={paginatedSalesFinal}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        stages={stages}
        highlightId={highlightId}
        onShowDetails={handleShowDetails}
        onPlanFollowUp={handlePlanFollowUp}
        onEnterResult={handleEnterResult}
        onEnterClosing={handleEnterClosing}
        page={page}
        totalPages={totalPages}
        totalItems={searchedEntries.length}
        onPageChange={setPage}
      />
      <SalesProcessDetailSheet
        entry={selectedDetailEntry}
        stages={stages}
        onClose={() => setSelectedDetailEntry(null)}
        onSave={handleSaveDetails}
      />
    </div>
  );
}
