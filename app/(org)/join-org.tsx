import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinOrganizationScreen() {
    const router = useRouter();
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<'MANAGER' | 'OFFICER'>('OFFICER');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const { data: organizations, isLoading: isLoadingOrgs } = trpc.auth.listOrganizations.useQuery();

    // Auto-select if only one organization is available
    useEffect(() => {
        if (organizations?.length === 1 && !selectedOrgId) {
            setSelectedOrgId(organizations[0].id);
        }
    }, [organizations]);

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

    const selectedOrg = organizations?.find(o => o.id === selectedOrgId);
    const hasMultipleOrgs = (organizations?.length ?? 0) > 1;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-5">
                <ThemedText type="title" className="mb-2 text-primary">Join Organization</ThemedText>
                <ThemedText className="mb-6 text-muted-foreground font-medium">Select an organization to join.</ThemedText>

                <ThemedText type="subtitle" className="mt-4 mb-3 text-foreground">1. Choose Organization</ThemedText>

                {isLoadingOrgs ? (
                    <ActivityIndicator size="large" className="text-primary" />
                ) : (
                    <View className="z-10">
                        {/* Dropdown Trigger */}
                        <TouchableOpacity
                            onPress={() => hasMultipleOrgs && setIsDropdownOpen(!isDropdownOpen)}
                            activeOpacity={hasMultipleOrgs ? 0.7 : 1}
                            className={`flex-row items-center justify-between p-4 rounded-xl border border-input bg-card ${!hasMultipleOrgs ? 'opacity-80' : ''}`}
                        >
                            <ThemedText className="text-foreground font-medium">
                                {selectedOrg ? selectedOrg.name : 'Select Organization...'}
                            </ThemedText>
                            {hasMultipleOrgs && (
                                <IconSymbol
                                    name={isDropdownOpen ? "chevron.up" : "chevron.down"}
                                    size={20}
                                    color="hsl(var(--muted-foreground))"
                                />
                            )}
                        </TouchableOpacity>

                        {/* Dropdown List */}
                        {isDropdownOpen && hasMultipleOrgs && (
                            <View className="mt-2 rounded-xl border border-input bg-card overflow-hidden shadow-lg">
                                {organizations?.map((org: any) => (
                                    <TouchableOpacity
                                        key={org.id}
                                        className={`p-4 border-b border-border last:border-b-0 ${selectedOrgId === org.id ? 'bg-primary/10' : ''}`}
                                        onPress={() => {
                                            setSelectedOrgId(org.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <ThemedText className={selectedOrgId === org.id ? 'text-primary font-bold' : 'text-foreground'}>
                                            {org.name}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <ThemedText type="subtitle" className={`${isDropdownOpen ? 'opacity-20' : ''} mt-6 mb-3 text-foreground`}>2. Choose Role</ThemedText>
                <View className={`${isDropdownOpen ? 'opacity-20' : ''} flex-row gap-3 mt-2`}>
                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl border border-input items-center bg-card ${selectedRole === 'OFFICER' ? 'border-primary ring-1 ring-primary' : ''
                            }`}
                        onPress={() => setSelectedRole('OFFICER')}
                        disabled={isDropdownOpen}
                    >
                        <ThemedText className={`text-foreground font-semibold ${selectedRole === 'OFFICER' ? 'text-primary' : ''}`}>
                            Officer
                        </ThemedText>
                        <ThemedText className="text-xs text-muted-foreground mt-1 text-center font-medium">Field work, data entry</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl border border-input items-center bg-card ${selectedRole === 'MANAGER' ? 'border-primary ring-1 ring-primary' : ''
                            }`}
                        onPress={() => setSelectedRole('MANAGER')}
                        disabled={isDropdownOpen}
                    >
                        <ThemedText className={`text-foreground font-semibold ${selectedRole === 'MANAGER' ? 'text-primary' : ''}`}>
                            Manager
                        </ThemedText>
                        <ThemedText className="text-xs text-muted-foreground mt-1 text-center font-medium">Oversight, reports</ThemedText>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className={`bg-primary p-4 rounded-xl items-center mt-10 shadow-sm ${(!selectedOrgId || joinMutation.isPending || isDropdownOpen) ? 'opacity-50' : 'active:opacity-90'
                        }`}
                    onPress={handleJoin}
                    disabled={!selectedOrgId || joinMutation.isPending || isDropdownOpen}
                >
                    {joinMutation.isPending ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <ThemedText className="text-primary-foreground font-bold text-base">Request to Join</ThemedText>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}
