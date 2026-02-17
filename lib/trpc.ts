import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../feed-reminder-up/trpc/routers/_app";
import { authClient } from "./auth-client";
import { API_URL } from "./constants";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${API_URL}/api/trpc`,
            transformer: superjson,
            async headers() {
                // Retrieve session directly from authClient to avoid manual key construction issues
                const { data } = await authClient.getSession();

                // better-auth session object structure: { session: { token: "..." }, user: { ... } }
                const token = data?.session?.token;

                return {
                    Authorization: token ? `Bearer ${token}` : undefined,
                };
            },
        }),
    ],
});
