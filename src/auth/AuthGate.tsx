// src/auth/AuthGate.tsx
import { ReactNode } from "react";
import { useMe } from "./useAuth";

type Props = {
  children: ReactNode;
  fallback?: ReactNode; // optional
};

export default function AuthGate({ children, fallback = null }: Props) {
  const { data: me, isLoading } = useMe();

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!me) return <>{fallback}</>;
  return <>{children}</>;
}
