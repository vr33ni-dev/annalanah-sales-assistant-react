import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { Stage } from "@/lib/api";

interface Props {
  stage: Stage;
}

const fmtMoney = (v: number | null) =>
  typeof v === "number" ? `€${v.toLocaleString()}` : "–";

const fmtPct = (v: number | null) => (typeof v === "number" ? `${v}%` : "–");

export function StagePerformanceDialog({ stage }: Props) {
  const actualRevenue =
    typeof stage.actual_revenue === "number" ? stage.actual_revenue : null;
  const roiVal = typeof stage.roi === "number" ? stage.roi : null;
  const attendanceRate =
    typeof stage.attendance_rate === "number" ? stage.attendance_rate : null;
  const closingRate =
    typeof stage.closing_rate === "number" ? stage.closing_rate : null;
  const closedContracts = stage.closed_contracts ?? 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Performance anzeigen"
          className="h-8 w-8 p-0"
        >
          <TrendingUp className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Performance – {stage.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Umsatz */}
          <section>
            <p className="text-muted-foreground">Umsatz</p>
            <p className="text-2xl font-semibold">{fmtMoney(actualRevenue)}</p>
            <p className="text-xs text-muted-foreground">
              Summe abgeschlossener Verträge dieser Bühne
            </p>
          </section>

          {/* KPI Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">ROI</p>
              <p className="text-lg font-medium">{roiVal}</p>
              <p className="text-xs text-muted-foreground">Umsatz / Budget</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Attendance Rate</p>
              <p className="text-lg font-medium">{fmtPct(attendanceRate)}</p>
              <p className="text-xs text-muted-foreground">
                Teilnehmer / Anmeldungen
              </p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Closing-Rate</p>
              <p className="text-lg font-medium">{fmtPct(closingRate)}</p>
              <p className="text-xs text-muted-foreground">
                Abschlüsse / Teilnehmer
              </p>
            </div>
          </div>

          {/* Funnel */}
          <section>
            <p className="font-medium mb-2">Funnel</p>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Anmeldungen</span>
                <span>{stage.registrations ?? "–"}</span>
              </div>
              <div className="flex justify-between">
                <span>Teilnehmer</span>
                <span>{stage.participants ?? "–"}</span>
              </div>
              <div className="flex justify-between">
                <span>Erfasste Kontakte</span>
                <span>{stage.recorded_contacts ?? "–"}</span>
              </div>
              <div className="flex justify-between">
                <span>Abschlüsse</span>
                <span>{closedContracts}</span>
              </div>
            </div>
          </section>

          {/* Interpretation */}
          <section className="rounded-md bg-muted/40 p-3 text-xs">
            {attendanceRate != null && attendanceRate < 40 && (
              <p>⚠️ Niedrige Attendance Rate – Teilnahme-Reminder prüfen.</p>
            )}
            {closingRate != null && closingRate < 40 && (
              <p>
                ⚠️ Niedrige Closing-Rate – Follow-up und Angebotsprozess prüfen.
              </p>
            )}
            {roiVal != null && roiVal >= 1 && (
              <p>✅ Positiver ROI – Event rechnet sich.</p>
            )}
            {stage.recorded_contacts === 0 && (
              <p>❗ Keine Kontakte erfasst – Follow-up-Potenzial ungenutzt.</p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
