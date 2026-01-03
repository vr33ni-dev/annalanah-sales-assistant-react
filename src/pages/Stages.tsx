// src/pages/Stages.tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { deleteStageParticipant } from "@/lib/api";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  DollarSign,
  Target,
  TrendingUp,
  MapPin,
  Pencil,
} from "lucide-react";
import {
  getStages,
  createStage,
  updateStageStats,
  updateStageInfo,
  addStageParticipant,
  getStageParticipants,
  Stage,
  StageParticipant,
  getNumericSetting,
  StageParticipantUI,
} from "@/lib/api";
import { MetricChip } from "@/components/MetricChip";
import {
  ParticipantForm,
  Participant,
} from "@/components/stage/ParticipantForm";
import { StageParticipantsDialog } from "@/components/stage/StageParticipantsDialog";
import { StagePerformanceDialog } from "@/components/stage/StagePerformanceDialog";

/* ------------------------- Types & Helpers ------------------------- */

type StatusKey = "completed" | "upcoming";

const statusColors: Record<StatusKey, string> = {
  completed: "bg-success text-success-foreground",
  upcoming: "bg-warning text-warning-foreground",
};

const num = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

const formatDate = (iso?: string | null): string => {
  if (!iso) return "–";

  // if it's a pure date string like "2025-10-26", return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  // if it's ISO with time and Z, remove time part to keep UTC date
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (match) return match[1];

  // fallback
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};

function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // Format as YYYY-MM-DD
  return d.toISOString().split("T")[0];
}

const deriveStatus = (iso?: string | null): StatusKey => {
  if (!iso) return "upcoming";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "upcoming";
  const today = new Date();
  const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dMid < tMid ? "completed" : "upcoming";
};

const toNumberOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const fmtPct = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? `${v}%` : "–";
const fmtMoney = (v: number | null | undefined) =>
  typeof v === "number" && v > 0 ? `€${v.toLocaleString()}` : "–";

const pct = (n: number) => `${n}%`;
const euro = (n: number) => `€${n.toLocaleString()}`;

const closingText = (
  participants: number,
  registrations: number,
  closing?: number | null
) => {
  if (!(registrations > 0)) return "Closing-Rate: nicht genug Daten.";
  const val = typeof closing === "number" ? pct(closing) : "–";
  return `Closing-Rate = (Teilnehmer / Anmeldungen) × 100
= (${participants} / ${registrations}) × 100 = ${val}`;
};

// “ROI” here = Umsatz/Budget × 100 (i.e., ROAS but labeled ROI)
const roiText = (
  revenue?: number | null,
  budget?: number | null,
  roi?: number | null
) => {
  if (!(budget && budget > 0) || revenue == null)
    return "ROI: nicht genug Daten.";
  const val = typeof roi === "number" ? `${roi}%` : "–";
  return `ROI = (Umsatz / Budget) × 100
= (${euro(revenue)} / ${euro(budget)}) × 100 = ${val}`;
};

/* ------------------------- Create Dialog ------------------------- */

function CreateStageDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState<string>(""); // YYYY-MM-DD
  const [adBudget, setAdBudget] = useState<string>("");
  const [registrations, setRegistrations] = useState<string>("");
  const [participants, setParticipants] = useState<string>("");
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        date: date.trim() === "" ? null : date.trim(),
        ad_budget: toNumberOrNull(adBudget),
        registrations: toNumberOrNull(registrations),
        participants: toNumberOrNull(participants),
      };
      const newStage = await createStage(payload);

      // Add participants (only create as lead if checkbox is checked)
      const validParticipants = participantsList.filter(
        (p) => p.name.trim().length > 0
      );

      for (const p of validParticipants) {
        await addStageParticipant(newStage.id, {
          participant_name: p.name.trim(),
          participant_email: p.email.trim() || undefined,
          participant_phone: p.phone.trim() || undefined,
          attended: true,
          create_as_lead: p.createAsLead,
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["stages"] });
      await qc.invalidateQueries({ queryKey: ["leads"] });
      setOpen(false);
      setName("");
      setDate("");
      setAdBudget("");
      setRegistrations("");
      setParticipants("");
      setParticipantsList([]);
    },
  });

  const canSubmit = name.trim().length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Bühne erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Bühne</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="stage-name">Name *</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Berlin Workshop"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage-date">Datum</Label>
            <Input
              id="stage-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage-budget">Werbebudget (€)</Label>
            <Input
              id="stage-budget"
              inputMode="decimal"
              value={adBudget}
              onChange={(e) => setAdBudget(e.target.value)}
              placeholder="z. B. 500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="stage-registrations">Anmeldungen</Label>
              <Input
                id="stage-registrations"
                inputMode="numeric"
                value={registrations}
                onChange={(e) => setRegistrations(e.target.value)}
                placeholder="z. B. 80"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stage-participants">Teilnehmer (Anzahl)</Label>
              <Input
                id="stage-participants"
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="z. B. 50"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <ParticipantForm
              participants={participantsList}
              onChange={setParticipantsList}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutate()}>
            {isPending ? "Speichern…" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Edit Dialog ------------------------- */

function EditStageDialog({ stage }: { stage: Stage }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Existing state
  const [registrations, setRegistrations] = useState(
    stage.registrations != null ? String(stage.registrations) : ""
  );
  const [participants, setParticipants] = useState(
    stage.participants != null ? String(stage.participants) : ""
  );

  // ✅ new state for basic info
  const [name, setName] = useState(stage.name ?? "");
  const [date, setDate] = useState(formatDateForInput(stage.date));
  const [adBudget, setAdBudget] = useState(
    stage.ad_budget != null ? String(stage.ad_budget) : ""
  );

  // Participants list for adding new participants
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);

  // Fetch existing participants when dialog opens
  const { data: existingParticipants = [], isLoading: loadingParticipants } =
    useQuery<StageParticipantUI[]>({
      queryKey: ["stage-participants", stage.id],
      queryFn: () => getStageParticipants(stage.id),
      enabled: open,
    });

  const deleteParticipantMutation = useMutation({
    mutationFn: (participantId: number) =>
      deleteStageParticipant(stage.id, participantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stage-participants", stage.id] });
      qc.invalidateQueries({ queryKey: ["stages"] }); // recorded_contacts
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await updateStageInfo(stage.id, {
        name,
        date,
        ad_budget: toNumberOrNull(adBudget),
      });
      await updateStageStats(stage.id, {
        registrations: toNumberOrNull(registrations),
        participants: toNumberOrNull(participants),
      });

      // Add new participants (only create as lead if checkbox is checked)
      const validParticipants = participantsList.filter(
        (p) => p.name.trim().length > 0
      );

      for (const p of validParticipants) {
        await addStageParticipant(stage.id, {
          participant_name: p.name.trim(),
          participant_email: p.email.trim() || undefined,
          participant_phone: p.phone.trim() || undefined,
          attended: true,
          create_as_lead: p.createAsLead,
        });
      }
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["stages"] });
      const prev = qc.getQueryData<Stage[]>(["stages"]);

      if (prev) {
        qc.setQueryData<Stage[]>(
          ["stages"],
          (old) =>
            old?.map((s) =>
              s.id === stage.id
                ? {
                    ...s,
                    name,
                    date,
                    ad_budget: toNumberOrNull(adBudget),
                    registrations: toNumberOrNull(registrations),
                    participants: toNumberOrNull(participants),
                  }
                : s
            ) ?? []
        );
      }

      return { prev };
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(["stages"], ctx.prev);
    },
    onSuccess: () => {
      // ✅ Close the dialog immediately after a successful update
      setOpen(false);
      // Clear participants list after successful save
      setParticipantsList([]);
    },
    onSettled: () => {
      // ✅ Refresh data in background
      qc.invalidateQueries({ queryKey: ["stages"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["stage-participants", stage.id] });
    },
  });

  const canSubmit = !isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Bearbeiten">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bühne bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1">
            <Label htmlFor={`edit-name-${stage.id}`}>Name</Label>
            <Input
              id={`edit-name-${stage.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor={`edit-date-${stage.id}`}>Datum</Label>
            <Input
              id={`edit-date-${stage.id}`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor={`edit-budget-${stage.id}`}>Werbebudget (€)</Label>
            <Input
              id={`edit-budget-${stage.id}`}
              inputMode="decimal"
              value={adBudget}
              onChange={(e) => setAdBudget(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1">
              <Label htmlFor={`edit-registrations-${stage.id}`}>
                Anmeldungen
              </Label>
              <Input
                id={`edit-registrations-${stage.id}`}
                inputMode="numeric"
                value={registrations}
                onChange={(e) => setRegistrations(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor={`edit-participants-${stage.id}`}>
                Teilnehmer (Anzahl)
              </Label>
              <Input
                id={`edit-participants-${stage.id}`}
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>
          </div>

          {/* Existing contacts */}
          {loadingParticipants ? (
            <p className="text-sm text-muted-foreground">Lädt Kontakte...</p>
          ) : (
            existingParticipants.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">
                  Erfasste Kontakte ({existingParticipants.length})
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {existingParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.email || p.phone || "Keine Kontaktdaten"}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        title="Kontakt entfernen"
                        onClick={() => deleteParticipantMutation.mutate(p.id)}
                        disabled={deleteParticipantMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Add new contacts */}
          <div className="border-t pt-4">
            <ParticipantForm
              participants={participantsList}
              onChange={setParticipantsList}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button disabled={!canSubmit} onClick={() => mutate()}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Page ---------------------------- */

export default function Stages() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages,
    staleTime: 60_000,
  });

  // Average revenue per participant (used to estimate Umsatz)
  const { data: avgRev, isLoading: avgRevLoading } = useQuery({
    queryKey: ["avg_revenue_per_participant"],
    queryFn: () => getNumericSetting("avg_revenue_per_participant", 250),
    staleTime: 5 * 60_000,
  });

  // Treat non-positive average as "not ready"
  const effectiveAvgRev =
    typeof avgRev === "number" && avgRev > 0 ? avgRev : undefined;
  const isAvgReady = !!effectiveAvgRev && !avgRevLoading;

  const stages: Stage[] = data ?? [];

  const filteredStages = useMemo<Stage[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stages;
    return stages.filter((s) => (s.name || "").toLowerCase().includes(term));
  }, [stages, searchTerm]);

  const totals = useMemo(() => {
    const acc = stages.reduce(
      (agg, s) => {
        const budget = num(s.ad_budget);
        const regs = num(s.registrations);
        const parts = num(s.participants);
        agg.budget += budget;
        agg.registrations += regs;
        agg.participants += parts;
        if (isAvgReady) agg.revenue += parts * (effectiveAvgRev as number);
        return agg;
      },
      { budget: 0, registrations: 0, participants: 0, revenue: 0 }
    );

    const closingRate =
      acc.registrations > 0
        ? Math.round((acc.participants / acc.registrations) * 100)
        : null;

    // "ROI" as Umsatz/Budget × 100 (ROAS math)
    const roiPct =
      isAvgReady && acc.budget > 0
        ? Math.round((acc.revenue / acc.budget) * 100)
        : null;

    return { ...acc, closingRate, roiPct };
  }, [stages, isAvgReady, effectiveAvgRev]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bühnen & Events
          </h1>
          <p className="text-muted-foreground">
            Marketing-Events verwalten und Performance verfolgen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline">
            Neu laden
          </Button>
          <CreateStageDialog />
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Lädt Bühnen…
          </CardContent>
        </Card>
      )}
      {isError && (
        <Card>
          <CardContent className="p-4">
            <p className="text-destructive font-medium">
              Fehler beim Laden der Bühnen
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {(error as Error)?.message ?? "Unbekannter Fehler"}
            </p>
            <Button className="mt-3" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Compact Stats Row */}
      <div className="flex flex-wrap items-stretch gap-3">
        <MetricChip
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-primary/10 text-primary"
          value={`€${totals.budget.toLocaleString()}`}
          label="Budget gesamt"
        />

        <MetricChip
          icon={<Target className="w-4 h-4" />}
          iconBg="bg-success/10 text-success"
          value={fmtPct(totals.closingRate)}
          label="Closing-Rate"
          popover={
            // same calculation text you already build
            closingText(
              totals.participants,
              totals.registrations,
              totals.closingRate ?? undefined
            )
          }
        />

        <MetricChip
          icon={<TrendingUp className="w-4 h-4" />}
          iconBg="bg-accent/20 text-accent-foreground"
          value={fmtPct(totals.roiPct)}
          label="ROI gesamt"
          popover={roiText(
            isAvgReady ? totals.revenue : null,
            totals.budget,
            totals.roiPct ?? undefined
          )}
        />
      </div>

      {/* Stages Table */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <CardTitle>Event Management</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Bühnen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="h-9">
                <TableHead className="py-2">Bühne</TableHead>
                <TableHead className="py-2">Datum</TableHead>
                <TableHead className="py-2">Budget</TableHead>
                <TableHead className="py-2">Anm.</TableHead>
                <TableHead className="py-2">Teiln.</TableHead>
                <TableHead className="py-2">Performance</TableHead>
                <TableHead className="py-2">Status</TableHead>
                <TableHead className="py-2 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStages.map((stage) => {
                const status = deriveStatus(stage.date);
                const budget = num(stage.ad_budget);
                const regs = num(stage.registrations);
                const parts = num(stage.participants);

                const revenue = isAvgReady
                  ? parts * (effectiveAvgRev as number)
                  : null;

                // "ROI" per row = Umsatz/Budget × 100
                const roiPct =
                  isAvgReady && budget > 0 && revenue != null
                    ? Math.round((revenue / budget) * 100)
                    : null;

                const closingRate =
                  regs > 0 ? Math.round((parts / regs) * 100) : null;

                const roiClass =
                  roiPct == null
                    ? ""
                    : roiPct >= 100
                    ? "text-success"
                    : "text-destructive";

                return (
                  <TableRow key={stage.id} className="h-10">
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {stage.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-sm">
                      {formatDate(stage.date)}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm">
                      {fmtMoney(budget)}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm">
                      {regs > 0 ? regs : "–"}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm">
                      {parts > 0 ? parts : "–"}
                    </TableCell>

                    {/* Performance cell: Umsatz, ROI (as Umsatz/Budget), Closing with click popovers */}
                    <TableCell className="py-1.5 text-xs">
                      <div className="flex flex-wrap gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-accent/40">
                          Umsatz: {fmtMoney(revenue ?? null)}
                        </span>

                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={`px-1.5 py-0.5 rounded bg-accent/40 ${roiClass} cursor-pointer`}
                            >
                              ROI: {fmtPct(roiPct ?? undefined)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="whitespace-pre-line text-xs">
                            {roiText(revenue, budget, roiPct ?? undefined)}
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="px-1.5 py-0.5 rounded bg-accent/40 cursor-pointer"
                            >
                              CR: {fmtPct(closingRate ?? undefined)}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="whitespace-pre-line text-xs">
                            {closingText(parts, regs, closingRate ?? undefined)}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5">
                      <Badge className={statusColors[status]}>
                        {status === "completed" ? "Abgeschlossen" : "Geplant"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        <StageParticipantsDialog stage={stage} />
                        <StagePerformanceDialog
                          stage={stage}
                          estimatedRevenue={revenue}
                          roiPct={roiPct}
                          closingRate={closingRate}
                        />

                        <EditStageDialog stage={stage} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredStages.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      Keine Bühnen gefunden.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Compact inline insights */}
          <p className="mt-3 text-xs text-muted-foreground">
            Ø Umsatz/Teilnehmer:{" "}
            {isAvgReady
              ? `€${(effectiveAvgRev as number).toLocaleString()}`
              : "–"}
            {" • "}
            Geschätzter Umsatz gesamt:{" "}
            {fmtMoney(isAvgReady ? totals.revenue : null)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
