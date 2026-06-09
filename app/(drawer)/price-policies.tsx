/// <reference types="nativewind/types" />
import { PricePolicyBottomSheet } from "@/components/management/price-policy-bottom-sheet";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format, isAfter } from "date-fns";
import { Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { toast } from "sonner-native";

type Policy = {
    id: string;
    effectiveFrom: string;
    feedPricePerBag: string;
    docPricePerBird: string;
    baseSellPrice: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
};

function PolicyTimelineRow({
    policy,
    isCurrent,
    isLast,
    onEdit,
    onDelete,
}: {
    policy: Policy;
    isCurrent: boolean;
    isLast: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const swipeRef = useRef<Swipeable>(null);

    const renderRightActions = () => (
        <View className="flex-row items-center ml-2 gap-2 pr-1">
            <Pressable
                onPress={() => {
                    swipeRef.current?.close();
                    onEdit();
                }}
                style={{ backgroundColor: "#3b82f6" }}
                className="w-16 rounded-xl items-center justify-center h-full"
            >
                <Text className="text-white text-xs font-bold">Edit</Text>
            </Pressable>
            <Pressable
                onPress={() => {
                    swipeRef.current?.close();
                    onDelete();
                }}
                style={{ backgroundColor: "#ef4444" }}
                className="w-16 rounded-xl items-center justify-center h-full"
            >
                <Text className="text-white text-xs font-bold">Delete</Text>
            </Pressable>
        </View>
    );

    return (
        <View className="flex-row gap-3">
            {/* Timeline spine */}
            <View className="items-center w-5 pt-3">
                <View
                    className={`w-3 h-3 rounded-full border-2 border-background ${isCurrent ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    style={isCurrent ? { shadowColor: "#22c55e", shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } } : undefined}
                />
                {!isLast && <View className="w-0.5 flex-1 mt-1 bg-border/50 min-h-[20px]" />}
            </View>

            {/* Card */}
            <View className="flex-1 mb-3">
                <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false}>
                    <View
                        className={`rounded-2xl p-3 border ${
                            isCurrent
                                ? "bg-green-500/5 border-green-500/30 dark:bg-green-500/10 dark:border-green-500/20"
                                : "bg-card border-border/50 opacity-75"
                        }`}
                    >
                        {/* Header row */}
                        <View className="flex-row justify-between items-center mb-2.5">
                            <Text className="text-sm font-bold text-foreground">
                                {format(new Date(policy.effectiveFrom), "MMM d, yyyy")}
                            </Text>
                            {isCurrent ? (
                                <View className="bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
                                    <Text className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-wide">
                                        Current
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-[10px] text-muted-foreground font-medium">Historical</Text>
                            )}
                        </View>

                        {/* Price chips */}
                        <View className="flex-row gap-2">
                            <View className={`flex-1 rounded-xl p-2.5 ${isCurrent ? "bg-green-500/10 dark:bg-green-500/15" : "bg-muted/40"}`}>
                                <Text className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Feed/bag</Text>
                                <Text className={`text-sm font-black ${isCurrent ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
                                    ৳{Number(policy.feedPricePerBag).toLocaleString()}
                                </Text>
                            </View>
                            <View className={`flex-1 rounded-xl p-2.5 ${isCurrent ? "bg-green-500/10 dark:bg-green-500/15" : "bg-muted/40"}`}>
                                <Text className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">DOC/bird</Text>
                                <Text className={`text-sm font-black ${isCurrent ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
                                    ৳{Number(policy.docPricePerBird).toLocaleString()}
                                </Text>
                            </View>
                            <View className={`flex-1 rounded-xl p-2.5 ${isCurrent ? "bg-green-500/10 dark:bg-green-500/15" : "bg-muted/40"}`}>
                                <Text className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mb-0.5">Base sell</Text>
                                <Text className={`text-sm font-black ${isCurrent ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
                                    ৳{Number(policy.baseSellPrice).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Swipeable>
            </View>
        </View>
    );
}

export default function PricePoliciesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const utils = trpc.useUtils();
    const orgId = membership?.orgId ?? "";

    const canManage =
        membership?.role === "OWNER" || membership?.role === "MANAGER";

    const { data: policies, isLoading, refetch } = trpc.management.pricePolicies.list.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const deleteMutation = trpc.management.pricePolicies.delete.useMutation({
        onSuccess: () => utils.management.pricePolicies.list.invalidate(),
        onError: (e) => toast.error(e.message),
    });

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<Policy | undefined>(undefined);
    const [refreshing, setRefreshing] = useState(false);

    const now = new Date();
    const sorted = [...(policies ?? [])].sort(
        (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    );
    const currentIndex = sorted.findIndex((p) => !isAfter(new Date(p.effectiveFrom), now));

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const handleEdit = (policy: Policy) => {
        setEditingPolicy(policy);
        setSheetOpen(true);
    };

    const handleDelete = (policy: Policy, isCurrent: boolean) => {
        Alert.alert(
            "Delete Policy",
            isCurrent
                ? "This is the current active policy. Deleting it may affect profit calculations. Are you sure?"
                : "Delete this historical price policy?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate({ orgId, id: policy.id }),
                },
            ]
        );
    };

    const handleAdd = () => {
        setEditingPolicy(undefined);
        setSheetOpen(true);
    };

    if (!canManage) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Price Policies" />
                <View className="flex-1 items-center justify-center px-8">
                    <Text className="text-muted-foreground text-center">
                        Only managers and owners can view price policies.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Price Policies"
                leftElement={undefined}
            />

            {/* Add button — floating top-right */}
            <View className="absolute right-4 z-10" style={{ top: 60 }}>
                <Pressable
                    onPress={handleAdd}
                    className="w-10 h-10 rounded-full bg-primary items-center justify-center active:opacity-70 shadow-sm"
                >
                    <Icon as={Plus} size={20} className="text-primary-foreground" />
                </Pressable>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader />
                </View>
            ) : (
                <FlatList
                    data={sorted}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 60 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListHeaderComponent={
                        sorted.length > 0 ? (
                            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                Policy History
                            </Text>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-16 px-8">
                            <Text className="text-muted-foreground text-center mb-1">No price policies yet.</Text>
                            <Text className="text-xs text-muted-foreground/60 text-center">
                                Tap + to add the current pricing.
                            </Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <PolicyTimelineRow
                            policy={item}
                            isCurrent={index === currentIndex}
                            isLast={index === sorted.length - 1}
                            onEdit={() => handleEdit(item)}
                            onDelete={() => handleDelete(item, index === currentIndex)}
                        />
                    )}
                />
            )}

            <PricePolicyBottomSheet
                open={sheetOpen}
                onOpenChange={(v) => {
                    setSheetOpen(v);
                    if (!v) setEditingPolicy(undefined);
                }}
                mode={editingPolicy ? "edit" : "add"}
                policy={editingPolicy}
            />
        </View>
    );
}
