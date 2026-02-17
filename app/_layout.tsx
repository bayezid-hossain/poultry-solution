import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authClient } from "@/lib/auth-client";

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
      const isModal = segments[0] === "modal"; // Handle modal route if needed, usually allow? No, protect it.

      if (status === "NO_ORG") {
        // Check if on join screen.
        // Note: segments include groups.
        // app/(org)/join-org.tsx -> segments=["(org)", "join-org"]
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
        // Unknown status, default to render (or error?)
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
    // Show spinner if loading OR if we are about to redirect
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" className="text-primary" />
        {isAuthCallback && !session && (
          <ThemedText style={{ marginTop: 20 }}>Completing Sign In...</ThemedText>
        )}
      </View>
    );
  }

  if (action === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <ThemedText className="text-destructive">
          Failed to load membership status.
          {membershipError?.message}
        </ThemedText>
        <Pressable onPress={() => authClient.signOut().then(() => router.replace("/sign-in"))} className="mt-4 bg-destructive p-3 rounded">
          <ThemedText className="text-destructive-foreground">Sign Out</ThemedText>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

import { queryClient, trpc, trpcClient } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(org)" />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
          </AuthGuard>
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
