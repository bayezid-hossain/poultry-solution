import { AddMortalityModal } from "@/components/cycles/add-mortality-modal";
import { BulkImportModal } from "@/components/cycles/bulk-import-modal";
import { CorrectAgeModal } from "@/components/cycles/correct-age-modal";
import { CorrectDocModal } from "@/components/cycles/correct-doc-modal";
import { CorrectMortalityModal } from "@/components/cycles/correct-mortality-modal";
import { CreateCycleModal } from "@/components/cycles/create-cycle-modal";
import { CycleAction, CycleCard } from "@/components/cycles/cycle-card";
import { DeleteCycleModal } from "@/components/cycles/delete-cycle-modal";
import { EndCycleModal } from "@/components/cycles/end-cycle-modal";
import { ReopenCycleModal } from "@/components/cycles/reopen-cycle-modal";
import { SellModal } from "@/components/cycles/sell-modal";
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { CreateDocOrderModal } from "@/components/orders/create-doc-order-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { Activity, Archive, Bird, ChevronDown, ChevronUp, History, LayoutGrid, List, Pencil, Plus, Search, ShoppingCart, Skull, Sparkles, Table2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, View } from "react-native";

export default function CyclesScreen() {
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [viewMode, setViewMode] = useState<'detailed' | 'group'>('detailed');

    // Search & history state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Header actions
    const [actionsExpanded, setActionsExpanded] = useState(false);
    const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    // Card Actions Modals
    const [isSellOpen, setIsSellOpen] = useState(false);
    const [isAddMortalityOpen, setIsAddMortalityOpen] = useState(false);
    const [isEditDocOpen, setIsEditDocOpen] = useState(false);
    const [isEditAgeOpen, setIsEditAgeOpen] = useState(false);
    const [isCorrectMortalityOpen, setIsCorrectMortalityOpen] = useState(false);
    const [isEndCycleOpen, setIsEndCycleOpen] = useState(false);

    // Group Layout Action Menu
    const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
    const [groupMenuCycle, setGroupMenuCycle] = useState<any>(null);

    const handleCycleAction = useCallback((action: CycleAction, cycle: any) => {
        setSelectedCycleId(cycle.id);
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
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Officer queries
    const officerActiveQuery = trpc.officer.cycles.listActive.useQuery(
        { orgId: membership?.orgId ?? "", pageSize: 100 },
        { enabled: !!membership?.orgId && !isManagement }
    );
    const officerHistoryQuery = trpc.officer.cycles.listPast.useQuery(
        { orgId: membership?.orgId ?? "", search: debouncedSearch, pageSize: 50 },
        { enabled: !!membership?.orgId && !isManagement && activeTab === 'history' }
    );

    // Management queries (with officerId filter)
    const mgmtActiveQuery = trpc.management.cycles.listActive.useQuery(
        { orgId: membership?.orgId ?? "", pageSize: 100, officerId: selectedOfficerId || undefined },
        { enabled: !!membership?.orgId && isManagement }
    );
    const mgmtHistoryQuery = trpc.management.cycles.listPast.useQuery(
        { orgId: membership?.orgId ?? "", search: debouncedSearch, pageSize: 50, officerId: selectedOfficerId || undefined },
        { enabled: !!membership?.orgId && isManagement && activeTab === 'history' }
    );

    const activeQuery = isManagement ? mgmtActiveQuery : officerActiveQuery;
    const historyQuery = isManagement ? mgmtHistoryQuery : officerHistoryQuery;

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

    const selectedCycle = (() => {
        if (!selectedCycleId) return null;
        const active = activeCycles.find((c: any) => c.id === selectedCycleId);
        if (active) return active;
        const archived = historyItems.find((c: any) => c.id === selectedCycleId);
        if (archived) return { ...archived, type: 'history' };
        return null;
    })();

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
                <BirdyLoader size={24} />
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
    const isLoading = activeTab === 'active' ? activeQuery.isLoading : historyQuery.isLoading;
    const isFetching = activeTab === 'active' ? activeQuery.isFetching : historyQuery.isFetching;

    return (
        <View className='flex-1 bg-background'>
            <ScreenHeader title='Cycles' />

            <View className="px-4 pt-2 pb-1">
                {isManagement && (
                    <View className="mb-3">
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    </View>
                )}
                {/* Search + Toggle */}
                <View className="relative flex-row items-center gap-2 mb-3">
                    <View className="flex-1 relative">
                        <View className="absolute left-3 z-10 top-1/2 -translate-y-1/2">
                            <Icon as={Search} size={18} className="text-muted-foreground" />
                        </View>
                        <Input
                            placeholder="Search by farmer, officer or cycle..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="flex-1 pl-10 h-10 bg-muted/50 border-0"
                        />
                    </View>
                    <Pressable
                        onPress={() => setActionsExpanded(!actionsExpanded)}
                        className="h-10 w-10 rounded-xl bg-muted/50 items-center justify-center active:bg-muted"
                    >
                        <Icon as={actionsExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                    </Pressable>
                </View>

                {/* Collapsible: Action Buttons + View Mode */}
                {actionsExpanded && (
                    <View className="mb-3 gap-3">
                        <View className="flex-row items-center gap-2">
                            <Button variant="outline" size="sm" className="h-10 border-border/50 bg-card rounded-xl px-4 flex-row gap-2" onPress={() => setIsBulkImportOpen(true)}>
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

                        <View className="flex-row gap-2 p-1 bg-muted/50 rounded-2xl">
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
                )}

                {/* Tabs - Always visible */}
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

            </View>

            {
                isLoading ? (
                    <View className='flex-1 items-center justify-center bg-background'>
                        <BirdyLoader size={48} color={"#10b981"} />
                        <Text className='mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs'>Loading Cycles...</Text>
                    </View>
                ) : viewMode === 'group' ? (
                    <View className="flex-1">
                        {isFetching && !isLoading && (
                            <LoadingState fullPage title="Synchronizing" description="Updating cycle data..." />
                        )}
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
                                            <View className="bg-muted/50 border border-border/50 rounded-xl px-3 mt-1 active:bg-muted">
                                                <Text className="text-xs font-black text-foreground text-center">{group.cycles.length}</Text>
                                                <Text className="text-[8px] font-bold text-muted-foreground uppercase text-center">{group.cycles.length === 1 ? 'Cycle' : 'Cycles'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Cycles within group */}
                                    <View className="bg-muted/5 py-1 px-1.5">
                                        {group.cycles.map((cycle: any, idx: number) => (
                                            <View key={cycle.id} className={idx < group.cycles.length - 1 ? "border-b border-border/30 pb-1 mb-1" : ""}>
                                                <CycleCard
                                                    isGrouped={true}
                                                    cycle={{
                                                        ...cycle,
                                                        intake: Number(cycle.intake ?? 0),
                                                        farmerId: cycle.farmerId
                                                    }}
                                                    onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                                                    onAction={handleCycleAction}
                                                />
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                            contentContainerClassName="pt-2 pb-20"
                            refreshing={false}
                            onRefresh={() => activeTab === 'active' ? activeQuery.refetch() : historyQuery.refetch()}
                            ListEmptyComponent={renderEmpty}
                        />
                    </View>
                ) : (
                    <View className="flex-1">
                        {isFetching && !isLoading && (
                            <LoadingState fullPage title="Synchronizing" description="Updating cycle data..." />
                        )}
                        <FlatList
                            data={currentItems}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <CycleCard
                                    cycle={{
                                        ...item,
                                        intake: Number(item.intake ?? 0),
                                        farmerId: item.farmerId
                                    }}
                                    onPress={() => router.push(`/cycle/${item.id}` as any)}
                                    onAction={handleCycleAction}
                                />
                            )}
                            contentContainerClassName='p-4 pt-2 pb-20'
                            onRefresh={() => activeTab === 'active' ? activeQuery.refetch() : historyQuery.refetch()}
                            refreshing={false}
                            ListEmptyComponent={renderEmpty}
                            ListFooterComponent={activeTab === 'history' ? renderHistoryFooter : undefined}
                        />
                    </View>
                )
            }

            {
                selectedCycle && (
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
                            onSuccess={activeQuery.refetch}
                        />

                        <AddMortalityModal
                            cycleId={selectedCycle.id}
                            startDate={selectedCycle.createdAt ? new Date(selectedCycle.createdAt) : null}
                            farmerName={selectedCycle.farmerName || selectedCycle.name}
                            open={isAddMortalityOpen}
                            onOpenChange={setIsAddMortalityOpen}
                            onSuccess={activeQuery.refetch}
                        />

                        <CorrectDocModal
                            cycleId={selectedCycle.id}
                            currentDoc={parseInt(String(selectedCycle.doc || 0))}
                            open={isEditDocOpen}
                            onOpenChange={setIsEditDocOpen}
                            onSuccess={activeQuery.refetch}
                        />

                        <CorrectAgeModal
                            cycleId={selectedCycle.id}
                            currentAge={selectedCycle.age}
                            open={isEditAgeOpen}
                            onOpenChange={setIsEditAgeOpen}
                            onSuccess={activeQuery.refetch}
                        />

                        <CorrectMortalityModal
                            cycleId={selectedCycle.id}
                            open={isCorrectMortalityOpen}
                            onOpenChange={setIsCorrectMortalityOpen}
                            onSuccess={activeQuery.refetch}
                        />

                        <EndCycleModal
                            cycle={selectedCycle}
                            farmerName={selectedCycle.farmerName || selectedCycle.name}
                            open={isEndCycleOpen}
                            onOpenChange={setIsEndCycleOpen}
                            onRecordSale={() => setIsSellOpen(true)}
                            onSuccess={activeQuery.refetch}
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
                )
            }

            {/* Global Modals */}
            <BulkImportModal
                open={isBulkImportOpen}
                onOpenChange={setIsBulkImportOpen}
                orgId={membership?.orgId ?? ""}
                onSuccess={() => {
                    activeQuery.refetch();
                    historyQuery.refetch();
                }}
            />

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

            {/* Group View Actions Modal */}
            <Modal
                transparent
                visible={isGroupMenuOpen}
                animationType="fade"
                onRequestClose={() => setIsGroupMenuOpen(false)}
            >
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setIsGroupMenuOpen(false)}>
                    <Pressable className="bg-card rounded-t-3xl pb-8 overflow-hidden border-t border-border/50" onPress={(e) => e.stopPropagation()}>
                        <View className="items-center py-4">
                            <View className="w-12 h-1.5 bg-muted rounded-full" />
                        </View>
                        <View className="px-6 pb-2">
                            <Text className="text-lg font-black text-foreground mb-4">Cycle Actions</Text>
                            {groupMenuCycle && (
                                groupMenuCycle.status === 'active' ? (
                                    <>
                                        <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsGroupMenuOpen(false); handleCycleAction('sell', groupMenuCycle); }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={ShoppingCart} size={20} className="text-primary" /></View>
                                            <Text className="text-base font-bold text-foreground">Sell Birds</Text>
                                        </Pressable>
                                        <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsGroupMenuOpen(false); handleCycleAction('add_mortality', groupMenuCycle); }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={Skull} size={20} className="text-foreground" /></View>
                                            <Text className="text-base font-medium text-foreground">Add Mortality</Text>
                                        </Pressable>
                                        <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${(groupMenuCycle?.birdsSold || 0) > 0 ? 'opacity-50' : ''}`} onPress={() => { if ((groupMenuCycle?.birdsSold || 0) === 0) { setIsGroupMenuOpen(false); handleCycleAction('edit_doc', groupMenuCycle); } }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={Pencil} size={20} className="text-foreground" /></View>
                                            <Text className="text-base font-medium text-foreground">Edit Initial Birds (DOC)</Text>
                                        </Pressable>
                                        <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${(groupMenuCycle?.birdsSold || 0) > 0 ? 'opacity-50' : ''}`} onPress={() => { if ((groupMenuCycle?.birdsSold || 0) === 0) { setIsGroupMenuOpen(false); handleCycleAction('edit_age', groupMenuCycle); } }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={Activity} size={20} className="text-foreground" /></View>
                                            <Text className="text-base font-medium text-foreground">Edit Age</Text>
                                        </Pressable>
                                        <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${(groupMenuCycle?.birdsSold || 0) > 0 ? 'opacity-50' : ''}`} onPress={() => { if ((groupMenuCycle?.birdsSold || 0) === 0) { setIsGroupMenuOpen(false); handleCycleAction('correct_mortality', groupMenuCycle); } }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={Pencil} size={20} className="text-foreground" /></View>
                                            <Text className="text-base font-medium text-foreground">Correct Total Mortality</Text>
                                        </Pressable>
                                        <Pressable className="flex-row items-center py-4 mt-2 active:bg-red-500/10 rounded-xl" onPress={() => { setIsGroupMenuOpen(false); handleCycleAction('end_cycle', groupMenuCycle); }}>
                                            <View className="w-8 items-center justify-center mr-3"><Icon as={Archive} size={20} className="text-destructive" /></View>
                                            <Text className="text-base font-bold text-destructive">End Cycle</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-sm text-muted-foreground mb-4">You must open this from the History cycles page to reopen or delete.</Text>
                                    </>
                                )
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View >
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
