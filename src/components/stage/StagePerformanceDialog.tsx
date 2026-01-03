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
  estimatedRevenue: number | null;
  roiPct: number | null;
  closingRate: number | null;
}

const fmtMoney = (v: number | null) =>
  typeof v === "number" ? `€${v.toLocaleString()}` : "–";

const fmtPct = (v: number | null) => (typeof v === "number" ? `${v}%` : "–");

export function StagePerformanceDialog({
  stage,
  estimatedRevenue,
  roiPct,
  closingRate,
}: Props) {
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
            <p className="text-2xl font-semibold">
              {fmtMoney(estimatedRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              Ø Umsatz × Teilnehmer
            </p>
          </section>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">ROI</p>
              <p className="text-lg font-medium">{fmtPct(roiPct)}</p>
              <p className="text-xs text-muted-foreground">Umsatz / Budget</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Closing-Rate</p>
              <p className="text-lg font-medium">{fmtPct(closingRate)}</p>
              <p className="text-xs text-muted-foreground">
                Teilnehmer / Anmeldungen
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
            </div>
          </section>

          {/* Interpretation */}
          <section className="rounded-md bg-muted/40 p-3 text-xs">
            {closingRate != null && closingRate < 40 && (
              <p>⚠️ Niedrige Closing-Rate – Teilnahme-Reminder prüfen.</p>
            )}
            {roiPct != null && roiPct >= 100 && (
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
