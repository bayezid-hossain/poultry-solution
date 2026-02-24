const API_MODE = process.env.EXPO_PUBLIC_API_MODE;

export const API_URL = API_MODE === "production"
    ? "https://feed-newhope.vercel.app"
    : "https://demo-newhope.vercel.app";

// TRPC behavior per mode:
// 1. production: Live Prod URL
// 2. preview: Live Demo URL (for testing/sharing)
// 3. (default): Local computer IP (for active development)
export const TRPC_API_URL = API_MODE === "production"
    ? "https://feed-newhope.vercel.app"
    : API_MODE === "preview"
        ? "https://demo-newhope.vercel.app"
        : "http://192.168.0.186:3000";
