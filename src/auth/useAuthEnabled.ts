import { useMe } from "./useAuth";

export function useAuthEnabled() {
  const { data: me, isLoading } = useMe();
  return { enabled: !!me && !isLoading, me, meLoading: isLoading };
}
