// src/auth/useAuth.ts
import api from "@/lib/api";
import axios from "axios";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    __LOGGING_OUT?: boolean;
  }
}

export type Me = { email: string; name: string; exp?: string };

async function fetchMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<Me>("/me");
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) return null;
    throw err;
  }
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export async function logout(qc?: QueryClient) {
  try {
    // prevent 401→/auth redirect loop while logging out
    window.__LOGGING_OUT = true;
    sessionStorage.setItem(
      "suppressAuthRedirectUntil",
      String(Date.now() + 5000)
    );

    try {
      qc?.clear?.();
    } catch {
      /* noop */
    }

    // Same-origin logout (works locally via Vite proxy and on Render via rewrites)
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } finally {
    window.location.href = "/login?auth=logged_out";
  }
}

// Small hook you can call from components
export function useLogout() {
  const qc = useQueryClient();
  return () => logout(qc);
}
