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
    window.__LOGGING_OUT = true;
    sessionStorage.setItem(
      "suppressAuthRedirectUntil",
      String(Date.now() + 5000)
    );
    try {
      qc?.clear?.();
    } catch {
      /* add catch block */
    }

    await api.post("/logout"); // <- hits /api/logout (same-origin)
  } catch {
    // ignore; just continue
  } finally {
    window.location.href = "/auth/logout";
  }
}
export function useLogout() {
  const qc = useQueryClient();
  return () => logout(qc);
}
