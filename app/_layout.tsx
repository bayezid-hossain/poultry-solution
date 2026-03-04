import { LoadingState } from "@/components/ui/loading-state";
import { VersionChecker } from "@/components/updater/version-checker";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { Text } from "@/components/ui/text";
import { StorageProvider } from "@/context/storage-context";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { isSocialAuthInProgress, setSocialAuthInProgress } from "@/lib/social-auth-flag";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

// Handle redirects back to the app from social login as early as possible
WebBrowser.maybeCompleteAuthSession();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const segments = useSegments();
  const router = useRouter();

  // Track if user has ever been authenticated in this mount cycle
  // This distinguishes cold-start (need to wait for deep link) from sign-out (go straight to sign-in)
  const hadSessionRef = useRef(false);
  if (session) hadSessionRef.current = true;

  // Timeout for deep link URL resolution on cold-start only
  const [urlReady, setUrlReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setUrlReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

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

  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const consumedUrlRef = useRef<string | null>(null);

  // Check if this URL looks like an auth callback
  const urlIsAuthCallback = !!(url && (url.includes("code=") || url.includes("error=")));
  // Synchronous check: if URL is an auth callback and hasn't been consumed yet, treat as processing
  const isNewAuthCallback = urlIsAuthCallback && url !== consumedUrlRef.current;

  useEffect(() => {
    if (isNewAuthCallback) {
      setIsProcessingAuth(true);
      // Safety timeout in case auth hangs
      const timer = setTimeout(() => {
        consumedUrlRef.current = url;
        setIsProcessingAuth(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [url]);

  // Once session arrives, immediately consume the URL and clear processing
  useEffect(() => {
    if (session && (isProcessingAuth || isSocialAuthInProgress())) {
      consumedUrlRef.current = url;
      setIsProcessingAuth(false);
      setSocialAuthInProgress(false);
    }
  }, [session, isProcessingAuth]);

  // Module-level flag bridges the gap when useLinkingURL() hasn't resolved yet
  const isAuthCallback = isProcessingAuth || isNewAuthCallback || isSocialAuthInProgress();

  // Detect sign-out: user had a session before, no longer has one, and not doing social auth
  const isSigningOut = hadSessionRef.current && !session && !isAuthCallback;

  if (isSigningOut) {
    // Sign-out flow: skip ALL loading states, redirect straight to sign-in
    const inAuthGroup = segments[0] === "(auth)";
    if (inAuthGroup) {
      action = "render";
    } else {
      action = "redirect";
      redirectTarget = "/(auth)/sign-in";
    }
  } else if (isSessionPending) {
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
      // Cold-start: wait briefly for URL to resolve to avoid flickering sign-in if a deep link is coming.
      if (!url && !urlReady && Platform.OS !== 'web') {
        action = "loading";
      } else {
        action = "redirect";
        redirectTarget = "/(auth)/sign-in";
      }
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
          redirectTarget = "/(org)/join-org";
        }
      } else if (status === "PENDING" || status === "REJECTED") {
        const isOnPendingScreen = inOrgGroup && segments[1] === "pending-approval";
        if (isOnPendingScreen) {
          action = "render";
        } else {
          action = "redirect";
          redirectTarget = "/(org)/pending-approval";
        }
      } else if (status === "ACTIVE") {
        // Active User
        if (inAuthGroup || inOrgGroup) {
          action = "redirect";
          redirectTarget = "/(drawer)/(tabs)"; // Redirect to root (tabs index) via explicit drawer path
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

  // Show loading overlay ONLY for auth callback processing or membership loading
  // Never show it when redirecting to sign-in (sign-out should be instant)
  const showLoadingOverlay = action === "loading" || (session && segments[0] === "(auth)");

  if (showLoadingOverlay) {
    return (
      <LoadingState
        fullPage
        title={isAuthCallback && !session ? "Completing Sign In" : "Synchronizing"}
        description={isAuthCallback && !session ? "Verifying your identity..." : "Preparing your session..."}
      />
    );
  }

  if (action === "error") {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4">
        <Text className="text-destructive">
          Failed to load membership status.
          {membershipError?.message}
        </Text>
        <Pressable onPress={() => { authClient.signOut(); queryClient.clear(); }} className="mt-4 bg-destructive p-3 rounded">
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

import { GlobalFilterProvider } from "@/context/global-filter-context";
import { queryClient, trpc, trpcClient } from "@/lib/trpc";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FullWindowOverlay } from "react-native-screens";
import { Toaster } from "sonner-native";

import { usePushNotifications } from "@/hooks/use-push-notifications";

function RootLayoutInner() {
  usePushNotifications();
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
        </Stack>
        <VersionChecker />
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
            <StorageProvider>
              <GlobalFilterProvider>
                <RootLayoutInner />
              </GlobalFilterProvider>
            </StorageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
