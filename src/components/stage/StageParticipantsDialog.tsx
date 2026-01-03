// src/components/stage/StageParticipantsDialog.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Mail, Phone, Check, X, Trash2 } from "lucide-react";
import {
  getStageParticipants,
  deleteStageParticipant,
  Stage,
  StageParticipant,
} from "@/lib/api";

interface Props {
  stage: Stage;
}

export function StageParticipantsDialog({ stage }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ["stage-participants", stage.id],
    queryFn: () => getStageParticipants(stage.id),
    enabled: open,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (participantId: number) =>
      deleteStageParticipant(stage.id, participantId),

    onMutate: async (participantId) => {
      await qc.cancelQueries({ queryKey: ["stage-participants", stage.id] });

      const prev = qc.getQueryData<StageParticipant[]>([
        "stage-participants",
        stage.id,
      ]);

      qc.setQueryData<StageParticipant[]>(
        ["stage-participants", stage.id],
        (old) => old?.filter((p) => p.id !== participantId) ?? []
      );

      return { prev };
    },

    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(["stage-participants", stage.id], ctx.prev);
      }
    },

    onSuccess: async () => {
      // 🔥 THIS was missing
      await qc.invalidateQueries({
        queryKey: ["stage-participants", stage.id],
      });

      await qc.invalidateQueries({
        queryKey: ["stages"], // updates recorded_contacts
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Users className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teilnehmer: {stage.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Lädt Teilnehmer…</p>
        ) : participants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Noch keine Teilnehmer für diese Bühne registriert.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Teilgenommen</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>

                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                      {p.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {p.email}
                        </span>
                      )}
                      {p.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {p.phone}
                        </span>
                      )}
                      {!p.email && !p.phone && "–"}
                    </div>
                  </TableCell>

                  <TableCell>
                    {p.attended ? (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="w-3 h-3 mr-1" />
                        Ja
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="w-3 h-3 mr-1" />
                        Nein
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      title="Kontakt entfernen"
                      onClick={() => deleteMutation.mutate(p.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {participants.length} Teilnehmer registriert
        </p>
      </DialogContent>
    </Dialog>
  );
}
