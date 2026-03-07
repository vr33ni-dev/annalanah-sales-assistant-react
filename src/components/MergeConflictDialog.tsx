import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldConflict, MergeConflicts } from "@/types/merge";

type Props = {
  open: boolean;
  conflicts: MergeConflicts;
  hasActiveContract: boolean;
  matchReason?: "email" | "lead";
  disableOverwrite: boolean;
  overwriteDisabledReason?: string;
  onKeepExisting: () => void | Promise<void>;
  onOverwrite: () => void | Promise<void>;
  onCancel: () => void;
};

export function MergeConflictDialog({
  open,
  conflicts,
  hasActiveContract,
  disableOverwrite,
  overwriteDisabledReason,
  onKeepExisting,
  onOverwrite,
  onCancel,
}: Props) {
  const hasConflicts = Object.keys(conflicts).length > 0;

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {hasActiveContract
              ? "Kunde mit aktivem Vertrag"
              : "Kunde mit bestehendem Verkaufsprozess"}
          </DialogTitle>
        </DialogHeader>

        {/* Active contract → info only */}
        {hasActiveContract && (
          <p className="text-sm text-muted-foreground">
            Für diesen Kunden existiert bereits ein aktiver Vertrag. Änderungen
            müssen direkt im Vertrag vorgenommen werden (z. B. Upsell oder
            Vertragsänderung).
          </p>
        )}

        {/* No active contract */}
        {!hasActiveContract && (
          <>
            {/* Overwrite not allowed → explanation */}
            {disableOverwrite && overwriteDisabledReason && (
              <div className="rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
                {overwriteDisabledReason}
              </div>
            )}

            {/* No field conflicts */}
            {!hasConflicts && (
              <p className="text-sm text-muted-foreground">
                Für diesen Kunden existiert bereits ein laufender
                Verkaufsprozess. Möchten Sie die bestehenden Daten beibehalten
                oder die neuen Daten übernehmen?
              </p>
            )}

            {/* Field conflicts */}
            {hasConflicts && (
              <div className="space-y-4 text-sm">
                {Object.entries(conflicts).map(([field, value]) => {
                  const c = value as FieldConflict<string>;
                  return (
                    <div key={field} className="rounded border p-3">
                      <div className="font-medium capitalize">{field}</div>
                      <div className="text-muted-foreground">
                        Bestehend: {c.existing ?? "–"}
                      </div>
                      <div className="text-muted-foreground">
                        Neu: {c.incoming ?? "–"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {!hasActiveContract && (
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>

            <Button variant="secondary" onClick={onKeepExisting}>
              Bestehende Daten übernehmen
            </Button>

            <Button
              onClick={onOverwrite}
              disabled={disableOverwrite || hasActiveContract}
              title={
                hasActiveContract
                  ? "Überschreiben ist bei aktivem Vertrag nicht erlaubt"
                  : disableOverwrite
                    ? overwriteDisabledReason
                    : undefined
              }
            >
              Neue Daten übernehmen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
