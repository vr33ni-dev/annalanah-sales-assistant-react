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

  const query = useQuery({
    ...queryOptions,
    enabled: enabled && !useMockData,
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
