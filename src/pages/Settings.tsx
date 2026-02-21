import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save } from "lucide-react";

type Setting = {
  key: string;
  value_numeric?: number | null;
  value_text?: string | null;
};

const fetchSetting = async (key: string): Promise<Setting> => {
  const { data } = await api.get(`/settings/${key}`);
  return data;
};

const updateSetting = async (key: string, value: number) => {
  await api.put(`/settings/${key}`, { value_numeric: value });
};

export default function Settings() {
  const qc = useQueryClient();

  const { data: monthsSetting, isLoading: lMonths } = useMockableQuery({
    queryKey: ["settings", "potential_months"],
    queryFn: () => fetchSetting("potential_months"),
    mockData: { key: "potential_months", value_numeric: 6, value_text: null } as Setting,
  });

  const { data: flatSetting, isLoading: lFlat } = useMockableQuery({
    queryKey: ["settings", "potential_flat_eur"],
    queryFn: () => fetchSetting("potential_flat_eur"),
    mockData: { key: "potential_flat_eur", value_numeric: 900, value_text: null } as Setting,
  });

  const [months, setMonths] = useState("");
  const [flatEur, setFlatEur] = useState("");

  useEffect(() => {
    if (monthsSetting?.value_numeric != null) setMonths(String(monthsSetting.value_numeric));
  }, [monthsSetting]);

  useEffect(() => {
    if (flatSetting?.value_numeric != null) setFlatEur(String(flatSetting.value_numeric));
  }, [flatSetting]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<void>[] = [];
      const mVal = Number(months);
      const fVal = Number(flatEur);
      if (!Number.isFinite(mVal) || mVal <= 0) throw new Error("Monate muss eine positive Zahl sein");
      if (!Number.isFinite(fVal) || fVal < 0) throw new Error("EUR-Betrag muss ≥ 0 sein");
      promises.push(updateSetting("potential_months", mVal));
      promises.push(updateSetting("potential_flat_eur", fVal));
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["cashflow"] });
      toast({ title: "Einstellungen gespeichert" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const loading = lMonths || lFlat;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cashflow-Prognose</CardTitle>
          <CardDescription>
            Parameter für die Berechnung der Cashflow-Prognose
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="potential_months">Prognosezeitraum (Monate)</Label>
            <Input
              id="potential_months"
              type="number"
              min={1}
              placeholder={loading ? "Laden…" : "z.B. 6"}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Anzahl der Monate, die in die Cashflow-Prognose einfließen.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="potential_flat_eur">Pauschal-Betrag (EUR)</Label>
            <Input
              id="potential_flat_eur"
              type="number"
              min={0}
              placeholder={loading ? "Laden…" : "z.B. 900"}
              value={flatEur}
              onChange={(e) => setFlatEur(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Pauschaler EUR-Betrag pro Monat für potenzielle Einnahmen.
            </p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={loading || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Speichern…" : "Speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
