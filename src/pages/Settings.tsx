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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Save, Plus, X } from "lucide-react";
import { queryKeys } from "@/lib/queryKeys";

type Setting = {
  key: string;
  value_numeric?: number | null;
  value_text?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmails = (emails: string[]) =>
  Array.from(new Set(emails.map((email) => email.trim()).filter(Boolean)));

const parseEmailRecipients = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeEmails(
        parsed.filter((email): email is string => typeof email === "string"),
      );
    }
  } catch {
    // Backward compatible: support legacy comma/newline separated text.
  }

  return normalizeEmails(raw.split(/[\n,;]+/));
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
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [notifyEmailInput, setNotifyEmailInput] = useState("");

  useEffect(() => {
    if (monthsSetting?.value_numeric != null)
      setMonths(String(monthsSetting.value_numeric));
  }, [monthsSetting]);

  useEffect(() => {
    if (flatSetting?.value_numeric != null)
      setFlatEur(String(flatSetting.value_numeric));
  }, [flatSetting]);

  useEffect(() => {
    setNotifyEmails(parseEmailRecipients(notifyEmailSetting?.value_text));
    setNotifyEmailInput("");
  }, [notifyEmailSetting]);

  const addNotifyEmail = () => {
    const nextEmail = notifyEmailInput.trim();
    if (!nextEmail) return;
    if (!EMAIL_REGEX.test(nextEmail)) {
      toast({
        title: "Ungültige E-Mail-Adresse",
        description: "Bitte eine gültige E-Mail-Adresse eingeben.",
        variant: "destructive",
      });
      return;
    }

    if (notifyEmails.includes(nextEmail)) {
      toast({
        title: "E-Mail bereits vorhanden",
        description: "Diese Adresse ist bereits in der Empfängerliste.",
        variant: "destructive",
      });
      return;
    }

    setNotifyEmails((current) => [...current, nextEmail]);
    setNotifyEmailInput("");
  };

  const removeNotifyEmail = (emailToRemove: string) => {
    setNotifyEmails((current) =>
      current.filter((email) => email !== emailToRemove),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises: Promise<void>[] = [];
      const mVal = Number(months);
      const fVal = Number(flatEur);
      const recipients = normalizeEmails(notifyEmails);
      if (!Number.isFinite(mVal) || mVal <= 0)
        throw new Error("Monate muss eine positive Zahl sein");
      if (!Number.isFinite(fVal) || fVal < 0)
        throw new Error("EUR-Betrag muss ≥ 0 sein");
      if (notifyEmailInput.trim()) {
        throw new Error(
          "Bitte füge die eingegebene E-Mail zuerst mit + hinzu oder entferne sie.",
        );
      }
      if (recipients.some((email) => !EMAIL_REGEX.test(email))) {
        throw new Error("Bitte nur gültige E-Mail-Adressen speichern");
      }
      promises.push(updateNumericSetting("potential_months", mVal));
      promises.push(updateNumericSetting("avg_revenue_per_contract", fVal));
      promises.push(
        updateTextSetting(
          "new_contract_notify_email",
          JSON.stringify(recipients),
        ),
      );
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
              placeholder="z.B. 300"
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
              Benachrichtigungs-E-Mails (neuer Vertrag)
            </Label>
            <div className="flex gap-2">
              <Input
                id="new_contract_notify_email"
                type="email"
                placeholder="name@example.com"
                value={notifyEmailInput}
                onChange={(e) => setNotifyEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNotifyEmail();
                  }
                }}
                disabled={saving}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addNotifyEmail}
                disabled={saving || !notifyEmailInput.trim()}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Hinzufügen
              </Button>
            </div>
            {notifyEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {notifyEmails.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeNotifyEmail(email)}
                      disabled={saving}
                      className="rounded-sm p-0.5 hover:bg-muted"
                      aria-label={`${email} entfernen`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Mehrere Empfänger für E-Mail-Benachrichtigungen bei neuen
              Verträgen. Leer lassen, um den Wert aus der Server-Umgebung zu
              verwenden.
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
