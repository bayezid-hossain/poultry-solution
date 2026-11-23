import { expoClient, storageAdapter } from "@better-auth/expo/client";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config/api";

export const AUTH_STORAGE_PREFIX = "poultrysolution";

export const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [
        expoClient({
            scheme: "poultrysolution",
            storagePrefix: AUTH_STORAGE_PREFIX,
            storage: SecureStore,
        }),
        emailOTPClient(),
        organizationClient(),
    ],
});

/**
 * Read-only access to what the better-auth Expo client keeps in SecureStore
 * (`<prefix>_cookie`, `<prefix>_session_data`).
 *
 * Since @better-auth/expo 1.7 a large value is split across several keys, with
 * only a `ba-chunks:` marker under the base key, so reading SecureStore
 * directly can return the marker instead of the JSON. This adapter wraps the
 * same SecureStore object the client uses, so it reassembles chunked values
 * and waits for the client's pending writes before reading.
 */
const authStorage = storageAdapter(SecureStore);

export function readAuthStorage(name: "cookie" | "session_data"): Promise<string | null> {
    return authStorage.getItemAsync(`${AUTH_STORAGE_PREFIX}_${name}`);
}
