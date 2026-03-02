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
                // React Native fetch() notoriously drops manual `cookie:` headers.
                // We MUST use the Authorization: Bearer <token> format for TRPC.
                // better-auth securely stores the raw server cookies locally in Android.
                // We synchronously parse that cookie jar to find the active session_token.
                let token = undefined;

                try {
                    const cookieStr = SecureStore.getItem("poultrysolution_cookie");
                    if (cookieStr) {
                        const parsed = JSON.parse(cookieStr);
                        // Find the cookie ending in 'session_token' (e.g. better-auth.session_token)
                        for (const [key, val] of Object.entries(parsed) as any[]) {
                            if (key.includes("session_token") && val?.value) {
                                // REMOVED: Local expiry check. 
                                // Trust the server to handle session expiration.
                                // Local clocks are often out of sync.
                                token = val.value;
                                break;
                            }
                        }
                    }
                } catch (e) { }

                // Fallback to session_data cache if cookie parser fails for any reason
                if (!token) {
                    const sessionStr = SecureStore.getItem("poultrysolution_session_data");
                    if (sessionStr) {
                        try {
                            const parsed = JSON.parse(sessionStr);
                            token = parsed?.session?.token;
                        } catch (e) { }
                    }
                }

                // Only return Authorization header if token exists and isn't the string "undefined"
                if (token && token !== "undefined") {
                    return {
                        Authorization: `Bearer ${token}`,
                    };
                }

                return {};
            },
        }),
    ],
});
