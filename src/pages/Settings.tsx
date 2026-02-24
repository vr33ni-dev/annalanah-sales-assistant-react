import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMockableQuery } from "@/hooks/useMockableQuery";
import api from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Stable mock data references (defined outside component to avoid re-render loops)
const MOCK_MONTHS: Setting = {
  key: "potential_months",
  value_numeric: 6,
  value_text: null,
};
const MOCK_FLAT: Setting = {
  key: "potential_flat_eur",
  value_numeric: 900,
  value_text: null,
};
const MOCK_AVG_REV: Setting = {
  key: "avg_revenue_per_participant",
  value_numeric: 250,
  value_text: null,
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
    mockData: MOCK_MONTHS,
  });

  const { data: flatSetting, isLoading: lFlat } = useMockableQuery({
    queryKey: ["settings", "potential_flat_eur"],
    queryFn: () => fetchSetting("potential_flat_eur"),
    mockData: MOCK_FLAT,
  });

  const { data: avgRevSetting, isLoading: lAvgRev } = useMockableQuery({
    queryKey: ["settings", "avg_revenue_per_participant"],
    queryFn: () => fetchSetting("avg_revenue_per_participant"),
    mockData: MOCK_AVG_REV,
  });

  const [months, setMonths] = useState("");
  const [flatEur, setFlatEur] = useState("");
  const [avgRev, setAvgRev] = useState("");

  useEffect(() => {
    if (monthsSetting?.value_numeric != null)
      setMonths(String(monthsSetting.value_numeric));
  }, [monthsSetting]);

  useEffect(() => {
    if (flatSetting?.value_numeric != null)
      setFlatEur(String(flatSetting.value_numeric));
  }, [flatSetting]);

  useEffect(() => {
    if (avgRevSetting?.value_numeric != null)
      setAvgRev(String(avgRevSetting.value_numeric));
  }, [avgRevSetting]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<void>[] = [];
      const mVal = Number(months);
      const fVal = Number(flatEur);
      const aVal = Number(avgRev);
      if (!Number.isFinite(mVal) || mVal <= 0)
        throw new Error("Monate muss eine positive Zahl sein");
      if (!Number.isFinite(fVal) || fVal < 0)
        throw new Error("EUR-Betrag muss ≥ 0 sein");
      if (!Number.isFinite(aVal) || aVal <= 0)
        throw new Error("Durchschn. Umsatz muss eine positive Zahl sein");
      promises.push(updateSetting("potential_months", mVal));
      promises.push(updateSetting("potential_flat_eur", fVal));
      promises.push(updateSetting("avg_revenue_per_participant", aVal));
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["cashflow"] });
      toast({ title: "Einstellungen gespeichert" });
    },
    onError: (e: Error) => {
      toast({
        title: "Fehler",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const saving = saveMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parameter</CardTitle>
          <CardDescription>
            Parameter für die Berechnung der Cashflow-Prognose, sowie der
            Bühnen-Performance. Änderungen wirken sich auf die Prognose und
            Performance-Berechnung aller Stufen aus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="potential_months">Prognosezeitraum (Monate)</Label>
            <Input
              id="potential_months"
              type="number"
              min={1}
              placeholder="z.B. 6"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              disabled={saving}
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
              placeholder="z.B. 900"
              value={flatEur}
              onChange={(e) => setFlatEur(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Pauschaler EUR-Umsatz pro Vertrag und Monat für potenzielle
              Einnahmen.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg_revenue_per_participant">Durchschn. Umsatz pro Teilnehmer (EUR)</Label>
            <Input
              id="avg_revenue_per_participant"
              type="number"
              min={1}
              placeholder="z.B. 250"
              value={avgRev}
              onChange={(e) => setAvgRev(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Durchschnittlicher Umsatz pro Teilnehmer für die Bühnen-Performance und ROI-Berechnung.
            </p>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
