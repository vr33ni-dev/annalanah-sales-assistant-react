import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/helpers/error";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Phone,
  Calendar as CalendarIcon,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  CalendarPlus,
  Users,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  // API types & functions
  SalesProcess,
  Stage,
  getSalesProcesses,
  getStages,
  startSalesProcess,
  updateSalesProcess,
  createContract,
  SalesProcessUpdateRequest,
} from "@/lib/api";

// ---- mappings (backend → UI labels) ----------------------------------------

type SalesStage = "zweitgespraech" | "abschluss" | "lost";

const stageLabel: Record<SalesStage, string> = {
  zweitgespraech: "Zweitgespräch",
  abschluss: "Abgeschlossen",
  lost: "Verloren",
};

const stageBadgeClass: Record<SalesStage, string> = {
  zweitgespraech: "bg-warning text-warning-foreground",
  abschluss: "bg-success text-success-foreground",
  lost: "bg-destructive text-destructive-foreground",
};

// ---- component --------------------------------------------------------------

type UIEntry = {
  id: number; // sales_process.id
  clientId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  stage: SalesProcess["stage"];
  zweitgespraechDate?: string | null;
  source?: "organic" | "paid";
  linkedStageName?: string | null; // resolved from stages if available
  zweitgespraechResult?: boolean | null;
  abschluss?: boolean | null;
  revenue?: number | null;
};

