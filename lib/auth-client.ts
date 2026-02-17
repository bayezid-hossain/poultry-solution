import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./constants";

export const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [
        expoClient({
            scheme: "poultrysolution",
            storagePrefix: "poultrysolution",
            storage: SecureStore,
        }),
        emailOTPClient(),
        organizationClient(),
    ],
});
