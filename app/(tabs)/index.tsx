import { Image } from 'expo-image';
import { Platform, Pressable } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authClient } from '@/lib/auth-client';
import { Link } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { trpc } from '@/lib/trpc';
import { Text } from '@react-navigation/elements';

export default function HomeScreen() {
  const { data, isLoading, error } = trpc.auth.getSession.useQuery();
  const colorScheme = useColorScheme();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          className="h-[178px] w-[290px] absolute bottom-0 left-0"
        />
      }>
      <ThemedView className="flex-row items-center gap-2">
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* tRPC Test */}
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">tRPC Connection Status:</ThemedText>
        {isLoading ? (
          <ThemedText>Loading session...</ThemedText>
        ) : error ? (
          <ThemedText className="text-destructive">Error: {error.message}</ThemedText>
        ) : (
          <ThemedText>
            Connected! User: {data?.user?.email ?? "Not logged in"}
          </ThemedText>
        )}

      </ThemedView>

      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView className="gap-2 mb-2">
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>

      {/* Sign Out */}
      <Pressable
        onPress={() => authClient.signOut()}
        className="bg-destructive rounded-xl py-3.5 items-center mt-4 active:opacity-90"
      >
        <Text className="text-destructive-foreground text-base font-bold">Sign Out</Text>
      </Pressable>
    </ParallaxScrollView>
  );
}
