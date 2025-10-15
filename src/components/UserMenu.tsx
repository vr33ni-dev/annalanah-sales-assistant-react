// src/components/UserMenu.tsx
import { useMe, useLogout } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

export default function UserMenu() {
  const { data: me } = useMe();
  const doLogout = useLogout();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{me?.email}</span>
      <Button size="sm" variant="outline" onClick={doLogout}>
        Logout
      </Button>
    </div>
  );
}
