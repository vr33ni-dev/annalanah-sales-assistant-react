// src/auth/useAuth.ts
import api from "@/lib/api";
import axios from "axios";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    __LOGGING_OUT?: boolean;
  }
}

// --- cross-tab logout broadcast ---
const ch = new BroadcastChannel("auth");
export const broadcastLogout = () => ch.postMessage({ type: "logout" });
export const onAuthMessage = (fn: () => void) => {
  ch.onmessage = (e) => e.data?.type === "logout" && fn();
};

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

export function logout(qc?: QueryClient) {
  try {
    qc?.clear?.();
  } catch {
    /* empty */
  }

  sessionStorage.setItem(
    "suppressAuthRedirectUntil",
    String(Date.now() + 5000)
  );

  // notify other tabs before redirect
  broadcastLogout();

  window.location.assign("/auth/logout");
}

export function useLogout() {
  const qc = useQueryClient();
  return () => logout(qc);
}
