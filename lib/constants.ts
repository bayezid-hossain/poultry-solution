// Use the production backend directly which has the correct Google OAuth configuration
// For local development, you can switch to ngrok or LAN IP if needed, but we default to the demo instance for dev.
export const API_URL = __DEV__ ? "https://demo-newhope.vercel.app" : "https://feed-newhope.vercel.app";
