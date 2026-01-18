import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CommentsSection } from "./CommentsSection";
import { CommentEntityType } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { getComments } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface CommentsDialogProps {
  entityType: CommentEntityType;
  entityId: number;
  entityName?: string;
  triggerVariant?: "icon" | "button";
}

export function CommentsDialog({
  entityType,
  entityId,
  entityName,
  triggerVariant = "icon",
}: CommentsDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => getComments(entityType, entityId),
    enabled: !!entityId,
  });

  const commentCount = comments.length;

  const entityTypeLabels: Record<CommentEntityType, string> = {
    client: "Kunde",
    contract: "Vertrag",
    salesprocess: "Verkaufsprozess",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button
            size="icon"
            variant="ghost"
            className="relative h-8 w-8"
            title="Kommentare anzeigen"
          >
            <MessageSquare className="w-4 h-4" />
            {commentCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
              >
                {commentCount}
              </Badge>
            )}
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Kommentare
            {commentCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {commentCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Kommentare – {entityTypeLabels[entityType]}
            {entityName && `: ${entityName}`}
          </DialogTitle>
        </DialogHeader>
        <CommentsSection
          entityType={entityType}
          entityId={entityId}
          maxHeight="350px"
        />
      </DialogContent>
    </Dialog>
  );
}
