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
  createComment,
  deleteComment,
} from "@/lib/api";

interface CommentsSectionProps {
  entityType: CommentEntityType;
  entityId: number;
  maxHeight?: string;
  className?: string;
}

export function CommentsSection({
  entityType,
  entityId,
  maxHeight = "300px",
  className,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const queryKey = ["comments", entityType, entityId];

  const {
    data: comments = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => getComments(entityType, entityId),
    enabled: !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: (content: string) =>
      createComment({ entity_type: entityType, entity_id: entityId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setNewComment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
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
      <ScrollArea className="pr-4" style={{ maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
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
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {comment.created_at
                        ? format(new Date(comment.created_at), "PPp", {
                            locale: de,
                          })
                        : "—"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (window.confirm("Kommentar wirklich löschen?")) {
                        deleteMutation.mutate(comment.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
