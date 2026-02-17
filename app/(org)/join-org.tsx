import { ThemedText } from '@/components/themed-text';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinOrganizationScreen() {
    const router = useRouter();
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<'MANAGER' | 'OFFICER'>('OFFICER');

    const { data: organizations, isLoading: isLoadingOrgs } = trpc.auth.listOrganizations.useQuery();
    const joinMutation = trpc.auth.joinOrganization.useMutation({
        onSuccess: () => {
            router.replace('/pending-approval');
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const handleJoin = () => {
        if (!selectedOrgId) return;
        joinMutation.mutate({
            orgId: selectedOrgId,
            role: selectedRole
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-5">
                <ThemedText type="title" className="mb-2">Join Organization</ThemedText>
                <ThemedText className="mb-6 text-muted-foreground">Select an organization to join.</ThemedText>

                <ThemedText type="subtitle" className="mt-4 mb-3">1. Choose Organization</ThemedText>

                {isLoadingOrgs ? (
                    <ActivityIndicator size="large" className="text-primary" />
                ) : (
                    <View className="gap-2">
                        {organizations?.map((org: any) => (
                            <TouchableOpacity
                                key={org.id}
                                className={`p-4 rounded-lg border border-border ${selectedOrgId === org.id ? 'border-primary bg-primary/10' : ''
                                    }`}
                                onPress={() => setSelectedOrgId(org.id)}
                            >
                                <ThemedText className={selectedOrgId === org.id ? 'text-primary font-bold' : ''}>
                                    {org.name}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <ThemedText type="subtitle" className="mt-4 mb-3">2. Choose Role</ThemedText>
                <View className="flex-row gap-3 mt-2">
                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-lg border border-border items-center ${selectedRole === 'OFFICER' ? 'border-primary bg-primary/10' : ''
                            }`}
                        onPress={() => setSelectedRole('OFFICER')}
                    >
                        <ThemedText className={`font-semibold ${selectedRole === 'OFFICER' ? 'text-primary font-bold' : ''}`}>
                            Officer
                        </ThemedText>
                        <ThemedText className="text-xs text-muted-foreground mt-1 text-center">Field work, data entry</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-lg border border-border items-center ${selectedRole === 'MANAGER' ? 'border-primary bg-primary/10' : ''
                            }`}
                        onPress={() => setSelectedRole('MANAGER')}
                    >
                        <ThemedText className={`font-semibold ${selectedRole === 'MANAGER' ? 'text-primary font-bold' : ''}`}>
                            Manager
                        </ThemedText>
                        <ThemedText className="text-xs text-muted-foreground mt-1 text-center">Oversight, reports</ThemedText>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className={`bg-primary p-4 rounded-lg items-center mt-8 ${(!selectedOrgId || joinMutation.isPending) ? 'opacity-50' : ''
                        }`}
                    onPress={handleJoin}
                    disabled={!selectedOrgId || joinMutation.isPending}
                >
                    {joinMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText className="text-primary-foreground font-bold text-base">Request to Join</ThemedText>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}
