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
import { createOrUpdateUpsell } from "@/lib/api";
import { useEffect, useState } from "react";
import { toDateOnly } from "@/helpers/date";

export function UpsellModal({ contract, upsell, onClose, onSaved }) {
  const [date, setDate] = useState(toDateOnly(upsell?.upsell_date));
  const isFinalTalk = !!upsell?.upsell_result; // only for date + result lock
  const [result, setResult] = useState(upsell?.upsell_result ?? "");
  const [revenue, setRevenue] = useState(upsell?.upsell_revenue ?? "");
  const isEditing = !!upsell;
  const isExtension = result === "verlaengerung";
  const [contractStart, setContractStart] = useState(
    toDateOnly(upsell?.contract_start_date),
  );

  const [contractDuration, setContractDuration] = useState(
    upsell?.contract_duration_months ?? "",
  );
  const [contractFrequency, setContractFrequency] = useState(
    upsell?.contract_frequency ?? "monthly",
  );

  const contractDurationNum = Number(contractDuration) || 0;

  useEffect(() => {
    setDate(toDateOnly(upsell?.upsell_date));
    setResult(upsell?.upsell_result ?? "");
    setRevenue(upsell?.upsell_revenue ?? "");
    setContractStart(toDateOnly(upsell?.contract_start_date));
    setContractDuration(upsell?.contract_duration_months ?? "");
    setContractFrequency(upsell?.contract_frequency ?? "monthly");
  }, [upsell]);

  const handleSubmit = async () => {
    if (!contract) return;

    await createOrUpdateUpsell(contract.sales_process_id, {
      upsell_date: date,
      upsell_result: result || null,
      upsell_revenue: revenue ? Number(revenue) : null,
      contract_start_date: isExtension ? contractStart : null,
      contract_duration_months: isExtension ? Number(contractDuration) : null,
      contract_frequency: isExtension ? contractFrequency : null,
    });

    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Upsell bearbeiten" : "Upsell planen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-1">
            <Label>Datum des Gesprächs</Label>
            <Input
              type="date"
              value={date}
              disabled={isFinalTalk} // lock if talk has taken place (result exists)
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Result */}
          <div className="space-y-1">
            <Label>Ergebnis</Label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={result}
              disabled={isFinalTalk} // lock if result exists
              onChange={(e) => setResult(e.target.value)}
            >
              <option value="">offen</option>
              <option value="verlaengerung">Verlängerung</option>
              <option value="keine_verlaengerung">Keine Verlängerung</option>
            </select>
          </div>

          {/* Revenue when result = verlängerung */}
          {result === "verlaengerung" && (
            <div className="space-y-1">
              <Label>Geschätzter Umsatz</Label>
              <Input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
          )}

          {/* CONTRACT FIELDS — shown only if verlängerung */}
          {isExtension && (
            <>
              <div className="space-y-1">
                <Label>Neues Startdatum</Label>
                <Input
                  type="date"
                  value={contractStart || ""}
                  onChange={(e) => setContractStart(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Laufzeit (Monate)</Label>
                <Input
                  type="number"
                  value={contractDuration || ""}
                  onChange={(e) => setContractDuration(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Zahlungsfrequenz</Label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={contractFrequency}
                  onChange={(e) => setContractFrequency(e.target.value)}
                >
                  <option value="monthly">Monatlich</option>
                  <option value="bi-monthly">Zweimonatlich</option>
                  <option value="quarterly">Quartal</option>
                  {(contractDurationNum >= 12 ||
                    contractFrequency === "bi-yearly") && (
                    <option value="bi-yearly">Halbjährlich</option>
                  )}
                  <option value="one-time">Einmalig</option>
                </select>
              </div>
            </>
          )}
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
