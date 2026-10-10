import { environmentManager, QueryClient } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, a staleTime above 0 stops the client from immediately
        // refetching data the server just fetched.
        staleTime: 60_000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a new client per request (never share cached data between users).
 * Browser: one client for the lifetime of the tab.
 */
export function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
