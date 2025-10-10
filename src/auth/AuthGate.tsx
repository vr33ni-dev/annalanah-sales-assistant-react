import { ReactNode } from "react";
import { useMe } from "./useAuth";

export default function AuthGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const { data: me, isLoading } = useMe();

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!me) return <>{fallback}</>;
  return <>{children}</>;
}
