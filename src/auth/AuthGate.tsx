// src/auth/AuthGate.tsx
import { ReactNode, useEffect, useState } from "react";
import { useMe } from "./useAuth";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

// Detect if running in Lovable's preview environment
const isLovablePreview = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname.includes("lovableproject.com");
};

export default function AuthGate({ children, fallback = null }: Props) {
  const { data: me, isLoading, isError, error } = useMe();
  const [bypassAuth, setBypassAuth] = useState(false);

  useEffect(() => {
    // If we're in Lovable preview and got a network error (not 401), bypass auth
    if (isLovablePreview() && isError) {
      const isNetworkError = error && !("response" in error && (error as any).response?.status === 401);
      if (isNetworkError) {
        console.info("[AuthGate] Bypassing auth in Lovable preview (API unavailable)");
        setBypassAuth(true);
      }
    }
  }, [isError, error]);

  if (bypassAuth) {
    return <>{children}</>;
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!me) return <>{fallback}</>;
  return <>{children}</>;
}
