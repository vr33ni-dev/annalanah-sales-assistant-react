import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useAuthEnabled } from "@/auth/useAuthEnabled";

/**
 * A wrapper around useQuery that returns mock data in Lovable preview mode
 * when no real API is available.
 */
export function useMockableQuery<T>(
  options: UseQueryOptions<T, Error, T, string[]> & { mockData: T }
) {
  const { enabled, useMockData } = useAuthEnabled();
  const { mockData, ...queryOptions } = options;

  const query = useQuery({
    ...queryOptions,
    enabled: enabled && !useMockData,
  });

  // Return mock data when in preview mode without API
  if (useMockData) {
    return {
      ...query,
      data: mockData,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };
  }

  return query;
}
