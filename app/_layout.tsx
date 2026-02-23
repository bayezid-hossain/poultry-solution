import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { Text } from "@/components/ui/text";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  // Only query membership if we have a session
  const { data: membership, isLoading: isMembershipLoading, error: membershipError } =
    trpc.auth.getMyMembership.useQuery(undefined, {
      enabled: !!session,
      retry: false
    });

  // Calculate redirect/render state
  // We do this logic during render to prevent "flicker" of children before redirect
  let action: "loading" | "render" | "redirect" | "error" = "loading";
  let redirectTarget = "";

  // Check if we are handling an auth callback (deep link)
  // This prevents the "Login Screen" flicker when returning from Google Auth
  const url = Linking.useLinkingURL();
  const isAuthCallback = url?.includes("code=") || url?.includes("error=");

  if (isSessionPending) {
    action = "loading";
  } else if (isAuthCallback && !session) {
    // If we have an auth code but no session yet, we are processing login.
    // Force loading state.
    action = "loading";
  } else if (!session) {
    const inAuthGroup = segments[0] === "(auth)";
    if (inAuthGroup) {
      action = "render";
    } else {
      action = "redirect";
      redirectTarget = "/sign-in";
    }
  } else {
    // Session exists
    if (isMembershipLoading) {
      action = "loading";
    } else if (membershipError || !membership) {
      action = "error";
    } else {
      // Membership Loaded
      const status = membership.status;
      const inAuthGroup = segments[0] === "(auth)";
      const inOrgGroup = segments[0] === "(org)";

      if (status === "NO_ORG") {
        const isOnJoinScreen = inOrgGroup && segments[1] === "join-org";
        if (isOnJoinScreen) {
          action = "render";
        } else {
          action = "redirect";
          redirectTarget = "/join-org";
        }
      } else if (status === "PENDING" || status === "REJECTED") {
        const isOnPendingScreen = inOrgGroup && segments[1] === "pending-approval";
        if (isOnPendingScreen) {
          action = "render";
        } else {
          action = "redirect";
          redirectTarget = "/pending-approval";
        }
      } else if (status === "ACTIVE") {
        // Active User
        if (inAuthGroup || inOrgGroup) {
          action = "redirect";
          redirectTarget = "/"; // Redirect to root (tabs index)
        } else {
          action = "render";
        }
      } else {
        action = "render";
      }
    }
  }

  useEffect(() => {
    if (action === "redirect" && redirectTarget) {
      router.replace(redirectTarget as any);
    }
  }, [action, redirectTarget]);

  if (action === "loading" || action === "redirect") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        {isAuthCallback && !session && (
          <Text className="text-primary font-bold mt-4 text-lg">Completing Sign In...</Text>
        )}
      </View>
    );
  }

  if (action === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-destructive">
          Failed to load membership status.
          {membershipError?.message}
        </Text>
        <Pressable onPress={() => authClient.signOut().then(() => router.replace("/sign-in"))} className="mt-4 bg-destructive p-3 rounded">
          <Text className="text-destructive-foreground">Sign Out</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

import { queryClient, trpc, trpcClient } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FullWindowOverlay } from "react-native-screens";
import { Toaster } from "sonner-native";

function RootLayoutInner() {
  const { colorScheme } = useTheme();

  // FullWindowOverlay is iOS only. Android Modals are handled differently, but React Native Screens
  // exports this component. To be safe, we only use it on iOS.
  const TopOverlay = Platform.OS === 'ios' ? FullWindowOverlay : View;

  return (
    <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(org)" />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
      </AuthGuard>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <PortalHost />
      {/* TopOverlay ensures toasts render above Modals, especially on iOS */}
      <TopOverlay style={Platform.OS === 'ios' ? undefined : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' }}>
        <Toaster position="bottom-center" offset={40} />
      </TopOverlay>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootLayoutInner />
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
