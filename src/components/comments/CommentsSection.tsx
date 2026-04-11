import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Comment,
  CommentEntityType,
  getComments,
  getCommentsByClientId,
  createComment,
  deleteComment,
} from "@/lib/api";
import { useAuthEnabled } from "@/auth/useAuthEnabled";
import { getMockCommentsForEntity, getMockCommentsForClient } from "@/lib/mockData";
import { ConfirmActionButton } from "../ConfirmActionButton";
import { toast } from "@/hooks/use-toast";

const entityTypeLabels: Record<CommentEntityType, string> = {
  client: "Kunde",
  contract: "Vertrag",
  sales_process: "Verkaufsprozess",
};

interface CommentsSectionProps {
  entityType: CommentEntityType;
  entityId: number;
  clientId?: number;
  isOpen?: boolean;
  maxHeight?: string;
  className?: string;
}

export function CommentsSection({
  entityType,
  entityId,
  clientId,
  isOpen,
  maxHeight = "300px",
  className,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [localMockComments, setLocalMockComments] = useState<Comment[]>([]);
  const queryClient = useQueryClient();
  const { useMockData } = useAuthEnabled();

  // When clientId is provided, fetch all comments for the client; otherwise scope to entity
  const queryKey = clientId
    ? ["comments", "client", clientId]
    : ["comments", entityType, entityId];

  const {
    data: apiComments = [],
    isLoading,
    isError,
  } = useQuery<Comment[], Error>({
    queryKey,
    queryFn: () =>
      clientId
        ? getCommentsByClientId(clientId)
        : getComments(entityType, entityId),
    enabled: (isOpen ?? true) && (clientId ? !!clientId : !!entityId) && !useMockData,
  });

  // Use mock data in Lovable preview
  const comments = useMockData
    ? clientId
      ? [...getMockCommentsForClient(clientId), ...localMockComments]
      : [...getMockCommentsForEntity(entityType, entityId), ...localMockComments]
    : apiComments;

  const createMutation = useMutation<Comment, unknown, string>({
    mutationFn: (content: string) =>
      createComment({
        entity_type: entityType,
        entity_id: entityId,
        body: content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setNewComment("");
      toast({ title: "Kommentar gespeichert" });
    },
    onError: () => {
      toast({
        title: "Kommentar konnte nicht gespeichert werden",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<void, unknown, number>({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Kommentar gelöscht" });
    },
    onError: () => {
      toast({
        title: "Kommentar konnte nicht gelöscht werden",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;

    if (useMockData) {
      const mockComment: Comment = {
        id: Date.now(),
        entity_type: entityType,
        entity_id: entityId,
        client_id: clientId,
        body: trimmed,
        created_at: new Date().toISOString(),
      };
      setLocalMockComments((prev) => [...prev, mockComment]);
      setNewComment("");
      toast({ title: "Kommentar gespeichert" });
    } else {
      createMutation.mutate(trimmed);
    }
  };

  const handleDelete = (commentId: number) => {
    if (useMockData) {
      setLocalMockComments((prev) => prev.filter((c) => c.id !== commentId));
      toast({ title: "Kommentar gelöscht" });
    } else {
      deleteMutation.mutate(commentId);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm">
          Kommentare {comments.length > 0 && `(${comments.length})`}
        </h4>
      </div>

      {/* Comments List */}
      <ScrollArea className="pr-4" style={{ maxHeight, height: maxHeight }}>
        {isLoading && !useMockData ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError && !useMockData ? (
          <p className="text-sm text-destructive">
            Fehler beim Laden der Kommentare.
          </p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Noch keine Kommentare vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="group relative p-3 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {comment.author ?? "—"}
                      </p>
                      {clientId && comment.entity_type !== "client" && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {entityTypeLabels[comment.entity_type] ?? comment.entity_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words mt-1">
                      {comment.body ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {comment.created_at
                        ? format(new Date(comment.created_at), "PPp", {
                            locale: de,
                          })
                        : "—"}
                    </p>
                  </div>
                  <ConfirmActionButton
                    title="Kommentar löschen?"
                    description="Dieser Kommentar wird dauerhaft gelöscht."
                    confirmLabel="Löschen"
                    onConfirm={() => handleDelete(comment.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </ConfirmActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Kommentar hinzufügen..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] resize-none"
          disabled={createMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1" />
            )}
            Senden
          </Button>
        </div>
      </form>
    </div>
  );
}
