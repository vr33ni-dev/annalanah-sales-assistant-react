import { useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query";
import { useAuthEnabled } from "@/auth/useAuthEnabled";

/**
 * A wrapper around useQuery that returns mock data in Lovable preview mode
 * when no real API is available.
 */
export function useMockableQuery<
  TQueryFnData,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, Error, TData, TQueryKey> & {
    mockData: TQueryFnData;
  },
) {
  const { enabled, useMockData } = useAuthEnabled();
  const { mockData, ...queryOptions } = options;
  const callerEnabled = queryOptions.enabled;

  // Respect the caller's `enabled` while also gating on auth availability.
  // (Previously, caller-provided enabled was overwritten, causing "lazy" queries
  // like comment dialogs to run for every row on initial render.)
  const combinedEnabled =
    typeof callerEnabled === "function"
      ? (query: Parameters<typeof callerEnabled>[0]) =>
          Boolean(callerEnabled(query)) && enabled && !useMockData
      : Boolean(callerEnabled ?? true) && enabled && !useMockData;

  const query = useQuery({
    ...queryOptions,
    enabled: combinedEnabled,
  });

  // Return mock data when in preview mode without API
  if (useMockData) {
    const selectedMockData = queryOptions.select
      ? queryOptions.select(mockData)
      : (mockData as unknown as TData);

    return {
      ...query,
      data: selectedMockData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };
  }

  return query;
}
