import { AddMortalityModal } from "@/components/cycles/add-mortality-modal";
import { CorrectAgeModal } from "@/components/cycles/correct-age-modal";
import { CorrectDocModal } from "@/components/cycles/correct-doc-modal";
import { CorrectMortalityModal } from "@/components/cycles/correct-mortality-modal";
import { CreateCycleModal } from "@/components/cycles/create-cycle-modal";
import { CycleAction, CycleCard } from "@/components/cycles/cycle-card";
import { DeleteCycleModal } from "@/components/cycles/delete-cycle-modal";
import { EndCycleModal } from "@/components/cycles/end-cycle-modal";
import { ReopenCycleModal } from "@/components/cycles/reopen-cycle-modal";
import { SellModal } from "@/components/cycles/sell-modal";
import { CreateDocOrderModal } from "@/components/orders/create-doc-order-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useFocusEffect } from "expo-router";
import { Bird, History, LayoutGrid, List, MoreHorizontal, Plus, Search, Sparkles, Table2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, View } from "react-native";

export default function CyclesScreen() {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [viewMode, setViewMode] = useState<'detailed' | 'group'>('detailed');

    // Search & history state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Modals state
    const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Header actions
    const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

    // Card Actions Modals
    const [isSellOpen, setIsSellOpen] = useState(false);
    const [isAddMortalityOpen, setIsAddMortalityOpen] = useState(false);
    const [isEditDocOpen, setIsEditDocOpen] = useState(false);
    const [isEditAgeOpen, setIsEditAgeOpen] = useState(false);
    const [isCorrectMortalityOpen, setIsCorrectMortalityOpen] = useState(false);
    const [isEndCycleOpen, setIsEndCycleOpen] = useState(false);

    const handleCycleAction = useCallback((action: CycleAction, cycle: any) => {
        setSelectedCycle(cycle);
        switch (action) {
            case 'sell': setIsSellOpen(true); break;
            case 'add_mortality': setIsAddMortalityOpen(true); break;
            case 'edit_doc': setIsEditDocOpen(true); break;
            case 'edit_age': setIsEditAgeOpen(true); break;
            case 'correct_mortality': setIsCorrectMortalityOpen(true); break;
            case 'end_cycle': setIsEndCycleOpen(true); break;
            case 'reopen': setIsReopenModalOpen(true); break;
            case 'delete': setIsDeleteModalOpen(true); break;
        }
    }, []);

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
            pageSize: 100,
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
    const historyItems = historyQuery.data?.items || [];
    const historyCount = historyQuery.data?.total ?? 0;

    // Filter active cycles by search
    const filteredActiveCycles = useMemo(() => {
        if (!debouncedSearch) return activeCycles;
        const q = debouncedSearch.toLowerCase();
        return activeCycles.filter((c: any) =>
            (c.farmerName?.toLowerCase().includes(q)) ||
            (c.name?.toLowerCase().includes(q))
        );
    }, [activeCycles, debouncedSearch]);

    // Group cycles by farmer for Group view
    const groupedCycles = useMemo(() => {
        const items = activeTab === 'active' ? filteredActiveCycles : historyItems;
        const groups: Record<string, { farmerName: string; cycles: any[] }> = {};
        for (const c of items) {
            const key = c.farmerName ?? c.name ?? 'Unknown';
            if (!groups[key]) {
                groups[key] = { farmerName: key, cycles: [] };
            }
            groups[key].cycles.push(c);
        }
        return Object.values(groups);
    }, [activeTab, filteredActiveCycles, historyItems]);

    const renderHistoryFooter = () => {
        if (!historyQuery.isFetching) return null;
        return (
            <View className="py-4 items-center">
                <ActivityIndicator size="small" color="hsl(var(--primary))" />
            </View>
        );
    };

    const renderEmpty = () => {
        const query = activeTab === 'active' ? activeQuery : historyQuery;
        if (query.isLoading) return null;

        return (
            <View className="flex-1 items-center justify-center p-8 mt-20">
                <View className="w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
                    <Icon as={Search} size={24} className="text-muted-foreground" />
                </View>
                <Text className="text-lg font-bold text-foreground text-center mb-2">
                    {activeTab === 'active' ? 'No active cycles' : 'No history found'}
                </Text>
                <Text className="text-muted-foreground text-center">
                    {searchQuery
                        ? "Try adjusting your search terms"
                        : activeTab === 'active'
                            ? "Active cycles will appear here when started"
                            : "There are no completed cycles yet."}
                </Text>
            </View>
        );
    };

    const currentItems = activeTab === 'active' ? filteredActiveCycles : historyItems;
    const isLoading = activeTab === 'active'
        ? (activeQuery.isLoading && !activeQuery.isFetching)
        : (historyQuery.isLoading && !historyQuery.isFetching);
    const isFetching = activeTab === 'active' ? activeQuery.isFetching : historyQuery.isFetching;

    return (
        <View className='flex-1 bg-background'>
            <ScreenHeader title='Cycles' />

            <View className="px-4 pt-2 pb-1">
                {/* Title and Actions */}
                <View className="flex-row items-end justify-between mb-0.5">
                    <View className="flex-1">
                        <Text className="text-2xl font-black text-foreground mb-0.5">Production Cycles</Text>
                        <Text className="text-xs text-muted-foreground opacity-70 mb-3">
                            Manage all your production cycles.
                        </Text>
                    </View>
                </View>

                {/* Header Buttons Suite */}
                <View className="flex-row items-center gap-2 mb-4">
                    <Button variant="outline" size="sm" className="h-10 border-border/50 bg-card rounded-xl px-4 flex-row gap-2" onPress={() => Alert.alert("Not Implemented", "Bulk import is not available on mobile yet.")}>
                        <Icon as={Sparkles} size={16} className="text-yellow-500" />
                        <Text className="text-foreground font-bold">Import</Text>
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 border-border/50 bg-card rounded-xl px-4 flex-row gap-2" onPress={() => setIsCreateOrderOpen(true)}>
                        <Icon as={Bird} size={16} className="text-blue-500" />
                        <Text className="text-foreground font-bold">Order</Text>
                    </Button>
                    <Button size="sm" className="h-10 bg-muted rounded-xl px-4 flex-row gap-2" onPress={() => setIsCreateCycleOpen(true)}>
                        <Icon as={Plus} size={16} className="text-foreground" />
                        <Text className="text-foreground font-bold">Start</Text>
                    </Button>
                </View>

                {/* Sync Button */}


                {/* Tabs */}
                <View className="flex-row bg-muted/50 rounded-xl p-1 mb-3">
                    <Pressable
                        onPress={() => setActiveTab('active')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${activeTab === 'active' ? 'bg-card dark:bg-zinc-800 border border-border/50' : 'border border-transparent'}`}
                    >
                        <Icon as={List} size={14} className={activeTab === 'active' ? "text-foreground" : "text-muted-foreground"} />
                        <Text className={`text-xs font-black uppercase ${activeTab === 'active' ? "text-foreground" : "text-muted-foreground"}`}>
                            Active Cycles
                        </Text>
                        <View className={`rounded-full px-1.5 py-0.5 ${activeTab === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Text className={`text-[10px] font-black ${activeTab === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>{activeCount}</Text>
                        </View>
                    </Pressable>
                    <Pressable
                        onPress={() => setActiveTab('history')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${activeTab === 'history' ? 'bg-card dark:bg-zinc-800 border border-border/50' : 'border border-transparent'}`}
                    >
                        <Icon as={History} size={14} className={activeTab === 'history' ? "text-foreground" : "text-muted-foreground"} />
                        <Text className={`text-xs font-black uppercase ${activeTab === 'history' ? "text-foreground" : "text-muted-foreground"}`}>
                            History
                        </Text>
                        {historyCount > 0 && (
                            <View className={`rounded-full px-1.5 py-0.5 ${activeTab === 'history' ? 'bg-primary/10' : 'bg-muted'}`}>
                                <Text className={`text-[10px] font-black ${activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'}`}>{historyCount}</Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {/* Search */}
                <View className="relative flex-row items-center mb-3">
                    <View className="absolute left-3 z-10">
                        <Icon as={Search} size={18} className="text-muted-foreground" />
                    </View>
                    <Input
                        placeholder="Search by farmer, officer or cycle..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 pl-10 h-10 bg-muted/50 border-0"
                    />
                </View>

                {/* View Mode Toggle */}
                <View className="flex-row gap-2 mb-2 p-1 bg-muted/50 rounded-2xl">
                    <Pressable
                        onPress={() => setViewMode('detailed')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${viewMode === 'detailed' ? 'bg-card dark:bg-zinc-800 border border-border/50' : 'border border-transparent'}`}
                    >
                        <Icon as={Table2} size={14} className={viewMode === 'detailed' ? "text-foreground" : "text-muted-foreground"} />
                        <Text className={`text-xs font-bold ${viewMode === 'detailed' ? "text-foreground" : "text-muted-foreground"}`}>Detailed</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setViewMode('group')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl ${viewMode === 'group' ? 'bg-card dark:bg-zinc-800 border border-border/50' : 'border border-transparent'}`}
                    >
                        <Icon as={LayoutGrid} size={14} className={viewMode === 'group' ? "text-foreground" : "text-muted-foreground"} />
                        <Text className={`text-xs font-bold ${viewMode === 'group' ? "text-foreground" : "text-muted-foreground"}`}>Group</Text>
                    </Pressable>
                </View>
            </View>

            {isLoading ? (
                <View className='flex-1 items-center justify-center'>
                    <ActivityIndicator size='large' color='hsl(var(--primary))' />
                    <Text className='mt-4 text-muted-foreground font-medium'>Fetching cycles...</Text>
                </View>
            ) : viewMode === 'group' ? (
                <FlatList
                    data={groupedCycles}
                    keyExtractor={(item) => item.farmerName}
                    renderItem={({ item: group }) => (
                        <View className="mx-4 mb-4 bg-card border border-border/50 rounded-2xl overflow-hidden">
                            {/* Group Header */}
                            <View className="flex-row items-center justify-between p-4 border-b border-border/20">
                                <Text className="font-black text-base text-foreground uppercase flex-1 pr-4" numberOfLines={3}>
                                    {group.farmerName}
                                </Text>
                                <View className="flex-row items-center">
                                    <View className="h-6 w-px bg-border/50 mr-3" />
                                    <View className="bg-muted/50 border border-border/50 rounded-xl px-3 py-1.5 mt-1 active:bg-muted">
                                        <Text className="text-xs font-black text-foreground text-center">{group.cycles.length}</Text>
                                        <Text className="text-[8px] font-bold text-muted-foreground uppercase text-center">{group.cycles.length === 1 ? 'Cycle' : 'Cycles'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Cycles within group */}
                            {group.cycles.map((cycle: any, idx: number) => (
                                <Pressable
                                    key={cycle.id}
                                    onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                                    className="active:bg-muted/50"
                                >
                                    <View className={`px-4 py-4 ${idx < group.cycles.length - 1 ? 'border-b border-border/20' : ''}`}>
                                        {/* Breed + Date + Menu */}
                                        <View className="flex-row items-center justify-between mb-2">
                                            <View className="flex-row items-center gap-2">
                                                {cycle.birdType && (
                                                    <View className="bg-amber-500/10 border border-amber-500/20 rounded-md px-1.5 py-0.5">
                                                        <Text className="text-[8px] font-black text-amber-600 uppercase">{cycle.birdType}</Text>
                                                    </View>
                                                )}
                                                <Text className="text-xs text-muted-foreground">{formatDate(cycle.createdAt)}</Text>
                                            </View>
                                            <Pressable className="p-1">
                                                <Icon as={MoreHorizontal} size={16} className="text-muted-foreground" />
                                            </Pressable>
                                        </View>

                                        {/* Stats Row */}
                                        <CycleStatsRow cycle={cycle} />
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    contentContainerClassName="pt-2 pb-20"
                    refreshing={isFetching && !isLoading}
                    onRefresh={() => activeTab === 'active' ? activeQuery.refetch() : historyQuery.refetch()}
                    ListEmptyComponent={renderEmpty}
                />
            ) : (
                <FlatList
                    data={currentItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <CycleCard
                            cycle={{
                                ...item,
                                intake: Number(item.intake ?? 0)
                            }}
                            onPress={() => router.push(`/cycle/${item.id}` as any)}
                            onAction={handleCycleAction}
                        />
                    )}
                    contentContainerClassName='p-4 pt-2 pb-20'
                    onRefresh={() => activeTab === 'active' ? activeQuery.refetch() : historyQuery.refetch()}
                    refreshing={isFetching && !isLoading}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={activeTab === 'history' ? renderHistoryFooter : undefined}
                />
            )}

            {selectedCycle && (
                <>
                    {/* Active Modals */}
                    <SellModal
                        cycleId={selectedCycle.id}
                        farmerId={selectedCycle.farmerId || ''}
                        cycleName={selectedCycle.name}
                        farmerName={selectedCycle.farmerName || selectedCycle.name || ""}
                        farmerLocation={selectedCycle.farmerLocation || ''}
                        farmerMobile={selectedCycle.farmerMobile || ''}
                        cycleAge={selectedCycle.age || 0}
                        doc={selectedCycle.doc}
                        mortality={selectedCycle.mortality || 0}
                        birdsSold={selectedCycle.birdsSold || 0}
                        intake={parseFloat(String(selectedCycle.intake || 0))}
                        startDate={selectedCycle.createdAt ? new Date(selectedCycle.createdAt) : new Date()}
                        open={isSellOpen}
                        onOpenChange={setIsSellOpen}
                    />

                    <AddMortalityModal
                        cycleId={selectedCycle.id}
                        farmerName={selectedCycle.farmerName || selectedCycle.name}
                        open={isAddMortalityOpen}
                        onOpenChange={setIsAddMortalityOpen}
                    />

                    <CorrectDocModal
                        cycleId={selectedCycle.id}
                        currentDoc={parseInt(String(selectedCycle.doc || 0))}
                        open={isEditDocOpen}
                        onOpenChange={setIsEditDocOpen}
                    />

                    <CorrectAgeModal
                        cycleId={selectedCycle.id}
                        currentAge={selectedCycle.age}
                        open={isEditAgeOpen}
                        onOpenChange={setIsEditAgeOpen}
                    />

                    <CorrectMortalityModal
                        cycleId={selectedCycle.id}
                        currentMortality={selectedCycle.mortality || 0}
                        open={isCorrectMortalityOpen}
                        onOpenChange={setIsCorrectMortalityOpen}
                    />

                    <EndCycleModal
                        cycle={selectedCycle}
                        farmerName={selectedCycle.farmerName || selectedCycle.name}
                        open={isEndCycleOpen}
                        onOpenChange={setIsEndCycleOpen}
                    />

                    {/* History Modals */}
                    <ReopenCycleModal
                        open={isReopenModalOpen}
                        onOpenChange={setIsReopenModalOpen}
                        historyId={selectedCycle.id}
                        cycleName={selectedCycle.cycle?.name || selectedCycle.name || "Unknown Cycle"}
                        onSuccess={() => {
                            historyQuery.refetch();
                            activeQuery.refetch();
                        }}
                    />

                    <DeleteCycleModal
                        open={isDeleteModalOpen}
                        onOpenChange={setIsDeleteModalOpen}
                        historyId={selectedCycle.id}
                        cycleName={selectedCycle.cycle?.name || selectedCycle.name || "Unknown Cycle"}
                        onSuccess={() => historyQuery.refetch()}
                    />
                </>
            )}

            {/* Global Modals */}
            <CreateCycleModal
                open={isCreateCycleOpen}
                onOpenChange={setIsCreateCycleOpen}
                orgId={membership?.orgId ?? ""}
                onSuccess={() => activeQuery.refetch()}
            />

            <CreateDocOrderModal
                open={isCreateOrderOpen}
                onOpenChange={setIsCreateOrderOpen}
                orgId={membership?.orgId ?? ""}
                onSuccess={() => { /* maybe refetch some pending orders list. nothing needed yet. */ }}
            />
        </View>
    );
}

function CycleStatsRow({ cycle }: { cycle: any }) {
    const liveBirds = Math.max(0, cycle.doc - cycle.mortality - (cycle.birdsSold || 0));
    const feed = Number(cycle.intake ?? 0);
    const hasFeed = feed > 0;

    return (
        <View className="flex-row items-center justify-between mt-2">
            {/* Age */}
            <View className="items-start">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 leading-tight">Age</Text>
                <View className="flex-row items-baseline gap-1 mt-0.5">
                    <Text className="text-xl font-black text-foreground">{cycle.age}</Text>
                    <Text className="text-xs font-bold text-muted-foreground">d</Text>
                </View>
            </View>

            <View className="flex-row items-center gap-2">
                {/* DOC */}
                <View className="items-center border border-border/40 bg-[#1A1A1A] rounded-xl px-4 py-2 min-w-[85px] justify-center">
                    <Text className="text-[10px] font-black text-[#5C89A3] uppercase mb-0.5">DOC</Text>
                    <View className="flex-row items-center gap-1.5">
                        <Text className="text-[10px] text-muted-foreground/50">🐣</Text>
                        <Text className="text-base font-black text-foreground">{cycle.doc.toLocaleString()}</Text>
                    </View>
                    <Text className="text-[9px] text-[#5C89A3] mt-1 font-medium">Live: {liveBirds.toLocaleString()}</Text>
                </View>

                {/* Feed */}
                <View className={`items-center rounded-xl px-4 py-2 min-w-[85px] h-[64px] justify-center ${hasFeed ? 'border border-[#F59E0B]/20 bg-[#F59E0B]/5' : 'border border-border/40 bg-[#1A1A1A]'}`}>
                    <Text className={`text-[10px] font-black uppercase mb-0.5 ${hasFeed ? 'text-[#F59E0B]' : 'text-muted-foreground'}`}>Feed</Text>
                    <View className="flex-row items-center gap-1.5">
                        <Text className="text-[10px] opacity-70">🌾</Text>
                        <Text className={`text-base font-black ${hasFeed ? 'text-[#F59E0B]' : 'text-muted-foreground opacity-40'}`}>{feed.toFixed(1)}</Text>
                    </View>
                </View>
            </View>

            {/* Deaths */}
            <View className="items-end">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase opacity-80 leading-tight">Deaths</Text>
                <Text className={`text-base font-black mt-1 ${cycle.mortality > 0 ? 'text-destructive' : 'text-muted-foreground opacity-40'}`}>
                    {cycle.mortality || '–'}
                </Text>
            </View>
        </View>
    );
}

function formatDate(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
        return '';
    }
}
