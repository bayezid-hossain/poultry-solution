import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PendingApprovalScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const { data: membership, isLoading, refetch } = trpc.auth.getMyMembership.useQuery();

    const handleRefresh = async () => {
        const result = await refetch();
        if (result.data?.status === 'ACTIVE') {
            router.replace('/');
        }
    };

    const handleSignOut = async () => {
        await authClient.signOut();
    };

    return (
        <SafeAreaView className="flex-1 bg-background justify-center p-5">
            <View className="items-center gap-5">
                <Text variant="h3" className="text-center">
                    {membership?.status === 'REJECTED' ? 'Request Rejected' : 'Pending Approval'}
                </Text>

                <Text variant="muted" className="text-center mb-5 font-medium">
                    {membership?.status === 'REJECTED'
                        ? "Your request to join the organization was rejected. Please contact the administrator."
                        : `You have requested to join ${membership?.orgName || 'an organization'}. Please wait for an administrator to approve your request.`}
                </Text>

                <Button
                    onPress={handleRefresh}
                    className="w-full rounded-lg"
                    size="lg"
                >
                    <Text className="text-primary-foreground font-bold">Refresh Status</Text>
                </Button>

                <Button
                    variant="ghost"
                    onPress={handleSignOut}
                >
                    <Text className="text-destructive">Sign Out</Text>
                </Button>
            </View>
        </SafeAreaView>
    );
}
