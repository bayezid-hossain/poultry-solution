import { CycleCard } from "@/components/cycles/cycle-card";
import { DeleteCycleModal } from "@/components/cycles/delete-cycle-modal";
import { ReopenCycleModal } from "@/components/cycles/reopen-cycle-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useFocusEffect } from "expo-router";
import { History, List, RefreshCcw, Search } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, View } from "react-native";

export default function CyclesScreen() {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    // History specific state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const activeQuery = trpc.officer.cycles.listActive.useQuery(
        {
            orgId: membership?.orgId ?? "",
            pageSize: 100, // Ensure all active cycles are fetched to match count
        },
        { enabled: !!membership?.orgId }
    );

    const historyQuery = trpc.officer.cycles.listPast.useQuery(
        {
            orgId: membership?.orgId ?? "",
            search: debouncedSearch,
            pageSize: 50,
        },
        { enabled: !!membership?.orgId && activeTab === 'history' }
    );

    // Refetch on focus to catch any changes made in detail screens
    useFocusEffect(
        useCallback(() => {
            if (activeTab === 'active') {
                activeQuery.refetch();
            } else {
                historyQuery.refetch();
            }
        }, [activeTab])
    );

    const syncMutation = trpc.officer.cycles.syncFeed.useMutation({
        onSuccess: (data) => {
            Alert.alert("Success", `Synced feed for ${data.updatedCount} cycles.`);
            activeQuery.refetch();
        },
        onError: (error) => {
            Alert.alert("Error", error.message);
        }
    });

    const activeCycles = activeQuery.data?.items ?? [];
    const activeCount = activeQuery.data?.total ?? 0;

    const renderHistoryFooter = () => {
        if (!historyQuery.isFetching) return null;
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="hsl(var(--primary))" />
            </View>
        );
    };

    const renderHistoryEmpty = () => {
        if (historyQuery.isLoading) return null;

        if (historyQuery.isError) {
            return (
                <View className="flex-1 items-center justify-center p-8 mt-20">
                    <Text className="text-destructive font-bold text-center">
                        Failed to load historical cycles. Please try again.
                    </Text>
                </View>
            );
        }

        return (
            <View className="flex-1 items-center justify-center p-8 mt-20">
                <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                    <Icon as={Search} size={24} className="text-muted-foreground" />
                </View>
                <Text className="text-lg font-bold text-foreground text-center mb-2">
                    No history found
                </Text>
                <Text className="text-muted-foreground text-center">
                    {searchQuery ? "Try adjusting your search terms" : "There are no completed cycles yet."}
                </Text>
            </View>
        );
    };

    return (
        <View className='flex-1 bg-background'>
            <ScreenHeader title='Batch Browser' />

            <View className='px-4 py-4 flex-row gap-2'>
                <Button
                    variant={activeTab === 'active' ? 'default' : 'outline'}
                    className='flex-1 flex-row gap-2 h-11'
                    onPress={() => setActiveTab('active')}
                >
                    <Icon as={List} className={activeTab === 'active' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                    <Text className={`font-bold ${activeTab === 'active' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        Active ({activeCount})
                    </Text>
                </Button>
                <Button
                    variant={activeTab === 'history' ? 'default' : 'outline'}
                    className='flex-1 flex-row gap-2 h-11'
                    onPress={() => setActiveTab('history')}
                >
                    <Icon as={History} className={activeTab === 'history' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                    <Text className={`font-bold ${activeTab === 'history' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        History
                    </Text>
                </Button>
            </View>

            {activeTab === 'active' ? (
                <>
                    {activeCycles.length > 0 && (
                        <View className="px-4 pb-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="flex-row gap-2 border border-primary/20 bg-primary/5"
                                onPress={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending}
                            >
                                {syncMutation.isPending ? (
                                    <ActivityIndicator size="small" color="hsl(var(--primary))" />
                                ) : (
                                    <Icon as={RefreshCcw} size={14} className="text-primary" />
                                )}
                                <Text className="text-xs font-bold text-primary italic uppercase">Refresh All Feed Intake</Text>
                            </Button>
                        </View>
                    )}

                    {activeQuery.isLoading && !activeQuery.isFetching ? (
                        <View className='flex-1 items-center justify-center'>
                            <ActivityIndicator size='large' color='hsl(var(--primary))' />
                            <Text className='mt-4 text-muted-foreground font-medium'>Fetching batches...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={activeCycles}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <CycleCard
                                    cycle={{
                                        ...item,
                                        intake: Number(item.intake ?? 0)
                                    }}
                                    onPress={() => router.push(`/cycle/${item.id}` as any)}
                                />
                            )}
                            contentContainerClassName='p-4 pt-0 pb-20'
                            onRefresh={() => activeQuery.refetch()}
                            refreshing={activeQuery.isFetching}
                            ListEmptyComponent={
                                <View className='items-center justify-center p-10 opacity-50 mt-10'>
                                    <Icon as={Search} size={48} className='text-muted-foreground mb-4' />
                                    <Text className='text-center text-lg font-medium'>
                                        No active cycles
                                    </Text>
                                    <Text className='text-center text-sm text-muted-foreground'>
                                        Active cycles will appear here when started
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </>
            ) : (
                <>
                    <View className="px-4 pb-3 pt-0">
                        <View className="relative flex-row items-center">
                            <View className="absolute left-3 z-10">
                                <Icon as={Search} size={18} className="text-muted-foreground" />
                            </View>
                            <Input
                                placeholder="Search farmer name..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                className="flex-1 pl-10 h-10 bg-muted/50 border-0"
                            />
                        </View>
                    </View>

                    {historyQuery.isLoading && !historyQuery.isFetching ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="hsl(var(--primary))" />
                            <Text className='mt-4 text-muted-foreground font-medium'>Fetching history...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={historyQuery.data?.items || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <CycleCard
                                    cycle={item as any}
                                    onReopen={() => {
                                        setSelectedCycle(item);
                                        setIsReopenModalOpen(true);
                                    }}
                                    onDelete={() => {
                                        setSelectedCycle(item);
                                        setIsDeleteModalOpen(true);
                                    }}
                                />
                            )}
                            contentContainerClassName="p-4 pt-0 gap-4 pb-20"
                            ListFooterComponent={renderHistoryFooter}
                            ListEmptyComponent={renderHistoryEmpty}
                            refreshing={historyQuery.isFetching && !historyQuery.isLoading}
                            onRefresh={() => historyQuery.refetch()}
                        />
                    )}

                    {selectedCycle && (
                        <>
                            <ReopenCycleModal
                                open={isReopenModalOpen}
                                onOpenChange={setIsReopenModalOpen}
                                historyId={selectedCycle.id}
                                cycleName={selectedCycle.cycle?.name || "Unknown Cycle"}
                                onSuccess={() => {
                                    historyQuery.refetch();
                                    activeQuery.refetch();
                                }}
                            />

                            <DeleteCycleModal
                                open={isDeleteModalOpen}
                                onOpenChange={setIsDeleteModalOpen}
                                historyId={selectedCycle.id}
                                cycleName={selectedCycle.cycle?.name || "Unknown Cycle"}
                                onSuccess={() => historyQuery.refetch()}
                            />
                        </>
                    )}
                </>
            )}
        </View>
    );
}
