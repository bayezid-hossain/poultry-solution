import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from '@/components/ui/text';
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

    const selectedOrg = organizations?.find((o: any) => o.id === selectedOrgId);
    const hasMultipleOrgs = (organizations?.length ?? 0) > 1;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-5">
                <Text variant="h3" className="mb-2 text-primary">Join Organization</Text>
                <Text variant="muted" className="mb-6 font-medium">Select an organization to join.</Text>

                <Text className="text-lg font-semibold mt-4 mb-3">1. Choose Organization</Text>

                {isLoadingOrgs ? (
                    <View className="py-6 items-center justify-center">
                        <BirdyLoader size={48} color={"#10b981"} />
                        <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Finding Organizations...
                        </Text>
                    </View>
                ) : (
                    <View className="z-10">
                        {/* Dropdown Trigger */}
                        <TouchableOpacity
                            onPress={() => hasMultipleOrgs && setIsDropdownOpen(!isDropdownOpen)}
                            activeOpacity={hasMultipleOrgs ? 0.7 : 1}
                            className={`flex-row items-center justify-between p-4 rounded-xl border border-input bg-card ${!hasMultipleOrgs ? 'opacity-80' : ''}`}
                        >
                            <Text className="font-medium">
                                {selectedOrg ? selectedOrg.name : 'Select Organization...'}
                            </Text>
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
                            <Card className="mt-2 overflow-hidden shadow-lg p-0">
                                {organizations?.map((org: any) => (
                                    <TouchableOpacity
                                        key={org.id}
                                        className={`p-4 border-b border-border last:border-b-0 ${selectedOrgId === org.id ? 'bg-primary/10' : ''}`}
                                        onPress={() => {
                                            setSelectedOrgId(org.id);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text className={selectedOrgId === org.id ? 'text-primary font-bold' : ''}>
                                            {org.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </Card>
                        )}
                    </View>
                )}

                <Text className={`${isDropdownOpen ? 'opacity-20' : ''} text-lg font-semibold mt-6 mb-3`}>2. Choose Role</Text>
                <View className={`${isDropdownOpen ? 'opacity-20' : ''} flex-row gap-3 mt-2`}>
                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl border border-input items-center bg-card ${selectedRole === 'OFFICER' ? 'border-primary ring-1 ring-primary' : ''
                            }`}
                        onPress={() => setSelectedRole('OFFICER')}
                        disabled={isDropdownOpen}
                    >
                        <Text className={`font-semibold ${selectedRole === 'OFFICER' ? 'text-primary' : ''}`}>
                            Officer
                        </Text>
                        <Text variant="muted" className="text-xs mt-1 text-center font-medium">Field work, data entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`flex-1 p-4 rounded-xl border border-input items-center bg-card ${selectedRole === 'MANAGER' ? 'border-primary ring-1 ring-primary' : ''
                            }`}
                        onPress={() => setSelectedRole('MANAGER')}
                        disabled={isDropdownOpen}
                    >
                        <Text className={`font-semibold ${selectedRole === 'MANAGER' ? 'text-primary' : ''}`}>
                            Manager
                        </Text>
                        <Text variant="muted" className="text-xs mt-1 text-center font-medium">Oversight, reports</Text>
                    </TouchableOpacity>
                </View>

                <Button
                    onPress={handleJoin}
                    disabled={!selectedOrgId || joinMutation.isPending || isDropdownOpen}
                    className="mt-10 rounded-xl"
                    size="lg"
                >
                    {joinMutation.isPending ? (
                        <ActivityIndicator color={"#ffffff"} />
                    ) : (
                        <Text className="text-primary-foreground font-bold text-base">Request to Join</Text>
                    )}
                </Button>

            </ScrollView>
        </SafeAreaView>
    );
}
