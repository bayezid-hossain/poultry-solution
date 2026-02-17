import { ThemedText } from '@/components/themed-text';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
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
        router.replace('/sign-in');
    };

    return (
        <SafeAreaView className="flex-1 bg-background justify-center p-5">
            <View className="items-center gap-5">
                <ThemedText type="title" className="text-center text-foreground">
                    {membership?.status === 'REJECTED' ? 'Request Rejected' : 'Pending Approval'}
                </ThemedText>

                <ThemedText className="text-center text-muted-foreground mb-5 font-medium">
                    {membership?.status === 'REJECTED'
                        ? "Your request to join the organization was rejected. Please contact the administrator."
                        : `You have requested to join ${membership?.orgName || 'an organization'}. Please wait for an administrator to approve your request.`}
                </ThemedText>

                <TouchableOpacity
                    className="bg-primary py-3 px-6 rounded-lg w-full items-center"
                    onPress={handleRefresh}
                >
                    <ThemedText className="text-primary-foreground font-bold">Refresh Status</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={handleSignOut}
                >
                    <ThemedText className="text-destructive">Sign Out</ThemedText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
