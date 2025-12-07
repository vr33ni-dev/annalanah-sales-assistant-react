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
  const host = window.location.hostname;
  return host.includes("lovableproject.com") || host.includes("lovable.app") || host.includes("webcontainer");
};

export default function AuthGate({ children, fallback = null }: Props) {
  const { data: me, isLoading } = useMe();
  
  // In Lovable preview, bypass auth immediately
  if (isLovablePreview()) {
    console.info("[AuthGate] Bypassing auth in Lovable preview");
    return <>{children}</>;
  }

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!me) return <>{fallback}</>;
  return <>{children}</>;
}
