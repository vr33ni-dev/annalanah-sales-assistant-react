import { useMe, useLogout } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

export default function UserMenu() {
  const { data: me } = useMe();
  const logout = useLogout();

  if (!me) return null; // when unauthenticated, header stays clean

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{me.email}</span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        Logout
      </Button>
    </div>
  );
}
