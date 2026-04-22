// src/components/contracts/ContractEditModal.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { updateContract } from "@/lib/api";
import { toDateOnly } from "@/helpers/date";

const MWST_FACTOR = 1.19;

type NormalizedMonetaryMode = "netto" | "brutto" | null;

function normalizeMonetaryMode(mode?: string | null): NormalizedMonetaryMode {
  if (!mode) return null;
  const m = String(mode).trim().toLowerCase();
  if (m === "netto" || m === "brutto") return m;
  return null;
}

function toTwoDecimalInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function toBruttoForEdit(
  value: number | string | null | undefined,
  monetaryMode: NormalizedMonetaryMode,
): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  // API often returns netto values; for editing we expect brutto input.
  // If mode is unknown, keep the raw value to avoid unsafe auto-conversion.
  if (monetaryMode === null) return n.toFixed(2);
  const brutto = monetaryMode === "netto" ? n * MWST_FACTOR : n;
  return brutto.toFixed(2);
}

function toBruttoNumber(
  value: number | string | null | undefined,
  monetaryMode: NormalizedMonetaryMode,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // Unknown mode cannot be safely converted.
  if (monetaryMode === null) return null;
  return monetaryMode === "netto" ? n * MWST_FACTOR : n;
}

export function ContractEditModal({ contract, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(toDateOnly(contract?.start_date));
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [revenue, setRevenue] = useState("");
  const [revenueDirty, setRevenueDirty] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mode = normalizeMonetaryMode(contract?.monetary_mode);

  // Reset local fields whenever a new contract is opened
  useEffect(() => {
    if (!contract) return;

    setStartDate(toDateOnly(contract.start_date));
    setDuration(contract.duration_months ?? "");
    setFrequency(contract.payment_frequency ?? "monthly");
    setRevenue(toBruttoForEdit(contract.revenue_total, mode));
    setRevenueDirty(false);
    setRevenueError(null);
    setDurationError(null);
    setFormError(null);
    setIsSubmitting(false);
  }, [contract, mode]);

  const durationNum = Number(duration) || 0;
  const revenueModeLabel = "Brutto";

  const MAX_DURATION = 120;
  const MIN_DURATION = 1;
  const MAX_REVENUE = 1_000_000;
  const MIN_REVENUE = 0;

  const handleSubmit = async () => {
    if (!contract || isSubmitting) return;
    setFormError(null);

    // Validate duration
    const parsedDuration = Number(duration);
    if (duration === "" || isNaN(parsedDuration)) {
      setDurationError("Laufzeit ist erforderlich.");
      return;
    }
    if (parsedDuration < MIN_DURATION) {
      setDurationError(
        `Laufzeit muss mindestens ${MIN_DURATION} Monat betragen.`,
      );
      return;
    }
    if (parsedDuration > MAX_DURATION) {
      setDurationError(
        `Laufzeit darf maximal ${MAX_DURATION} Monate betragen.`,
      );
      return;
    }
    setDurationError(null);

    // Validate revenue
    const parsedRevenue = Number(revenue);
    if (revenue === "" || isNaN(parsedRevenue)) {
      setRevenueError("Umsatz ist erforderlich.");
      return;
    }
    if (parsedRevenue < MIN_REVENUE) {
      setRevenueError("Umsatz darf nicht negativ sein.");
      return;
    }
    if (parsedRevenue > MAX_REVENUE) {
      setRevenueError(
        `Umsatz darf maximal ${MAX_REVENUE.toLocaleString()} betragen.`,
      );
      return;
    }
    setRevenueError(null);

    // Prepare payload: round revenue to 2 decimals
    const editedRevenue =
      revenueDirty && Number.isFinite(parsedRevenue)
        ? Math.round(parsedRevenue * 100) / 100
        : null;
    const fallbackBrutto = toBruttoNumber(contract.revenue_total, mode);
    const revenueForSave = editedRevenue ?? fallbackBrutto;

    if (revenueForSave === null) {
      setRevenueError(
        mode === null
          ? "Umsatzmodus ist unklar. Bitte Umsatz einmal manuell eingeben und speichern."
          : "Umsatz ist ungültig. Bitte geben Sie einen gültigen Bruttobetrag ein.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updateContract(contract.id, {
        start_date: startDate,
        duration_months: parsedDuration,
        payment_frequency: frequency,
        revenue_total: revenueForSave,
      });
      onSaved();
    } catch (err) {
      setFormError("Fehler beim Speichern. Bitte versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vertrag bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Start Date */}
          <div className="space-y-1">
            <Label>Startdatum</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <Label>Laufzeit (Monate)</Label>
            <Input
              type="number"
              value={duration}
              min={MIN_DURATION}
              max={MAX_DURATION}
              onChange={(e) => {
                setDuration(e.target.value);
                setDurationError(null);
              }}
            />
            {durationError && (
              <p className="text-xs text-destructive mt-1">{durationError}</p>
            )}
            {duration !== "" && Number(duration) === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Hinweis: Eine 0-monatige Laufzeit beendet den Vertrag. Umsatz
                wird <b>nicht automatisch</b> auf 0 gesetzt – bitte prüfen Sie
                den Umsatz manuell, falls gewünscht.
              </p>
            )}
          </div>

          {/* Frequency */}
          <div className="space-y-1">
            <Label>Zahlungsfrequenz</Label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="monthly">Monatlich</option>
              <option value="bi-monthly">Zweimonatlich</option>
              <option value="quarterly">Quartal</option>
              {(durationNum >= 12 || frequency === "bi-yearly") && (
                <option value="bi-yearly">Halbjährlich</option>
              )}
              <option value="one-time">Einmalig</option>
            </select>
          </div>

          {/* Revenue */}
          <div className="space-y-1">
            <Label>Umsatz ({revenueModeLabel})</Label>
            <Input
              type="number"
              step="0.01"
              min={MIN_REVENUE}
              max={MAX_REVENUE}
              value={revenue}
              onChange={(e) => {
                setRevenue(e.target.value);
                setRevenueDirty(true);
                setRevenueError(null);
              }}
              onBlur={(e) => setRevenue(toTwoDecimalInput(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Eingabe: Brutto · Anzeige: Netto. <br />
              0,00 ist erlaubt (z. B. pausiert/beendet).
            </p>
            {mode === null && (
              <p className="text-xs text-amber-600">
                Hinweis: monetary_mode fehlt/ist ungültig. Bitte Umsatz prüfen
                und einmal explizit speichern.
              </p>
            )}
            {revenueError && (
              <p className="text-xs text-destructive">{revenueError}</p>
            )}
          </div>
        </div>

        {formError && (
          <p className="text-xs text-destructive mt-2">{formError}</p>
        )}
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
