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

function toTwoDecimalInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function toBruttoForEdit(
  value: number | string | null | undefined,
  monetaryMode?: string | null,
): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  // API often returns netto values; for editing we expect brutto input.
  const brutto = monetaryMode === "netto" ? n * MWST_FACTOR : n;
  return brutto.toFixed(2);
}

function toBruttoNumber(
  value: number | string | null | undefined,
  monetaryMode?: string | null,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return monetaryMode === "netto" ? n * MWST_FACTOR : n;
}

export function ContractEditModal({ contract, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(toDateOnly(contract?.start_date));
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [revenue, setRevenue] = useState("");
  const [revenueDirty, setRevenueDirty] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  // Reset local fields whenever a new contract is opened
  useEffect(() => {
    if (!contract) return;

    setStartDate(toDateOnly(contract.start_date));
    setDuration(contract.duration_months ?? "");
    setFrequency(contract.payment_frequency ?? "monthly");
    setRevenue(toBruttoForEdit(contract.revenue_total, contract.monetary_mode));
    setRevenueDirty(false);
    setRevenueError(null);
  }, [contract]);

  const durationNum = Number(duration) || 0;
  const revenueModeLabel = "Brutto";

  const handleSubmit = async () => {
    if (!contract) return;

    const parsedRevenue = Number(revenue);
    const editedRevenue =
      revenueDirty && Number.isFinite(parsedRevenue) ? parsedRevenue : null;
    const fallbackBrutto = toBruttoNumber(
      contract.revenue_total,
      contract.monetary_mode,
    );
    const revenueForSave = editedRevenue ?? fallbackBrutto;

    if (revenueForSave === null) {
      setRevenueError(
        "Umsatz ist ungültig. Bitte geben Sie einen gültigen Bruttobetrag ein.",
      );
      return;
    }

    setRevenueError(null);

    await updateContract(contract.id, {
      start_date: startDate,
      duration_months: Number(duration),
      payment_frequency: frequency,
      revenue_total: revenueForSave,
    });

    onSaved();
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
              onChange={(e) => setDuration(e.target.value)}
            />
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
              value={revenue}
              onChange={(e) => {
                setRevenue(e.target.value);
                setRevenueDirty(true);
                setRevenueError(null);
              }}
              onBlur={(e) => setRevenue(toTwoDecimalInput(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Brutto eingeben. Die API liefert den Wert anschließend als Netto
              zurück. 0,00 ist erlaubt (z. B. pausiert/beendet).
            </p>
            {revenueError && (
              <p className="text-xs text-destructive">{revenueError}</p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
