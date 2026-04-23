import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Save } from "lucide-react";
import { SALES_STAGE } from "@/constants/stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CommentsSection } from "@/components/comments/CommentsSection";
import type { Stage } from "@/lib/api";
import type { SalesProcessSource, SalesProcessWithStageId } from "./types";

export interface DetailSavePayload {
  initial_contact_date: string | null;
  follow_up_date: string | null;
  follow_up_result?: boolean | null;
  completed_at: string | null;
  source: SalesProcessSource;
  source_stage_id: number | null;
  client_email: string;
  client_phone: string;
}

interface SalesProcessDetailSheetProps {
  entry: SalesProcessWithStageId | null;
  stages: Stage[];
  onClose: () => void;
  onSave: (id: number, payload: DetailSavePayload) => Promise<void>;
}

export function SalesProcessDetailSheet({
  entry,
  stages,
  onClose,
  onSave,
}: SalesProcessDetailSheetProps) {
  const navigate = useNavigate();
  const [initialContactDate, setInitialContactDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpResult, setFollowUpResult] = useState<boolean | null>(null);
  const [completedAt, setCompletedAt] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [source, setSource] = useState<SalesProcessSource>("");
  const [sourceStageId, setSourceStageId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setInitialContactDate(entry.initial_contact_date?.slice(0, 10) ?? "");
    setFollowUpDate(entry.follow_up_date?.slice(0, 10) ?? "");
    setFollowUpResult(entry.follow_up_result ?? null);
    setCompletedAt(entry.completed_at?.slice(0, 10) ?? "");
    setClientEmail(entry.client_email ?? "");
    setClientPhone(entry.client_phone ?? "");
    setSource((entry.client_source as SalesProcessSource) ?? "");
    const stageId =
      entry.stage_id !== undefined
        ? entry.stage_id
        : (stages.find((s) => s.name === entry.source_stage_name)?.id ?? null);
    setSourceStageId(entry.client_source === "paid" ? stageId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  const handleSourceChange = (value: SalesProcessSource) => {
    setSource(value);
    if (value !== "paid") setSourceStageId(null);
  };

  const canSave =
    !!source && (source !== "paid" || sourceStageId != null) && !saving;

  const handleSave = async () => {
    if (!entry || !canSave) return;
    setSaving(true);
    try {
      await onSave(entry.id, {
        initial_contact_date: initialContactDate || null,
        follow_up_date:
          entry.stage !== SALES_STAGE.INITIAL_CONTACT
            ? followUpDate || null
            : null,
        follow_up_result:
          entry.stage === SALES_STAGE.FOLLOW_UP ? followUpResult : undefined,
        completed_at:
          entry.stage === SALES_STAGE.CLOSED ? completedAt || null : null,
        source,
        source_stage_id: source === "paid" ? sourceStageId : null,
        client_email: clientEmail,
        client_phone: clientPhone,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={!!entry}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-[480px] sm:max-w-full overflow-y-auto">
        {entry && (
          <>
            <SheetHeader>
              <SheetTitle>{entry.client_name}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Kontaktdaten */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Kontaktdaten
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <Label className="text-sm text-muted-foreground shrink-0">
                      E-Mail
                    </Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="—"
                      className="h-7 text-sm"
                    />
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <Label className="text-sm text-muted-foreground shrink-0">
                      Telefon
                    </Label>
                    <Input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="—"
                      className="h-7 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Verlauf */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Verlauf
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center gap-4">
                    <Label className="text-sm text-muted-foreground shrink-0">
                      Erstgespräch
                    </Label>
                    <Input
                      type="date"
                      value={initialContactDate}
                      onChange={(e) => setInitialContactDate(e.target.value)}
                      className="w-[155px] h-7 text-sm"
                    />
                  </div>

                  {entry.stage !== SALES_STAGE.INITIAL_CONTACT && (
                    <div className="flex justify-between items-center gap-4">
                      <Label className="text-sm text-muted-foreground shrink-0">
                        Zweitgespräch
                      </Label>
                      <Input
                        type="date"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-[155px] h-7 text-sm"
                      />
                    </div>
                  )}

                  {entry.stage === SALES_STAGE.FOLLOW_UP && (
                    <div className="flex justify-between items-center gap-4">
                      <Label className="text-sm text-muted-foreground shrink-0">
                        Ergebnis
                      </Label>
                      <Select
                        value={
                          followUpResult === null
                            ? "pending"
                            : String(followUpResult)
                        }
                        onValueChange={(v) =>
                          setFollowUpResult(
                            v === "pending" ? null : v === "true",
                          )
                        }
                      >
                        <SelectTrigger className="w-[155px] h-7 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Ausstehend</SelectItem>
                          <SelectItem value="true">Erschienen</SelectItem>
                          <SelectItem value="false">
                            Nicht erschienen
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {entry.stage === SALES_STAGE.CLOSED && (
                    <div className="flex justify-between items-center gap-4">
                      <Label className="text-sm text-muted-foreground shrink-0">
                        Abgeschlossen am
                      </Label>
                      <Input
                        type="date"
                        value={completedAt}
                        onChange={(e) => setCompletedAt(e.target.value)}
                        className="w-[155px] h-7 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Quelle */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Quelle
                </h3>
                <div className="space-y-2">
                  <Select
                    value={source}
                    onValueChange={(v) =>
                      handleSourceChange(v as SalesProcessSource)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Quelle auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organic">Organisch</SelectItem>
                      <SelectItem value="paid">Bezahlt</SelectItem>
                    </SelectContent>
                  </Select>

                  {source === "paid" && (
                    <Select
                      value={String(sourceStageId ?? "")}
                      onValueChange={(v) =>
                        setSourceStageId(v ? Number(v) : null)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Bühne auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={String(stage.id)}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Save */}
              <Button
                className="w-full"
                disabled={!canSave}
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>

              {/* Vertrag */}
              {entry.stage === SALES_STAGE.CLOSED && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Vertrag
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const base = `/contracts?client=${entry.client_id}&open=1`;
                      const url = entry.id
                        ? `${base}&sales_process=${entry.id}`
                        : base;
                      navigate(url);
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Vertrag anzeigen
                  </Button>
                </div>
              )}

              {/* Kommentare */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Kommentare
                </h3>
                <CommentsSection
                  entityType="sales_process"
                  entityId={entry.id}
                  clientId={entry.client_id}
                  isOpen={true}
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
