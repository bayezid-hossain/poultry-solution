import { SaleEventCard } from "@/components/cycles/sale-event-card";
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { useFocusEffect } from "expo-router";
import { Calendar, ChevronDown, ChevronUp, FileText, Search, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";

export default function SalesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const officerSalesQuery = trpc.officer.sales.getRecentSales.useQuery(
        { limit: 100, search: searchQuery },
        { enabled: !!membership?.orgId && !isManagement }
    );
    const mgmtSalesQuery = trpc.management.sales.getRecentSales.useQuery(
        { orgId: membership?.orgId ?? "", limit: 100, search: searchQuery, officerId: selectedOfficerId || undefined },
        { enabled: !!membership?.orgId && isManagement }
    );
    const recentSales = isManagement ? mgmtSalesQuery.data : officerSalesQuery.data;
    const salesLoading = isManagement ? mgmtSalesQuery.isLoading : officerSalesQuery.isLoading;
    const salesError = isManagement ? mgmtSalesQuery.error : officerSalesQuery.error;
    const refetch = isManagement ? mgmtSalesQuery.refetch : officerSalesQuery.refetch;

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        refetch().finally(() => setRefreshing(false));
    }, [refetch]);

    useFocusEffect(
        useCallback(() => {
            if (membership?.orgId) {
                refetch();
            }
        }, [membership?.orgId, refetch])
    );

    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

    const isExpanded = (dateStr: string, index: number) => {
        if (expandedDates[dateStr] !== undefined) return expandedDates[dateStr];
        return index === 0;
    };

    const toggleDate = (dateStr: string, index: number) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateStr]: prev[dateStr] !== undefined ? !prev[dateStr] : !(index === 0)
        }));
    };

    const { groupedData, latestSaleIds } = useMemo(() => {
        if (!recentSales) return { groupedData: [], latestSaleIds: new Set() };

        const dates: Record<string, { dateStr: string; dateObj: Date; sales: any[] }> = {};
        const cycleLatestMap = new Map();

        recentSales.forEach((sale: any) => {
            // Find latest for each cycle
            const cKey = sale.cycleId || sale.historyId || "unknown";
            const sTime = new Date(sale.createdAt || sale.saleDate).getTime();
            const current = cycleLatestMap.get(cKey);
            if (!current || sTime > current.time) {
                cycleLatestMap.set(cKey, { id: sale.id, time: sTime });
            }

            // Group by Date
            const dObj = new Date(sale.saleDate || sale.createdAt);
            const dateStr = format(dObj, "yyyy-MM-dd");

            if (!dates[dateStr]) {
                dates[dateStr] = { dateStr, dateObj: dObj, sales: [] };
            }
            dates[dateStr].sales.push(sale);
        });

        const latestSet = new Set(Array.from(cycleLatestMap.values()).map((v: any) => v.id));

        const sortedGroups = Object.values(dates).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        // Sort sales inside each group
        sortedGroups.forEach(group => {
            group.sales.sort((a: any, b: any) => new Date(b.createdAt || b.saleDate).getTime() - new Date(a.createdAt || a.saleDate).getTime());
        });

        return { groupedData: sortedGroups, latestSaleIds: latestSet };
    }, [recentSales]);

    const stickyIndices = useMemo(() => {
        const indices: number[] = [];
        let currentIndex = 0;
        groupedData.forEach((g, i) => {
            indices.push(currentIndex);
            currentIndex += isExpanded(g.dateStr, i) && g.sales.length > 0 ? 2 : 1;
        });
        return indices;
    }, [groupedData, expandedDates]);

    if (!membership?.isPro) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Sales" />
                <ProBlocker feature="Sales History" description="Access the complete sales ledger and profit margins." />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Sales" />

            <View className="bg-card border-b border-border/50 px-3 pb-3 pt-2">
                {isManagement && (
                    <View className="mb-3">
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    </View>
                )}
                {/* Search Bar & Actions */}
                <View className="relative flex-row items-center gap-2">
                    <View className="flex-1 relative">
                        <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                            <Icon as={Search} size={18} className="text-muted-foreground opacity-50" />
                        </View>
                        <Input
                            placeholder="Search by farmer or location..."
                            className="pl-12 pr-12 h-12 bg-muted/30 border-border/50 rounded-2xl text-base font-bold"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="rgba(255,255,255,0.2)"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable
                                onPress={() => setSearchQuery("")}
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full active:bg-muted/50 z-20"
                            >
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>

            {salesLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color={"#10b981"} />
                    <Text className='mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs'>Loading Sales...</Text>
                </View>
            ) : salesError ? (
                <View className="flex-1 items-center justify-center p-8">
                    <Icon as={FileText} size={48} className="text-destructive mb-4" />
                    <Text className="text-destructive font-bold text-lg text-center mb-2">Failed to load sales</Text>
                    <Text className="text-muted-foreground text-center">{salesError.message}</Text>
                </View>
            ) : (
                <>
                    {refreshing && (
                        <LoadingState fullPage title="Synchronizing" description="Fetching latest sales..." />
                    )}
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="p-4 pb-20"
                        className="flex-1"
                        refreshControl={
                            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" colors={["transparent"]} />
                        }
                        stickyHeaderIndices={stickyIndices}
                    >
                        {groupedData.length > 0 ? (
                            groupedData.flatMap((g, i) => {
                                const elements = [];
                                // The Header
                                elements.push(
                                    <View key={`header-${g.dateStr}`} className="bg-background pt-2 pb-1" style={{ zIndex: 100, elevation: 10 }}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => toggleDate(g.dateStr, i)}
                                            className="flex-row items-center justify-between px-3 py-3 bg-card border border-border/50 rounded-lg shadow-sm"
                                        >
                                            <View className="flex-row items-center gap-2">
                                                <Icon as={Calendar} size={18} className="text-muted-foreground" />
                                                <Text className="text-sm font-bold text-foreground uppercase tracking-widest">{format(g.dateObj, "dd MMM yyyy")}</Text>
                                            </View>
                                            <Icon as={isExpanded(g.dateStr, i) ? ChevronUp : ChevronDown} size={18} className="text-muted-foreground" />
                                        </TouchableOpacity>
                                    </View>
                                );

                                // The Content
                                if (isExpanded(g.dateStr, i) && g.sales.length > 0) {
                                    elements.push(
                                        <View key={`content-${g.dateStr}`} className="gap-3 mt-2 mb-6">
                                            {g.sales.map((item: any) => (
                                                <View key={item.id}>
                                                    <SaleEventCard
                                                        sale={item}
                                                        isLatest={latestSaleIds.has(item.id)}
                                                        showFarmerName={true}
                                                    />
                                                </View>
                                            ))}
                                        </View>
                                    );
                                }

                                return elements;
                            })
                        ) : (
                            <View className="flex-1 items-center justify-center py-20 opacity-50">
                                <Icon as={FileText} size={48} className="text-muted-foreground mb-4" />
                                <Text className="text-muted-foreground font-medium">No sales found.</Text>
                            </View>
                        )}
                    </ScrollView>
                </>
            )}
        </View>
    );
}

