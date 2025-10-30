// src/pages/SalesProcess.tsx
import { SALES_STAGE } from "@/constants/stages";
import { STAGE_LABELS } from "@/constants/labels";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
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

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return sales;
    return sales.filter((e) => {
      const s =
        e.stage === SALES_STAGE.FOLLOW_UP
          ? (e.follow_up_result ?? null) == null
            ? "zweitgespräch geplant"
            : "zweitgespräch abgeschlossen"
          : e.stage === SALES_STAGE.CLOSED
          ? "abgeschlossen"
          : "verloren";
      return s === statusFilter;
    });
  }, [sales, statusFilter]);

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
      return;
    }

    if (formStep === 2) {
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

      {/* table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Verkaufspipeline
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
