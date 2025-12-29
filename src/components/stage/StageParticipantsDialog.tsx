import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Users, Mail, Phone, Check, X } from "lucide-react";
import { getStageParticipants, Stage, StageParticipant } from "@/lib/api";

interface StageParticipantsDialogProps {
  stage: Stage;
}

export function StageParticipantsDialog({ stage }: StageParticipantsDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: participants = [], isLoading } = useQuery<StageParticipant[]>({
    queryKey: ["stage-participants", stage.id],
    queryFn: () => getStageParticipants(stage.id),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Teilnehmer anzeigen"
          className="h-8 w-8 p-0"
        >
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
          <p className="text-sm text-muted-foreground py-4">Lädt Teilnehmer...</p>
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
