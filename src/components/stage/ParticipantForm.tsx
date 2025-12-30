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
          Erfasste Kontakte ({participants.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addParticipant}
          disabled={disabled}
        >
          <Plus className="w-3 h-3 mr-1" />
          Hinzufügen
        </Button>
      </div>

      {participants.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">
          Noch keine Kontakte erfasst.
        </p>
      )}

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {participants.map((participant, index) => (
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
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => removeParticipant(participant.id)}
                disabled={disabled}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid gap-2">
              <Input
                placeholder="Name *"
                value={participant.name}
                onChange={(e) =>
                  updateParticipant(participant.id, "name", e.target.value)
                }
                disabled={disabled}
                className="h-8 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Email"
                  type="email"
                  value={participant.email}
                  onChange={(e) =>
                    updateParticipant(participant.id, "email", e.target.value)
                  }
                  disabled={disabled}
                  className="h-8 text-sm"
                />
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
                  onCheckedChange={(checked) =>
                    updateParticipant(participant.id, "createAsLead", !!checked)
                  }
                  disabled={disabled}
                />
                <Label
                  htmlFor={`lead-${participant.id}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Als Lead anlegen
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { createEmptyParticipant };
