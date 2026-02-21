// Use EXPO_PUBLIC_API_MODE to switch between backends. 
// Production Android build -> production
// Preview and Debug build -> demo
const API_MODE = process.env.EXPO_PUBLIC_API_MODE;

export const API_URL = API_MODE === "production"
    ? "https://feed-newhope.vercel.app"
    : "https://demo-newhope.vercel.app";
