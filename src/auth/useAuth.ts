import api, { AUTH_BASE } from "@/lib/api";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
export type Me = { email: string; name: string; exp?: string };

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

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch(`${AUTH_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      qc.setQueryData(["me"], null); // immediate UI update
      qc.invalidateQueries({ queryKey: ["me"] });
      // optional: window.location.reload(); // force hard reload if needed
    },
  });
}
