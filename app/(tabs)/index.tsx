import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/ui/text';
import { trpc } from '@/lib/trpc';
import { ActivityIndicator, ScrollView, View } from 'react-native';

export default function HomeScreen() {
  const { data, isLoading, error } = trpc.auth.getSession.useQuery();
  const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Home" />
      <ScrollView contentContainerClassName="p-5 gap-4">
        {/* Welcome */}
        <View className="gap-2">
          <Text className="text-2xl font-bold">
            Welcome{data?.user?.name ? `, ${data.user.name}` : ''}! 👋
          </Text>
          <Text variant="muted" className="text-base">
            {orgStatus?.orgName ?? 'Your Organization'}
          </Text>
        </View>

        {/* Connection Status */}
        <View className="bg-card border border-border rounded-xl p-4 mt-2">
          <Text className="font-semibold mb-2">Connection Status</Text>
          {isLoading ? (
            <ActivityIndicator size="small" className="text-primary" />
          ) : error ? (
            <Text className="text-destructive text-sm">Error: {error.message}</Text>
          ) : (
            <Text variant="muted" className="text-sm">
              ✅ Connected as {data?.user?.email ?? 'Unknown'}
            </Text>
          )}
        </View>

        {/* Role Info */}
        {orgStatus && (
          <View className="bg-card border border-border rounded-xl p-4">
            <Text className="font-semibold mb-2">Your Role</Text>
            <View className="flex-row items-center gap-2">
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-primary text-xs font-bold">{orgStatus.role}</Text>
              </View>
              <View className="bg-muted px-3 py-1 rounded-full">
                <Text className="text-muted-foreground text-xs font-bold">{orgStatus.activeMode} mode</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
