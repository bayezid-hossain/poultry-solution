import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const LAST_SHOWN_NOTIF_KEY = "@last_shown_notif_id";

Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // console.log("📥 setNotificationHandler called for:", notification.request.content.title);
        return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        };
    },
});

export function handleNotificationNavigation(link: string | undefined | null, routerPush: (path: any) => void) {
    if (!link) return;

    const parts = link.split("/").filter(Boolean);

    if (link.includes("/cycles/")) {
        const cycleId = parts[parts.length - 1];
        routerPush(`/cycle/${cycleId}`);
    } else if (link.includes("/farmers/") || (parts.length >= 2 && parts[1] === "farmers")) {
        const farmerId = parts[parts.length - 1];
        routerPush(`/farmer/${farmerId}`);
    } else if (link.endsWith("/farmers")) {
        routerPush("/(drawer)/(tabs)/farmers");
    } else if (link.includes("/reports") || link.includes("/sales")) {
        routerPush("/(drawer)/reports");
    } else {
        // console.log("No mobile route mapped for:", link);
    }
}

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState("");
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);
    const lastShownNotifIdRef = useRef<string | null>(null);
    const initedRef = useRef(false);

    // Load persisted last-shown notification ID on mount
    useEffect(() => {
        AsyncStorage.getItem(LAST_SHOWN_NOTIF_KEY).then((id) => {
            if (id) lastShownNotifIdRef.current = id;
            initedRef.current = true;
        });
    }, []);

    const { mutate: registerToken } = trpc.auth.registerPushToken.useMutation({
        onError: (err) => console.error("Failed to register push token:", err.message),
    });

    const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
    const isLoggedIn = !sessionLoading && !!sessionData?.user?.id;

    // Foreground polling: check for new unread notifications every 10 seconds
    const { data: latestUnread } = trpc.notifications.latestUnread.useQuery(
        undefined,
        {
            refetchInterval: 10_000,
            enabled: isLoggedIn,
        }
    );

    // When a new unread notification is detected, show it as a local notification
    useEffect(() => {
        if (!initedRef.current) return; // Wait until persisted ID is loaded
        if (
            latestUnread &&
            latestUnread.id !== lastShownNotifIdRef.current
        ) {
            lastShownNotifIdRef.current = latestUnread.id;
            AsyncStorage.setItem(LAST_SHOWN_NOTIF_KEY, latestUnread.id);
            // Schedule a local notification so it pops up in the foreground
            Notifications.scheduleNotificationAsync({
                content: {
                    title: latestUnread.title,
                    body: latestUnread.message,
                    data: { link: latestUnread.link },
                },
                trigger: null,
            });
        }
    }, [latestUnread]);

    useEffect(() => {
        // console.log("🔄 usePushNotifications hook effect running. SessionLoading:", sessionLoading, "HasUser:", !!sessionData?.user?.id);

        if (isLoggedIn) {
            registerForPushNotificationsAsync()
                .then((token) => {
                    if (token) {
                        // console.log("🎫 Registered Token:", token);
                        setExpoPushToken(token);
                        registerToken({ token });
                    }
                })
                .catch((error) => console.log("Push notification registration failed:", error));
        }

        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            // console.log("🔔 Foreground Notification Received:", JSON.stringify(notification, null, 2));
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (typeof data?.link === "string") {
                handleNotificationNavigation(data.link, router.push as any);
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [sessionData, sessionLoading]);

    return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("alerts", {
            name: "Alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#10b981",
            showBadge: true,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            //   console.log("⚠️ Requesting push permissions...");
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        // console.log("📊 Push Permission Status:", finalStatus);
        if (finalStatus !== "granted") {
            console.log("❌ Failed to get push token: permission not granted");
            return;
        }
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            console.log("Project ID not found");
        }
        try {
            token = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
        } catch (e) {
            console.log("Error getting push token:", e);
        }
    } else {
        console.log("Must use physical device for Push Notifications");
    }

    return token;
}
