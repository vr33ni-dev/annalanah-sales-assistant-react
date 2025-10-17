// src/pages/Stages.tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Calendar,
  DollarSign,
  Users,
  Target,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { getStages, createStage, Stage } from "@/lib/api";

/* ------------------------- Types & Helpers ------------------------- */

type StatusKey = "completed" | "upcoming";

const statusColors: Record<StatusKey, string> = {
  completed: "bg-success text-success-foreground",
  upcoming: "bg-warning text-warning-foreground",
};

const num = (v: number | null | undefined): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

const formatDate = (iso?: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
};

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

type CreateStagePayload = {
  name: string;
  date?: string | null;
  ad_budget?: number | null;
  registrations?: number | null;
  participants?: number | null;
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

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const payload: CreateStagePayload = {
        name: name.trim(),
        date: date.trim() === "" ? null : date.trim(),
        ad_budget: toNumberOrNull(adBudget),
        registrations: toNumberOrNull(registrations),
        participants: toNumberOrNull(participants),
      };
      await createStage(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["stages"] });
      setOpen(false);
      setName("");
      setDate("");
      setAdBudget("");
      setRegistrations("");
      setParticipants("");
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
      <DialogContent>
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
            <Label htmlFor="stage-participants">Teilnehmer</Label>
            <Input
              id="stage-participants"
              inputMode="numeric"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="z. B. 50"
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

/* ---------------------------- Page ---------------------------- */

export default function Stages() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery<Stage[]>({
    queryKey: ["stages"],
    queryFn: getStages, // GET /api/stages → Stage[]
    staleTime: 60_000,
  });

  const stages: Stage[] = data ?? [];

  const filteredStages = useMemo<Stage[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stages;
    return stages.filter((s) => (s.name || "").toLowerCase().includes(term));
  }, [stages, searchTerm]);

  const totals = useMemo(() => {
    const acc = stages.reduce(
      (agg, s) => {
        agg.budget += num(s.ad_budget);
        agg.registrations += num(s.registrations);
        agg.participants += num(s.participants);
        return agg;
      },
      { budget: 0, registrations: 0, participants: 0 }
    );
    const showUpRate =
      acc.registrations > 0
        ? Math.round((acc.participants / acc.registrations) * 100)
        : 0;
    return { ...acc, showUpRate, roi: 0 };
  }, [stages]);

  return (
    <div className="space-y-6">
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
          <CardContent className="p-6 text-sm text-muted-foreground">
            Lädt Bühnen…
          </CardContent>
        </Card>
      )}
      {isError && (
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive font-medium">
              Fehler beim Laden der Bühnen
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              {(error as Error)?.message ?? "Unbekannter Fehler"}
            </p>
            <Button className="mt-4" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  €{totals.budget.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gesamt Werbebudget
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.registrations}</p>
                <p className="text-xs text-muted-foreground">
                  Gesamt Anmeldungen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.showUpRate}%</p>
                <p className="text-xs text-muted-foreground">
                  Erscheinungsquote
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">0%</p>
                <p className="text-xs text-muted-foreground">ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stages Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event Management</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Bühnen suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bühnenname</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Anmeldungen</TableHead>
                <TableHead>Teilnehmer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStages.map((stage) => {
                const status = deriveStatus(stage.date);
                const budget = num(stage.ad_budget);
                const regs = num(stage.registrations);
                const parts = num(stage.participants);

                return (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {stage.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(stage.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {budget > 0 ? `€${budget.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>{regs > 0 ? regs : "-"}</TableCell>
                    <TableCell>{parts > 0 ? parts : "-"}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[status]}>
                        {status === "completed" ? "Abgeschlossen" : "Geplant"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" title="Teilnehmer">
                          <Users className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Performance">
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isLoading && filteredStages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Keine Bühnen gefunden.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Kosten pro Teilnehmer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages
                .filter((s) => num(s.participants) > 0 && num(s.ad_budget) > 0)
                .map((s) => {
                  const cpp = Math.round(
                    num(s.ad_budget) / Math.max(1, num(s.participants))
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {num(s.participants)} Teilnehmer
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">€{cpp.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          pro Teilnehmer
                        </p>
                      </div>
                    </div>
                  );
                })}
              {stages.filter(
                (s) => num(s.participants) > 0 && num(s.ad_budget) > 0
              ).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Noch keine Daten vorhanden.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Generierter Umsatz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Umsatz- und Lead-Metriken werden angezeigt, sobald diese Felder
              vom Backend bereitgestellt werden.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
