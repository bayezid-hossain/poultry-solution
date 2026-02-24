import { Platform } from "react-native";

// Use EXPO_PUBLIC_API_MODE to switch between backends. 
// Production Android build -> production
// Preview and Debug build -> demo
const API_MODE = process.env.EXPO_PUBLIC_API_MODE;

export const API_URL = API_MODE === "production"
    ? "https://feed-newhope.vercel.app"
    : "https://demo-newhope.vercel.app";

// For TRPC, use localhost so local backend changes reflect immediately
// Android emulator needs 10.0.2.2 to access host localhost


export const TRPC_API_URL = API_MODE === "production"
    ? "https://feed-newhope.vercel.app"
    : Platform.OS === 'android' ? "http://192.168.0.186:3000" : "http://192.168.0.186:3000";