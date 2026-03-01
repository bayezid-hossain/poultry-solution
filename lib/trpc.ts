import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import * as SecureStore from "expo-secure-store";
import superjson from "superjson";
import type { AppRouter } from "../../feed-reminder-up/trpc/routers/_app";
import { TRPC_API_URL } from "./config/api";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: `${TRPC_API_URL}/api/trpc`,
            transformer: superjson,
            async headers() {
                // Prevent calling the async authClient.getSession() on every TRPC request
                // which causes race conditions and 401s due to missing context.
                // We synchronously grab the cached session data that better-auth stores.
                const sessionStr = SecureStore.getItem("poultrysolution_session_data");
                let token = undefined;
                if (sessionStr) {
                    try {
                        const parsed = JSON.parse(sessionStr);
                        token = parsed?.session?.token;
                    } catch (e) { }
                }

                return {
                    Authorization: token ? `Bearer ${token}` : undefined,
                };
            },
        }),
    ],
});
