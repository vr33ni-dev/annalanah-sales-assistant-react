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

export function ContractEditModal({ contract, onClose, onSaved }) {
  const [startDate, setStartDate] = useState(toDateOnly(contract?.start_date));
  const [duration, setDuration] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [revenue, setRevenue] = useState("");

  // Reset local fields whenever a new contract is opened
  useEffect(() => {
    if (!contract) return;

    setStartDate(toDateOnly(contract.start_date));
    setDuration(contract.duration_months ?? "");
    setFrequency(contract.payment_frequency ?? "monthly");
    setRevenue(contract.revenue_total ?? "");
  }, [contract]);

  const durationNum = Number(duration) || 0;

  const handleSubmit = async () => {
    if (!contract) return;

    await updateContract(contract.id, {
      start_date: startDate,
      duration_months: Number(duration),
      payment_frequency: frequency,
      revenue_total: Number(revenue),
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
            <Label>Umsatz</Label>
            <Input
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
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
