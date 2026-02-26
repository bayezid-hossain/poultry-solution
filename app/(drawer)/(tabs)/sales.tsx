import { CycleRowAccordion } from "@/components/cycles/cycle-row-accordion";
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronDown, ChevronUp, FileText, Search, User, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";

export default function SalesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    // console.log('[Tabs-SalesScreen] isManagement:', isManagement, 'orgId:', membership?.orgId, 'selectedOfficerId:', selectedOfficerId);

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

    const groupedData = useMemo(() => {
        if (!recentSales) return [];

        const farmers: Record<string, { id: string; name: string; cycles: Record<string, any> }> = {};

        recentSales.forEach((sale: any) => {
            const fId = sale.cycle?.farmer?.id || sale.history?.farmer?.id || "unknown";
            const fName = sale.farmerName || sale.cycle?.farmer?.name || sale.history?.farmer?.name || "Unknown Farmer";

            if (!farmers[fId]) {
                farmers[fId] = { id: fId, name: fName, cycles: {} };
            }

            const cKey = sale.cycleId || sale.historyId || "unknown";
            const cName = sale.cycleName || "Unknown Cycle";

            if (!farmers[fId].cycles[cKey]) {
                farmers[fId].cycles[cKey] = {
                    id: cKey,
                    name: cName,
                    sales: [sale],
                    doc: sale.cycleContext?.doc || Number(sale.cycle?.doc) || 0,
                    age: sale.cycleContext?.age || 0,
                    totalSold: sale.cycleContext?.cumulativeBirdsSold || sale.birdsSold || 0,
                    isEnded: !!sale.historyId
                };
            } else {
                farmers[fId].cycles[cKey].sales.push(sale);
                farmers[fId].cycles[cKey].totalSold = Math.max(
                    farmers[fId].cycles[cKey].totalSold,
                    sale.cycleContext?.cumulativeBirdsSold || 0
                );
            }
        });

        return Object.values(farmers).sort((a, b) => {
            const getLatestSaleTime = (farmerCycles: Record<string, any>) => {
                let maxTime = 0;
                Object.values(farmerCycles).forEach((cycle) => {
                    cycle.sales.forEach((sale: any) => {
                        const t = new Date(sale.createdAt || sale.saleDate).getTime();
                        if (t > maxTime) maxTime = t;
                    });
                });
                return maxTime;
            };

            return getLatestSaleTime(b.cycles) - getLatestSaleTime(a.cycles);
        });
    }, [recentSales]);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Sales" />

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
                        contentContainerClassName="p-4 pb-20 gap-4"
                        className="flex-1"
                        refreshControl={
                            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" colors={["transparent"]} />
                        }
                    >
                        {groupedData.length > 0 ? (
                            groupedData.map((farmerGroup) => (
                                <FarmerSalesAccordion
                                    key={farmerGroup.id}
                                    farmer={farmerGroup}
                                    onRefresh={refetch}
                                />
                            ))
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

function FarmerSalesAccordion({ farmer, onRefresh }: { farmer: any, onRefresh: () => void }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const cycleList = Object.values(farmer.cycles);

    const sortedCycleList = [...cycleList].sort((a: any, b: any) => {
        const getLatestTime = (sales: any[]) => {
            return Math.max(...sales.map(s => new Date(s.createdAt || s.saleDate).getTime()));
        };
        return getLatestTime(b.sales) - getLatestTime(a.sales);
    });

    return (
        <Card className="bg-card border-border/40 rounded-lg overflow-hidden">
            <TouchableOpacity
                activeOpacity={0.7}
                className="p-3 flex-row items-center justify-between active:bg-muted/30 border-b border-border/10"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 rounded-full bg-muted items-center justify-center">
                        <Icon as={User} size={20} className="text-foreground/70" />
                    </View>
                    <View>

                        <Text className="text-sm font-bold text-foreground uppercase tracking-tight active:text-primary" onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/farmer/${farmer.id}` as any);
                        }}>{farmer.name}</Text>
                        <Text className="text-xs text-muted-foreground font-medium">{cycleList.length} Cycles</Text>
                    </View>
                </View>
                <Icon as={isOpen ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
            </TouchableOpacity>

            {isOpen && (
                <View className="pb-1">
                    {sortedCycleList.map((cycle: any, index: number) => (
                        <CycleRowAccordion
                            key={cycle.id}
                            cycle={cycle}
                            isLast={index === sortedCycleList.length - 1}
                            onRefresh={onRefresh}
                        />
                    ))}
                </View>
            )}
        </Card>
    );
}

