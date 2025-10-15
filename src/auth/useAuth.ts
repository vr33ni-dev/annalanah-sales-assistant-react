import api, { AUTH_BASE } from "@/lib/api";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
export type Me = { email: string; name: string; exp?: string };
import { QueryClient } from "@tanstack/react-query";

async function fetchMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<Me>("/me");
    return data;
  } catch (err) {
    // tell TypeScript this is an Axios error
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401) return null;
    }
    throw err; // preserve the original type
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
    // Block interceptor's 401→/auth redirect for a short time
    window.__LOGGING_OUT = true;
    sessionStorage.setItem(
      "suppressAuthRedirectUntil",
      String(Date.now() + 5000) // 5s grace window
    );

    // Best-effort: clear client-side caches/state
    try {
      qc?.clear?.();
    } catch {
      /* empty */
    }

    // Tell server to clear the session cookie
    // Prefer POST; fallback GET if that's how your route is wired.
    await api.post("/auth/logout").catch(async () => {
      // Fallback in case your API is mounted as a public route
      await fetch(`${AUTH_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    });
  } finally {
    // Hard navigation so *all* in-memory state is gone
    window.location.href = "/login?auth=logged_out";
  }
}
