import { BulkImportModal } from "@/components/farmers/bulk-import-modal";
import { DeleteFarmerModal } from "@/components/farmers/delete-farmer-modal";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { FarmerCard } from "@/components/farmers/farmer-card";
import { FeedOrderModal } from "@/components/farmers/feed-order-modal";
import { RegisterFarmerModal } from "@/components/farmers/register-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { TransferStockModal } from "@/components/farmers/transfer-stock-modal";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { Plus, Search, ShoppingCart, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FarmersScreen() {
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState("");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    // Modal States
    const [restockingFarmer, setRestockingFarmer] = useState<{ id: string; name: string } | null>(null);
    const [deleteFarmer, setDeleteFarmer] = useState<{ id: string; name: string, organizationId: string } | null>(null);
    const [transferringFarmer, setTransferringFarmer] = useState<{ id: string; name: string } | null>(null);
    const [editingFarmer, setEditingFarmer] = useState<any | null>(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isFeedOrderOpen, setIsFeedOrderOpen] = useState(false);
    const { data, isLoading, refetch } = trpc.officer.farmers.listWithStock.useQuery(
        {
            orgId: membership?.orgId ?? "",
            search: search,
            pageSize: 50,
        },
        {
            enabled: !!membership?.orgId,
        }
    );





    const farmers = data?.items ?? [];

    return (
        <View className="flex-1 bg-background">
            {/* Custom Header Section */}
            <View
                style={{ paddingTop: insets.top + 10 }}
                className="bg-card border-b border-border/50 px-6 pb-6"
            >
                <View className="flex-row justify-between items-start mb-6">
                    <View>
                        <Text className="text-3xl font-black text-foreground tracking-tighter uppercase">Main Stock</Text>
                        <Text className="text-3xl font-black text-primary tracking-tighter uppercase -mt-1">Inventory</Text>
                        <Text className="text-xs text-muted-foreground font-medium mt-1 tracking-wider opacity-60">Centralized feed stock management</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="relative mb-6">
                    <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                        <Icon as={Search} size={18} className="text-muted-foreground opacity-50" />
                    </View>
                    <Input
                        placeholder="Search inventories..."
                        className="pl-12 h-14 bg-muted/30 border-border/50 rounded-2xl text-base font-bold"
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                </View>

                {/* Action Buttons Row */}
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={() => setIsBulkImportOpen(true)}
                        className="flex-1 bg-emerald-500/10 h-14 rounded-2xl items-center justify-center flex-row gap-2 border border-emerald-500/20 active:bg-emerald-500/20"
                    >
                        <Icon as={Sparkles} size={16} className="text-emerald-500" />
                        <Text className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Import</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsFeedOrderOpen(true)}
                        className="flex-1 bg-muted/50 h-14 rounded-2xl items-center justify-center flex-row gap-2 border border-border active:bg-muted"
                    >
                        <Icon as={ShoppingCart} size={16} className="text-muted-foreground" />
                        <Text className="text-muted-foreground font-black text-[10px] uppercase tracking-widest">Order</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsRegisterModalOpen(true)}
                        className="flex-1 bg-primary h-14 rounded-2xl items-center justify-center flex-row gap-2 active:opacity-90"
                    >
                        <Icon as={Plus} size={16} className="text-white" />
                        <Text className="text-white font-black text-[10px] uppercase tracking-widest">Register</Text>
                    </Pressable>
                </View>
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
                            onPress={() => router.push(`/farmer/${item.id}` as any)}
                            onRestock={() => setRestockingFarmer({ id: item.id, name: item.name })}
                            onTransfer={() => setTransferringFarmer({ id: item.id, name: item.name })}
                            onDelete={() => setDeleteFarmer({ id: item.id, name: item.name, organizationId: item.organizationId })}
                            onEdit={() => setEditingFarmer(item)}
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
                <FeedOrderModal
                    open={isFeedOrderOpen}
                    onOpenChange={setIsFeedOrderOpen}
                    orgId={membership.orgId}
                />
            )}

        </View>
    );
}
