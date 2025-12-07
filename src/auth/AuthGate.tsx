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
    // In Lovable preview, bypass auth if API is unavailable (network error, not 401)
    if (isLovablePreview() && isError) {
      const isNetworkError = error && !("response" in error && (error as any).response?.status === 401);
      if (isNetworkError) {
        console.info("[AuthGate] Bypassing auth in Lovable preview (API unavailable)");
        setBypassAuth(true);
      }
    }
  }, [isError, error]);

  useEffect(() => {
    // Timeout fallback: if loading takes too long in Lovable preview, bypass
    if (isLovablePreview() && isLoading) {
      const timeout = setTimeout(() => {
        console.info("[AuthGate] Bypassing auth in Lovable preview (timeout)");
        setBypassAuth(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  if (bypassAuth) {
    return <>{children}</>;
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!me) return <>{fallback}</>;
  return <>{children}</>;
}
