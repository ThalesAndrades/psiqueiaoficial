import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide TanStack Query client.
 *
 * Defaults chosen for a mobile telepsicologia app where most reads are
 * personal (a patient's diary, a psychologist's agenda):
 *   - staleTime 60s: avoid refetch storms when navigating between tabs.
 *   - gcTime 5min: free memory after screens unmount but keep cache warm
 *     for the typical "open app → check agenda → switch screens" loop.
 *   - retry 1: services already surface `{ data, error }` and most failures
 *     are auth/RLS — retrying more wastes time and hides real errors.
 *   - refetchOnWindowFocus disabled (RN doesn't have a meaningful window
 *     focus event; the equivalent would be AppState which we leave to
 *     individual screens via `refetch`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
