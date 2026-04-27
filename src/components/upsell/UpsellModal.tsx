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
import { parseIsoToLocal, toDateOnly, toYmdLocal } from "@/helpers/date";
import { useToast } from "@/hooks/use-toast";
import { extractErrorMessage } from "@/helpers/error";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { upsertMockUpsell } from "@/lib/mockData";

export function UpsellModal({ contract, upsell, onClose, onSaved }) {
  const { toast } = useToast();
  const { useMockData } = useAuthEnabled();
  // Compute contract end date as fallback for verlaengerung records imported without a talk date
  const contractEndDateYmd = (() => {
    if (!contract) return "";
    if (contract.end_date) return toDateOnly(contract.end_date);
    const start = parseIsoToLocal(contract.start_date);
    if (!start || typeof contract.duration_months !== "number") return "";
    const end = new Date(
      start.getFullYear(),
      start.getMonth() + contract.duration_months,
      start.getDate(),
    );
    return toYmdLocal(end);
  })();

  const [date, setDate] = useState(
    toDateOnly(upsell?.upsell_date) ||
      (upsell?.upsell_result === "verlaengerung" ? contractEndDateYmd : ""),
  );
  const isEditing = !!upsell;
  const [result, setResult] = useState(upsell?.upsell_result ?? "");
  const [revenue, setRevenue] = useState(upsell?.upsell_revenue ?? "");
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contractDurationNum = Number(contractDuration) || 0;

  useEffect(() => {
    setDate(
      toDateOnly(upsell?.upsell_date) ||
        (upsell?.upsell_result === "verlaengerung" ? contractEndDateYmd : ""),
    );
    setResult(upsell?.upsell_result ?? "");
    setRevenue(upsell?.upsell_revenue ?? "");
    setContractStart(toDateOnly(upsell?.contract_start_date));
    setContractDuration(upsell?.contract_duration_months ?? "");
    setContractFrequency(upsell?.contract_frequency ?? "monthly");
  }, [upsell, contractEndDateYmd]);

  const handleSubmit = async () => {
    if (!contract || isSubmitting) return;
    setIsSubmitting(true);

    const targetSalesProcessId =
      upsell?.sales_process_id ?? contract.sales_process_id;

    try {
      const payload = {
        upsell_date: date || null,
        upsell_result: result || null,
        upsell_revenue: revenue ? Number(revenue) : null,
        contract_start_date: isExtension ? contractStart : null,
        contract_duration_months: isExtension ? Number(contractDuration) : null,
        contract_frequency: isExtension ? contractFrequency : null,
      };
      if (useMockData) {
        upsertMockUpsell(targetSalesProcessId, {
          ...payload,
          id: upsell?.id,
          client_id: contract.client_id ?? upsell?.client_id ?? 0,
          previous_contract_id: contract.id ?? upsell?.previous_contract_id ?? null,
        });
        toast({ title: "Upsell gespeichert" });
      } else {
        await createOrUpdateUpsell(targetSalesProcessId, payload);
      }
      onSaved();
    } catch (err) {
      const raw = extractErrorMessage(err);
      const message = raw.toLowerCase().includes("contract_start_date")
        ? "Das neue Startdatum darf nicht vor dem Ende des aktuellen Vertrags liegen."
        : raw;
      toast({
        title: "Fehler beim Speichern",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Result */}
          <div className="space-y-1">
            <Label>Ergebnis</Label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={result}
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
          <Button onClick={handleSubmit} disabled={!date || isSubmitting}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
