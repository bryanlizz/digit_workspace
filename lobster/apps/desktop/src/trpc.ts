import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { type AppRouter } from "@lobster/web/router";

function getApiBaseUrl(): string {
  return localStorage.getItem("lobster_api_url") ?? "http://localhost:3000";
}

function getToken(): string | null {
  return localStorage.getItem("lobster_token");
}

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: `${getApiBaseUrl()}/api/trpc`,
      headers() {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
