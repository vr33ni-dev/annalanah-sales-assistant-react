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
import { queryKeys } from "@/lib/queryKeys";

type Setting = {
  key: string;
  value_numeric?: number | null;
  value_text?: string | null;
};

// Mock data references (defined outside component to avoid re-render loops)
const MOCK_MONTHS: Setting = {
  key: "potential_months",
  value_numeric: 6,
  value_text: null,
};
const MOCK_FLAT: Setting = {
  key: "avg_revenue_per_contract",
  value_numeric: 600,
  value_text: null,
};
const MOCK_NOTIFY_EMAIL: Setting = {
  key: "new_contract_notify_email",
  value_numeric: null,
  value_text: "",
};

const fetchSetting = async (key: string): Promise<Setting> => {
  const { data } = await api.get(`/settings/${key}`);
  return data;
};

const updateNumericSetting = async (key: string, value: number) => {
  await api.put(`/settings/${key}`, { value_numeric: value });
};

const updateTextSetting = async (key: string, value: string) => {
  await api.put(`/settings/${key}`, { value_text: value });
};

export default function Settings() {
  const qc = useQueryClient();

  const { data: monthsSetting, isLoading: lMonths } = useMockableQuery({
    queryKey: queryKeys.setting("potential_months"),
    queryFn: () => fetchSetting("potential_months"),
    mockData: MOCK_MONTHS,
  });

  const { data: flatSetting, isLoading: lFlat } = useMockableQuery({
    queryKey: queryKeys.setting("avg_revenue_per_contract"),
    queryFn: () => fetchSetting("avg_revenue_per_contract"),
    mockData: MOCK_FLAT,
  });

  const { data: notifyEmailSetting } = useMockableQuery({
    queryKey: queryKeys.setting("new_contract_notify_email"),
    queryFn: () => fetchSetting("new_contract_notify_email"),
    mockData: MOCK_NOTIFY_EMAIL,
  });

  const [months, setMonths] = useState("");
  const [flatEur, setFlatEur] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    if (monthsSetting?.value_numeric != null)
      setMonths(String(monthsSetting.value_numeric));
  }, [monthsSetting]);

  useEffect(() => {
    if (flatSetting?.value_numeric != null)
      setFlatEur(String(flatSetting.value_numeric));
  }, [flatSetting]);

  useEffect(() => {
    setNotifyEmail(notifyEmailSetting?.value_text ?? "");
  }, [notifyEmailSetting]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<void>[] = [];
      const mVal = Number(months);
      const fVal = Number(flatEur);
      const nVal = notifyEmail.trim();
      if (!Number.isFinite(mVal) || mVal <= 0)
        throw new Error("Monate muss eine positive Zahl sein");
      if (!Number.isFinite(fVal) || fVal < 0)
        throw new Error("EUR-Betrag muss ≥ 0 sein");
      if (nVal !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nVal)) {
        throw new Error("Bitte eine gültige E-Mail-Adresse eingeben");
      }
      promises.push(updateNumericSetting("potential_months", mVal));
      promises.push(updateNumericSetting("avg_revenue_per_contract", fVal));
      promises.push(updateTextSetting("new_contract_notify_email", nVal));
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings });
      qc.invalidateQueries({ queryKey: queryKeys.cashflow });
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
            <Label htmlFor="avg_revenue_per_contract">
              Pauschal-Betrag (EUR)
            </Label>
            <Input
              id="avg_revenue_per_contract"
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
            <Label htmlFor="new_contract_notify_email">
              Benachrichtigungs-E-Mail (neuer Vertrag)
            </Label>
            <Input
              id="new_contract_notify_email"
              type="email"
              placeholder="name@example.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Empfänger für E-Mail-Benachrichtigungen bei neuen Verträgen. Leer
              lassen, um den Wert aus der Server-Umgebung zu verwenden.
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
