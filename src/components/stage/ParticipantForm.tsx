// src/components/stage/ParticipantForm.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, User } from "lucide-react";

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string;
  createAsLead: boolean;
  attended?: boolean;
}

interface ParticipantFormProps {
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
  disabled?: boolean;
}

const createEmptyParticipant = (): Participant => ({
  id: crypto.randomUUID(),
  name: "",
  email: "",
  phone: "",
  createAsLead: false,
  attended: false,
});

export function ParticipantForm({
  participants,
  onChange,
  disabled = false,
}: ParticipantFormProps) {
  const addParticipant = () => {
    onChange([...participants, createEmptyParticipant()]);
  };

  const removeParticipant = (id: string) => {
    onChange(participants.filter((p) => p.id !== id));
  };

  const updateParticipant = (
    id: string,
    field: keyof Omit<Participant, "id">,
    value: string | boolean
  ) => {
    onChange(
      participants.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" />
          Neue Kontakte ({participants.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addParticipant}
          disabled={
            disabled ||
            participants.some(
              (p) => !p.name.trim() && !p.email.trim() && !p.phone.trim()
            )
          }
        >
          <Plus className="w-3 h-3 mr-1" />
          Hinzufügen
        </Button>
      </div>

      {participants.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">
          Noch keine neuen Kontakte hinzugefügt.
        </p>
      )}

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {participants.map((participant, index) => {
          const emailMissing = !participant.email.trim();
          const leadCheckboxDisabled = disabled;

          return (
            <div
              key={participant.id}
              className="grid gap-2 p-3 border rounded-md bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Kontakt {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeParticipant(participant.id)}
                  disabled={disabled}
                  title="Kontakt entfernen"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="grid gap-1">
                <Label className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Name"
                  value={participant.name}
                  onChange={(e) =>
                    updateParticipant(participant.id, "name", e.target.value)
                  }
                  disabled={disabled}
                  aria-required={true}
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={participant.email}
                    onChange={(e) =>
                      updateParticipant(participant.id, "email", e.target.value)
                    }
                    disabled={disabled}
                    className={`h-8 text-sm ${
                      participant.createAsLead && emailMissing
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />

                  {participant.createAsLead && emailMissing && (
                    <p className="text-xs text-destructive">
                      Email ist erforderlich, wenn ein Lead erstellt wird
                    </p>
                  )}
                </div>

                <Input
                  placeholder="Telefon"
                  type="tel"
                  value={participant.phone}
                  onChange={(e) =>
                    updateParticipant(participant.id, "phone", e.target.value)
                  }
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id={`lead-${participant.id}`}
                  checked={participant.createAsLead}
                  disabled={leadCheckboxDisabled}
                  onCheckedChange={(checked) => {
                    updateParticipant(
                      participant.id,
                      "createAsLead",
                      Boolean(checked)
                    );
                  }}
                />

                <Label
                  htmlFor={`lead-${participant.id}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Als Lead anlegen
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
