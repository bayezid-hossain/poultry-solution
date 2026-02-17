import Constants from "expo-constants";

// In development, use the LAN IP of the machine running the Next.js server
// In production, use the deployed URL
const DEV_API_URL = `http://${Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost"}:3000`;

export const API_URL = __DEV__ ? DEV_API_URL : "https://feed-newhope.vercel.app";
