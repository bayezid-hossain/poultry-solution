// src/config/api.ts

const API_MODE = process.env.EXPO_PUBLIC_API_MODE ?? "development";

/**
 * API Modes:
 * - production → live production server
 * - preview    → demo server
 * - development → local machine
 */

export const API_URL =
    API_MODE === "production"
        ? "https://feed-newhope.vercel.app"
        : "https://demo-newhope.vercel.app";

export const TRPC_API_URL =
    API_MODE === "production"
        ? "https://feed-newhope.vercel.app"
        : API_MODE === "preview"
            ? "https://demo-newhope.vercel.app"
            : "http://192.168.0.186:3000";

console.log("🚀 API MODE:", API_MODE);
console.log("🌍 TRPC URL:", TRPC_API_URL);