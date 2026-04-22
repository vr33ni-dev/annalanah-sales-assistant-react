import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LeadSearch } from "@/components/LeadSearch";
import type { SalesProcessWorkflowFormProps } from "./types";

import { useState } from "react";

export function SalesProcessWorkflowForm({
  showForm,
  title,
  formStep,
  setFormStep,
  gespraechType,
  setGespraechType,
  formData,
  setFormData,
  stages,
  isStartPending,
  isPatchPending,
  canSubmit,
  isFollowUpFuture,
  onClose,
  onErstgespraechSave,
  onZweitgespraechStart,
  onSubmit,
  onSelectLead,
}: SalesProcessWorkflowFormProps) {
  if (!showForm) return null;

  // Double submit prevention and field errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  const MIN_REVENUE = 0;
  const MAX_REVENUE = 1_000_000;
  const MIN_DURATION = 1;
  const MAX_DURATION = 120;

  // Validate and submit for contract/Abschluss step
  // Erstgespräch submit
  const handleErstgespraechSaveWrapped = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onErstgespraechSave();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Zweitgespräch submit (old flow, step 5)
  const handleZweitgespraechStartWrapped = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onZweitgespraechStart();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbschlussSubmit = async () => {
    if (isSubmitting) return;
    setRevenueError(null);
    setDurationError(null);

    // Only validate if contract fields are visible
    if (formData.abschluss) {
      const revenue = Number(formData.revenue);
      const duration = Number(formData.contractDuration);
      if (isNaN(revenue) || formData.revenue === "") {
        setRevenueError("Umsatz ist erforderlich.");
        return;
      }
      if (revenue < MIN_REVENUE) {
        setRevenueError("Umsatz darf nicht negativ sein.");
        return;
      }
      if (revenue > MAX_REVENUE) {
        setRevenueError(
          `Umsatz darf maximal ${MAX_REVENUE.toLocaleString()} betragen.`,
        );
        return;
      }
      if (isNaN(duration) || formData.contractDuration === "") {
        setDurationError("Vertragsdauer ist erforderlich.");
        return;
      }
      if (duration < MIN_DURATION) {
        setDurationError(
          `Vertragsdauer muss mindestens ${MIN_DURATION} Monat betragen.`,
        );
        return;
      }
      if (duration > MAX_DURATION) {
        setDurationError(
          `Vertragsdauer darf maximal ${MAX_DURATION} Monate betragen.`,
        );
        return;
      }
    }
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Patch all other submit handlers to use isSubmitting if needed (not shown here for brevity)

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formStep === 0 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Welche Art von Gespräch möchten Sie planen?
              </Label>
              <RadioGroup
                value={gespraechType}
                onValueChange={(v) =>
                  setGespraechType(v as typeof gespraechType)
                }
                className="flex flex-col gap-3"
              >
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem
                    value="erstgespraech"
                    id="type-erst"
                    className="mt-0.5"
                  />
                  <label htmlFor="type-erst" className="cursor-pointer flex-1">
                    <div className="font-medium">Erstgespräch</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Erster Kontakt mit einem neuen Interessenten. Ein Lead
                      wird automatisch angelegt.
                    </div>
                  </label>
                </div>
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-background cursor-pointer hover:bg-accent/50 transition-colors">
                  <RadioGroupItem
                    value="zweitgespraech"
                    id="type-zweit"
                    className="mt-0.5"
                  />
                  <label htmlFor="type-zweit" className="cursor-pointer flex-1">
                    <div className="font-medium">Zweitgespräch</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Folgegespräch mit einem bestehenden Lead. Sie können einen
                      vorhandenen Lead auswählen.
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() =>
                  setFormStep(gespraechType === "erstgespraech" ? 1 : 5)
                }
              >
                Weiter
              </Button>
              <Button variant="outline" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {formStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (Vor- und Nachname) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Max Mustermann"
                className="bg-success/5 border-success/30 focus:border-success"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="max@example.com"
                className="bg-success/5 border-success/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+49 123 456789"
                className="bg-success/5 border-success/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Datum des Erstgesprächs *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                      !formData.erstgespraechDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.erstgespraechDate
                      ? format(formData.erstgespraechDate, "PPP", {
                          locale: de,
                        })
                      : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.erstgespraechDate ?? undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        erstgespraechDate: date ?? null,
                      })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Quelle *</Label>
              <Select
                value={formData.source ?? ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    source: value as "organic" | "paid",
                    stageId: value !== "paid" ? null : formData.stageId,
                  })
                }
              >
                <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                  <SelectValue placeholder="Quelle auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organisch</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.source === "paid" && (
              <div className="space-y-2">
                <Label>Bühne auswählen</Label>
                <Select
                  value={String(formData.stageId ?? "")}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stageId: Number(value) })
                  }
                >
                  <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                    <SelectValue placeholder="Bühne auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-full flex gap-3">
              <Button variant="outline" onClick={() => setFormStep(0)}>
                Zurück
              </Button>
              <Button
                onClick={handleErstgespraechSaveWrapped}
                disabled={
                  !formData.name ||
                  !formData.source ||
                  !formData.email.trim() ||
                  !formData.erstgespraechDate ||
                  isStartPending ||
                  isSubmitting
                }
              >
                {isStartPending || isSubmitting
                  ? "Speichern…"
                  : "Speichern & Schließen"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {formStep === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Zweitgespräch planen für{" "}
                <span className="font-medium text-foreground">
                  {formData.name}
                </span>
              </p>
            </div>

            <div className="space-y-2 col-span-full md:col-span-1">
              <Label>Datum des Zweitgesprächs *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                      !formData.zweitgespraechDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.zweitgespraechDate
                      ? format(formData.zweitgespraechDate, "PPP", {
                          locale: de,
                        })
                      : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.zweitgespraechDate ?? undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        zweitgespraechDate: date ?? null,
                      })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-full flex gap-3">
              <Button
                onClick={onSubmit}
                disabled={
                  !formData.zweitgespraechDate || isPatchPending || isSubmitting
                }
              >
                {isPatchPending || isSubmitting ? "Speichern…" : "Speichern"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {formStep === 3 && (
          <div className="space-y-6">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
              <p className="text-sm text-muted-foreground">
                Zweitgespräch am:{" "}
                {formData.zweitgespraechDate
                  ? format(formData.zweitgespraechDate, "PPP", {
                      locale: de,
                    })
                  : "—"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ergebnis des Zweitgesprächs</Label>
              <Select
                value={
                  formData.zweitgespraechResult === true
                    ? "erschienen"
                    : formData.zweitgespraechResult === false
                      ? "nicht_erschienen"
                      : "ausstehend"
                }
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    zweitgespraechResult:
                      value === "erschienen"
                        ? true
                        : value === "nicht_erschienen"
                          ? false
                          : null,
                  });
                }}
              >
                <SelectTrigger className="bg-muted/5 border-muted/30 focus:border-success">
                  <SelectValue placeholder="Ergebnis auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ausstehend">Ausstehend</SelectItem>
                  <SelectItem value="erschienen">Erschienen</SelectItem>
                  <SelectItem value="nicht_erschienen">
                    Nicht erschienen
                  </SelectItem>
                </SelectContent>
              </Select>

              {isFollowUpFuture && (
                <p className="text-xs text-muted-foreground mt-1">
                  Das Zweitgespräch liegt in der Zukunft. Wurde bereits
                  vorzeitig ein Abschluss erzielt?
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={onSubmit}>Speichern</Button>
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {formStep === 4 && (
          <div className="space-y-6">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-medium mb-2">Kunde: {formData.name}</h3>
              <p className="text-sm text-muted-foreground">
                Erschienen:{" "}
                {formData.zweitgespraechResult === true
                  ? "Ja"
                  : formData.zweitgespraechResult === false
                    ? "Nein"
                    : "—"}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Abschluss</Label>
              <RadioGroup
                value={
                  formData.abschluss === true
                    ? "erfolgreich"
                    : formData.abschluss === false
                      ? "nicht_erfolgreich"
                      : "unset"
                }
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    abschluss:
                      value === "erfolgreich"
                        ? true
                        : value === "nicht_erfolgreich"
                          ? false
                          : null,
                  });
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unset" id="abschluss-unset" />
                  <Label htmlFor="abschluss-unset">Noch offen</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="erfolgreich"
                    id="abschluss-erfolgreich"
                  />
                  <Label htmlFor="abschluss-erfolgreich">
                    Erfolgreich (Vertrag abgeschlossen)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="nicht_erfolgreich"
                    id="abschluss-nicht-erfolgreich"
                  />
                  <Label htmlFor="abschluss-nicht-erfolgreich">
                    Nicht erfolgreich (kein Abschluss)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.abschluss && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-success/10 rounded-lg">
                <div className="space-y-2">
                  <Label>Umsatz (€) *</Label>
                  <Input
                    type="number"
                    value={formData.revenue}
                    min={MIN_REVENUE}
                    max={MAX_REVENUE}
                    onChange={(e) => {
                      setFormData({ ...formData, revenue: e.target.value });
                      setRevenueError(null);
                    }}
                    placeholder="4800"
                    className="bg-success/5 border-success/30"
                  />
                  {revenueError && (
                    <p className="text-xs text-destructive mt-1">
                      {revenueError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Vertragsdauer (Monate) *</Label>
                  <Select
                    value={formData.contractDuration ?? ""}
                    onValueChange={(value) => {
                      setFormData({ ...formData, contractDuration: value });
                      setDurationError(null);
                    }}
                  >
                    <SelectTrigger className="bg-success/5 border-success/30">
                      <SelectValue placeholder="Dauer auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                    </SelectContent>
                  </Select>
                  {durationError && (
                    <p className="text-xs text-destructive mt-1">
                      {durationError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Startdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30",
                          !formData.contractStart && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.contractStart
                          ? format(formData.contractStart, "PPP", {
                              locale: de,
                            })
                          : "Startdatum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.contractStart ?? undefined}
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            contractStart: date ?? null,
                          })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Zahlungsfrequenz *</Label>
                  <Select
                    value={formData.contractFrequency ?? ""}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        contractFrequency: value as
                          | "monthly"
                          | "bi-monthly"
                          | "quarterly"
                          | "one-time"
                          | "bi-yearly",
                      })
                    }
                  >
                    <SelectTrigger className="bg-success/5 border-success/30">
                      <SelectValue placeholder="Frequenz auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monatlich</SelectItem>
                      <SelectItem value="bi-monthly">Zweimonatlich</SelectItem>
                      <SelectItem value="quarterly">Quartalsweise</SelectItem>
                      {(Number(formData.contractDuration) || 0) >= 12 ||
                      formData.contractFrequency === "bi-yearly" ? (
                        <SelectItem value="bi-yearly">Halbjährlich</SelectItem>
                      ) : null}
                      <SelectItem value="one-time">Einmalig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Abschlussdatum *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-success/5 border-success/30",
                          !formData.completedAt && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.completedAt
                          ? format(formData.completedAt, "PPP", {
                              locale: de,
                            })
                          : "Datum auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          formData.completedAt
                            ? new Date(formData.completedAt)
                            : undefined
                        }
                        onSelect={(date) =>
                          setFormData({
                            ...formData,
                            completedAt: date ? date.toISOString() : null,
                          })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleAbschlussSubmit}
                disabled={!canSubmit || isPatchPending || isSubmitting}
                className="mt-4"
              >
                {isPatchPending || isSubmitting
                  ? "Speichern…"
                  : "Speichern & Abschließen"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="mt-4">
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {formStep === 5 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full space-y-2">
              <Label>Bestehenden Lead auswählen (optional)</Label>
              <LeadSearch
                selectedLeadId={formData.leadId ?? null}
                onSelectLead={onSelectLead}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name-zweit">Name (Vor- und Nachname) *</Label>
              <Input
                id="name-zweit"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Max Mustermann"
                className="bg-success/5 border-success/30 focus:border-success"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-zweit">Email *</Label>
              <Input
                id="email-zweit"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="max@example.com"
                className="bg-success/5 border-success/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-zweit">Telefon</Label>
              <Input
                id="phone-zweit"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+49 123 456789"
                className="bg-success/5 border-success/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Datum des Zweitgesprächs *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-success/5 border-success/30 focus:border-success",
                      !formData.zweitgespraechDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.zweitgespraechDate
                      ? format(formData.zweitgespraechDate, "PPP", {
                          locale: de,
                        })
                      : "Datum auswählen"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.zweitgespraechDate ?? undefined}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        zweitgespraechDate: date ?? null,
                      })
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Quelle *</Label>
              <Select
                value={formData.source ?? ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    source: value as "organic" | "paid",
                    stageId: value !== "paid" ? null : formData.stageId,
                  })
                }
              >
                <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                  <SelectValue placeholder="Quelle auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organic">Organisch</SelectItem>
                  <SelectItem value="paid">Bezahlt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.source === "paid" && (
              <div className="space-y-2">
                <Label>Bühne auswählen</Label>
                <Select
                  value={String(formData.stageId ?? "")}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stageId: Number(value) })
                  }
                >
                  <SelectTrigger className="bg-success/5 border-success/30 focus:border-success">
                    <SelectValue placeholder="Bühne auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-full flex gap-3">
              <Button variant="outline" onClick={() => setFormStep(0)}>
                Zurück
              </Button>
              <Button
                onClick={handleZweitgespraechStartWrapped}
                disabled={
                  !formData.name ||
                  !formData.source ||
                  !formData.email.trim() ||
                  !formData.zweitgespraechDate ||
                  isStartPending ||
                  isSubmitting
                }
              >
                {isStartPending || isSubmitting ? "Speichern…" : "Speichern"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