export default function SalesProcessView() {
  const qc = useQueryClient();

  // Data
  const {
    data: sales = [],
    isLoading: loadingSales,
    isError: errorSales,
  } = useQuery<SalesProcess[]>({
    queryKey: ["sales"],
    queryFn: getSalesProcesses,
  });

  const { data: stages = [], isLoading: loadingStages } = useQuery({
    queryKey: ["stages"],
    queryFn: getStages,
  });

  // Form UI state
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  type StatusFilter =
    | "all"
    | "zweitgespräch geplant"
    | "zweitgespräch abgeschlossen"
    | "abgeschlossen"
    | "verloren";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Form data
  const [formData, setFormData] = useState<{
    // step 1
    name: string;
    email?: string;
    phone?: string;
    source?: "organic" | "paid" | "";
    stageId?: number | null; // selected stage.id (for paid)
    zweitgespraechDate?: Date | null;

    // runtime: id of created sales process after step 1
    salesProcessId?: number;

    // step 2
    zweitgespraechResult: boolean | null;

    // step 3
    abschluss: boolean | null;
    revenue?: string; // text input
    contractDuration?: string; // "6", "12" (months)
    contractStart?: Date | null;
    contractFrequency?: "monthly" | "bi-monthly" | "quarterly" | "";
    clientId?: number;
  }>({
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
  });

  // Mutations
  const mStart = useMutation({
    mutationFn: startSalesProcess,
    onSuccess: (res) => {
      // keep ids in case you need them, but we close now
      setFormData((prev) => ({
        ...prev,
        salesProcessId: res.sales_process_id,
        clientId: res.client.id,
      }));
      qc.invalidateQueries({ queryKey: ["sales"] });

      // ✅ close & reset immediately after planning
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
      });
    },
  });

  // PATCH sales process
  const mPatch = useMutation<
    // Success type:
    Awaited<ReturnType<typeof updateSalesProcess>>,
    // Error type:
    unknown,
    // Variables (input) type:
    { id: number; payload: SalesProcessUpdateRequest }
  >({
    mutationFn: ({ id, payload }) => updateSalesProcess(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales"] }),
    onError: (err: unknown) => {
      alert(
        `Fehler beim Aktualisieren (PATCH /api/sales): ${extractErrorMessage(
          err
        )}`
      );
    },
  });

  // POST contract
  type CreateContractVars = {
    client_id: number;
    sales_process_id: number;
    start_date: string;
    duration_months: number;
    revenue_total: number;
    payment_frequency: "monthly" | "bi-monthly" | "quarterly";
  };

  const mCreateContract = useMutation<
    Awaited<ReturnType<typeof createContract>>,
    unknown,
    CreateContractVars
  >({
    mutationFn: (payload) => createContract(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
    onError: (err: unknown) => {
      alert(
        `Fehler beim Vertrag anlegen (POST /api/contracts): ${extractErrorMessage(
          err
        )}`
      );
    },
  });

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return sales;
    return sales.filter((e) => {
      const s =
        e.stage === "zweitgespraech"
          ? (e.zweitgespraech_result ?? null) == null
            ? "zweitgespräch geplant"
            : "zweitgespräch abgeschlossen"
          : e.stage === "abschluss"
          ? "abgeschlossen"
          : "verloren";
      return s === statusFilter;
    });
  }, [sales, statusFilter]);

  // Handlers for the 3-step flow
  const handleSubmit = async () => {
    if (formStep === 1) {
      if (!formData.name || !formData.zweitgespraechDate || !formData.source)
        return;

      const payload = {
        name: formData.name,
        email: formData.email ?? "",
        phone: formData.phone ?? "",
        source: formData.source,
        source_stage_id:
          formData.source === "paid" ? formData.stageId ?? null : null,
        zweitgespraech_date: formData.zweitgespraechDate
          ? format(formData.zweitgespraechDate, "yyyy-MM-dd")
          : null,
      };

      await mStart.mutateAsync(payload);
      return; // ✅ mStart.onSuccess now closes + resets
    }

    // Step 2 submit
    if (formStep === 2) {
      if (!formData.salesProcessId || formData.zweitgespraechResult === null)
        return;

      await mPatch.mutateAsync({
        id: formData.salesProcessId,
        payload: { zweitgespraech_result: formData.zweitgespraechResult },
      });

      // ✅ close & reset (don't go to step 3 now)
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
      });
      return;
    }

    if (formStep === 3) {
      if (!formData.salesProcessId) return;

      const revenueNum =
        formData.abschluss && formData.revenue
          ? Number(formData.revenue)
          : null;

      // Build PATCH payload
      const payload: SalesProcessUpdateRequest = {
        zweitgespraech_result: formData.zweitgespraechResult ?? true,
        abschluss: formData.abschluss ?? null,
        revenue: revenueNum,
      };

      if (formData.abschluss) {
        // Only include these when closing won (backend requires them)
        payload.contract_duration_months = Number(formData.contractDuration);
        payload.contract_start_date = formData.contractStart
          ? format(formData.contractStart, "yyyy-MM-dd")
          : undefined;
        payload.contract_frequency = formData.contractFrequency as
          | "monthly"
          | "bi-monthly"
          | "quarterly";
      }

      await mPatch.mutateAsync({
        id: formData.salesProcessId,
        payload,
      });

      // (Optional) remove this block; backend auto-creates on close-won now
      // if (formData.abschluss && …) { await mCreateContract.mutateAsync(...); }

      // close & reset
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
      });
      return;
    }
  };

  // UI
  if (loadingSales || loadingStages) {
    return <div className="p-6">Lade Verkaufsdaten…</div>;
  }
  if (errorSales) {
    return (
      <div className="p-6 text-red-500">Fehler beim Laden der Pipeline.</div>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Verkaufsprozess
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Verkaufspipeline und Aktivitäten
          </p>
        </div>
        <div className="flex gap-3">
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
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="max@example.com"
                    className="bg-success/5 border-success/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
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
                        {formData.zweitgespraechDate ? (
                          format(formData.zweitgespraechDate, "PPP", {
                            locale: de,
                          })
                        ) : (
                          <span>Datum auswählen</span>
                        )}
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
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Zweitgespräch am:{" "}
                    {formData.zweitgespraechDate &&
                      format(formData.zweitgespraechDate, "PPP", {
                        locale: de,
                      })}
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
              <div className="space-y-4">
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
                            {formData.contractStart ? (
                              format(formData.contractStart, "PPP", {
                                locale: de,
                              })
                            ) : (
                              <span>Startdatum auswählen</span>
                            )}
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

      {/* Sales Process Pipeline Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Verkaufspipeline
            </CardTitle>
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
                <TableHead>Status</TableHead>
                <TableHead>Zweitgespräch Datum</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Verknüpfte Bühne</TableHead>
                <TableHead>Umsatz</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => {
                const linkedStageName = e.stage_id
                  ? stages.find((s) => s.id === e.stage_id)?.name ?? null
                  : null;

                return (
                  <TableRow key={e.id}>
                    {/* Kunde */}
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{e.client_name}</span>
                        {(e.client_phone || e.client_email) && (
                          <span className="text-xs text-muted-foreground">
                            {e.client_phone ?? e.client_email}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Stage / Status */}
                    <TableCell>
                      <Badge className={stageBadgeClass[e.stage]}>
                        {stageLabel[e.stage]}
                      </Badge>
                    </TableCell>

                    {/* Zweitgespräch Datum */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        {e.zweitgespraech_date ?? "-"}
                      </div>
                    </TableCell>

                    {/* Zweitgespräch Ergebnis */}
                    <TableCell>
                      {e.zweitgespraech_result === true && (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Erschienen
                        </Badge>
                      )}
                      {e.zweitgespraech_result === false && (
                        <Badge className="bg-destructive text-destructive-foreground">
                          <XCircle className="w-3 h-3 mr-1" />
                          Nicht erschienen
                        </Badge>
                      )}
                      {e.zweitgespraech_result === null && (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Ausstehend
                        </Badge>
                      )}
                    </TableCell>

                    {/* Quelle */}
                    <TableCell>
                      <Badge variant="secondary">
                        {e.client_source
                          ? e.client_source === "paid"
                            ? "Bezahlt"
                            : "Organisch"
                          : "-"}
                      </Badge>
                    </TableCell>

                    {/* Verknüpfte Bühne */}
                    <TableCell>
                      {linkedStageName ? (
                        <Badge variant="outline">{linkedStageName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Umsatz */}
                    <TableCell>
                      {e.revenue != null ? (
                        <span className="font-medium text-success">
                          €{e.revenue.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Aktionen */}
                    <TableCell>
                      <div className="flex gap-2">
                        {e.stage === "zweitgespraech" &&
                          e.zweitgespraech_result == null && (
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
                                  // ✅ set the date for display/picker
                                  zweitgespraechDate: e.zweitgespraech_date
                                    ? parseISO(e.zweitgespraech_date) // or new Date(e.zweitgespraech_date)
                                    : null,
                                }));
                              }}
                            >
                              Ergebnis eintragen
                            </Button>
                          )}

                        {e.stage === "zweitgespraech" &&
                          e.zweitgespraech_result === true && (
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
                                  // ✅ keep the date
                                  zweitgespraechDate: e.zweitgespraech_date
                                    ? parseISO(e.zweitgespraech_date)
                                    : null,
                                }));
                              }}
                            >
                              Abschluss eingeben
                            </Button>
                          )}

                        {e.stage === "abschluss" && (
                          <Button size="sm" variant="outline">
                            Vertrag anzeigen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    Keine Einträge.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* KPI Summary (still static placeholders; replace with real calcs if you like) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Erscheinungsquote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">–</div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-muted-foreground">Berechnung folgt</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Abschlussquote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">–</div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-muted-foreground">Berechnung folgt</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
