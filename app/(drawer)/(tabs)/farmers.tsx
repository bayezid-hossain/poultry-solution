import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { BulkImportModal } from "@/components/farmers/bulk-import-modal";
import { DeleteFarmerModal } from "@/components/farmers/delete-farmer-modal";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { FarmerCard } from "@/components/farmers/farmer-card";
import { RegisterFarmerModal } from "@/components/farmers/register-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { RestoreFarmerModal } from "@/components/farmers/restore-farmer-modal";
import { TransferStockModal } from "@/components/farmers/transfer-stock-modal";
import { CreateFeedOrderModal } from "@/components/orders/create-feed-order-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { router, useFocusEffect } from "expo-router";
import { Archive, ChevronDown, ChevronUp, List, Plus, Search, ShoppingCart, Sparkles, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

export default function FarmersScreen() {
    const [search, setSearch] = useState("");
    const [actionsExpanded, setActionsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    // Force active tab if not management
    if (!isManagement && activeTab === 'archived') {
        setActiveTab('active');
    }

    // Modal States
    const [restockingFarmer, setRestockingFarmer] = useState<{ id: string; name: string } | null>(null);
    const [deleteFarmer, setDeleteFarmer] = useState<{ id: string; name: string, organizationId: string } | null>(null);
    const [transferringFarmer, setTransferringFarmer] = useState<{ id: string; name: string } | null>(null);
    const [editingFarmer, setEditingFarmer] = useState<any | null>(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isFeedOrderOpen, setIsFeedOrderOpen] = useState(false);
    const [restoringFarmer, setRestoringFarmer] = useState<{ id: string; name: string } | null>(null);

    // Officer mode → officer route (always scoped to current user)
    const officerQuery = trpc.officer.farmers.listWithStock.useQuery(
        {
            orgId: membership?.orgId ?? "",
            search: search,
            pageSize: 50,
        },
        { enabled: !!membership?.orgId && !isManagement }
    );

    // Management mode → management route (supports officerId filter + shows all)
    const mgmtQuery = trpc.management.farmers.getMany.useQuery(
        {
            orgId: membership?.orgId ?? "",
            search: search,
            pageSize: 50,
            status: activeTab === 'archived' ? 'deleted' : 'active',
            officerId: selectedOfficerId || undefined,
        },
        { enabled: !!membership?.orgId && isManagement }
    );

    const data = isManagement ? mgmtQuery.data : officerQuery.data;
    const isLoading = isManagement ? mgmtQuery.isLoading : officerQuery.isLoading;
    const refetch = isManagement ? mgmtQuery.refetch : officerQuery.refetch;

    useFocusEffect(
        useCallback(() => {
            if (membership?.orgId) {
                refetch();
            }
        }, [membership?.orgId, refetch])
    );

    const farmers = data?.items ?? [];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Farmers" />

            {/* Controls Section */}
            <View className="bg-card border-b border-border/50 px-3 pb-3 pt-2">
                {isManagement && (
                    <View className="mb-3">
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    </View>
                )}
                {/* Search Bar */}
                <View className="relative flex-row items-center gap-2">
                    <View className="flex-1 relative">
                        <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                            <Icon as={Search} size={18} className="text-muted-foreground opacity-50" />
                        </View>
                        <Input
                            placeholder="Search inventories..."
                            className="pl-12 pr-12 h-12 bg-muted/30 border-border/50 rounded-2xl text-base font-bold"
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                        />
                        {search.length > 0 && (
                            <Pressable
                                onPress={() => setSearch("")}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full active:bg-muted/50 z-20"
                            >
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        onPress={() => setActionsExpanded(!actionsExpanded)}
                        className="h-12 w-12 rounded-2xl bg-muted/30 border border-border/50 items-center justify-center active:bg-muted"
                    >
                        <Icon as={actionsExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                    </Pressable>
                </View>

                {/* Collapsible Action Buttons */}
                {actionsExpanded && (
                    <View className="flex-row gap-3 mt-3">
                        <Pressable
                            onPress={() => setIsBulkImportOpen(true)}
                            className="flex-1 bg-emerald-500/10 h-12 rounded-2xl items-center justify-center flex-row gap-2 border border-emerald-500/20 active:bg-emerald-500/20"
                        >
                            <Icon as={Sparkles} size={16} className="text-emerald-500" />
                            <Text className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Import</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setIsFeedOrderOpen(true)}
                            className="flex-1 bg-muted/50 h-12 rounded-2xl items-center justify-center flex-row gap-2 border border-border active:bg-muted"
                        >
                            <Icon as={ShoppingCart} size={16} className="text-muted-foreground" />
                            <Text className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">Order</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setIsRegisterModalOpen(true)}
                            className="flex-1 bg-primary h-12 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90"
                        >
                            <Icon as={Plus} size={16} className="text-white" />
                            <Text className="text-white font-black text-[10px] uppercase tracking-widest">Register</Text>
                        </Pressable>
                    </View>
                )}

                {/* Segmented Tabs - Only for Management */}
                {isManagement && (
                    <View className='mt-6 flex-row gap-2'>
                        <Button
                            variant={activeTab === 'active' ? 'default' : 'outline'}
                            className='flex-1 flex-row gap-2 h-11'
                            onPress={() => setActiveTab('active')}
                        >
                            <Icon as={List} className={activeTab === 'active' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                            <Text className={`font-bold ${activeTab === 'active' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                Active ({data?.total || 0})
                            </Text>
                        </Button>
                        <Button
                            variant={activeTab === 'archived' ? 'default' : 'outline'}
                            className='flex-1 flex-row gap-2 h-11'
                            onPress={() => setActiveTab('archived')}
                        >
                            <Icon as={Archive} className={activeTab === 'archived' ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                            <Text className={`font-bold ${activeTab === 'archived' ? "text-primary-foreground" : "text-muted-foreground"}`}>
                                Archived
                            </Text>
                        </Button>
                    </View>
                )}
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-[10px] animate-pulse">Synchronizing Data...</Text>
                </View>
            ) : (
                <FlatList
                    data={farmers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <FarmerCard
                            farmer={item}
                            activeConsumption={item.cycles?.filter((c: any) => c.status === 'active').reduce((acc: number, c: any) => acc + (parseFloat(c.intake) || 0), 0) || 0}
                            onPress={() => router.push(`/farmer/${item.id}` as any)}
                            onRestock={activeTab === 'archived' ? undefined : () => setRestockingFarmer({ id: item.id, name: item.name })}
                            onTransfer={activeTab === 'archived' ? undefined : () => setTransferringFarmer({ id: item.id, name: item.name })}
                            onDelete={activeTab === 'archived' ? undefined : () => setDeleteFarmer({ id: item.id, name: item.name, organizationId: item.organizationId })}
                            onEdit={activeTab === 'archived' ? undefined : () => setEditingFarmer(item)}
                            onRestore={activeTab === 'archived' ? () => setRestoringFarmer({ id: item.id, name: item.name }) : undefined}
                        />
                    )}
                    contentContainerClassName="p-4 pt-4 pb-20" // Extra padding for tab bar
                    onRefresh={refetch}
                    refreshing={isLoading}
                    ListEmptyComponent={
                        <View className="items-center justify-center p-20 opacity-30 mt-10">
                            <Icon as={Search} size={64} className="text-muted-foreground mb-6" />
                            <Text className="text-center text-xl font-black uppercase tracking-widest">Empty State</Text>
                            <Text className="text-center text-xs text-muted-foreground mt-2 font-medium">No inventory records found</Text>
                        </View>
                    }
                />
            )}

            {/* Modals */}
            {restockingFarmer && (
                <RestockModal
                    open={!!restockingFarmer}
                    onOpenChange={(open) => !open && setRestockingFarmer(null)}
                    farmerId={restockingFarmer.id}
                    farmerName={restockingFarmer.name}
                    onSuccess={() => refetch()}
                />
            )}
            {deleteFarmer && (
                <DeleteFarmerModal
                    open={!!deleteFarmer}
                    onOpenChange={(open) => !open && setDeleteFarmer(null)}
                    farmerId={deleteFarmer.id}
                    organizationId={deleteFarmer.organizationId}
                    farmerName={deleteFarmer.name}
                />)}
            {transferringFarmer && (
                <TransferStockModal
                    open={!!transferringFarmer}
                    onOpenChange={(open) => !open && setTransferringFarmer(null)}
                    sourceFarmerId={transferringFarmer.id}
                    sourceFarmerName={transferringFarmer.name}
                    onSuccess={() => refetch()}
                />
            )}

            {editingFarmer && (
                <EditFarmerModal
                    open={!!editingFarmer}
                    onOpenChange={(open) => !open && setEditingFarmer(null)}
                    farmer={editingFarmer}
                    onSuccess={() => refetch()}
                />
            )}

            <RegisterFarmerModal
                open={isRegisterModalOpen}
                onOpenChange={setIsRegisterModalOpen}
                onSuccess={() => refetch()}
            />

            {membership?.orgId && (
                <BulkImportModal
                    open={isBulkImportOpen}
                    onOpenChange={setIsBulkImportOpen}
                    orgId={membership.orgId}
                    onSuccess={() => refetch()}
                />
            )}

            {membership?.orgId && (
                <CreateFeedOrderModal
                    open={isFeedOrderOpen}
                    onOpenChange={setIsFeedOrderOpen}
                    orgId={membership.orgId}
                    onSuccess={() => refetch()}
                />
            )}

            {restoringFarmer && membership?.orgId && (
                <RestoreFarmerModal
                    open={!!restoringFarmer}
                    onOpenChange={(open) => !open && setRestoringFarmer(null)}
                    farmerId={restoringFarmer.id}
                    farmerName={restoringFarmer.name}
                    orgId={membership.orgId}
                    onSuccess={() => refetch()}
                />
            )}

        </View>
    );
}
