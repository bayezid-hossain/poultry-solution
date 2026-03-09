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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, SectionList, View } from "react-native";

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
        return index === 0; // Default first group to expanded
    };

    const toggleDate = (dateStr: string, index: number) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateStr]: prev[dateStr] !== undefined ? !prev[dateStr] : !(index === 0)
        }));
    };

    const sectionListRef = useRef<SectionList>(null);
    const [highlightedSaleId, setHighlightedSaleId] = useState<string | null>(null);
    const [localVersionOverrides, setLocalVersionOverrides] = useState<Record<string, string>>({});

    const handleVersionSwitch = useCallback((saleId: string, reportId: string) => {
        setLocalVersionOverrides(prev => ({ ...prev, [saleId]: reportId }));
        setHighlightedSaleId(saleId);
        setTimeout(() => setHighlightedSaleId(null), 3500);
    }, []);

    const { rawGroups, latestSaleIds } = useMemo(() => {
        if (!recentSales) return { rawGroups: [], latestSaleIds: new Set() };

        const dates: Record<string, { dateStr: string; dateObj: Date; sales: any[] }> = {};
        const cycleLatestMap = new Map();

        recentSales.forEach((sale: any) => {
            let displaySaleDate = sale.saleDate || sale.createdAt;
            if (sale.reports && sale.reports.length > 0) {
                const targetVersionId = localVersionOverrides[sale.id] || sale.selectedReportId;
                const activeReport = sale.reports.find((r: any) => r.id === targetVersionId) || sale.reports[0];
                if (activeReport && activeReport.saleDate) {
                    displaySaleDate = activeReport.saleDate;
                }
            }

            const cKey = sale.cycleId || sale.historyId || "unknown";
            const eventTime = new Date(sale.saleDate || sale.createdAt).getTime();
            const current = cycleLatestMap.get(cKey);
            if (!current || eventTime > current.time) {
                cycleLatestMap.set(cKey, { id: sale.id, time: eventTime });
            }

            const dObj = new Date(displaySaleDate);
            const dateStr = format(dObj, "yyyy-MM-dd");

            if (!dates[dateStr]) {
                dates[dateStr] = { dateStr, dateObj: dObj, sales: [] };
            }
            dates[dateStr].sales.push(sale);
        });

        const latestSet = new Set(Array.from(cycleLatestMap.values()).map((v: any) => v.id));
        const sortedGroups = Object.values(dates).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        sortedGroups.forEach(group => {
            group.sales.sort((a: any, b: any) => {
                let aDate = a.saleDate || a.createdAt;
                if (a.reports && a.reports.length > 0) {
                    const targetVersionIdA = localVersionOverrides[a.id] || a.selectedReportId;
                    const activeA = a.reports.find((r: any) => r.id === targetVersionIdA) || a.reports[0];
                    if (activeA && activeA.saleDate) aDate = activeA.saleDate;
                }
                let bDate = b.saleDate || b.createdAt;
                if (b.reports && b.reports.length > 0) {
                    const targetVersionIdB = localVersionOverrides[b.id] || b.selectedReportId;
                    const activeB = b.reports.find((r: any) => r.id === targetVersionIdB) || b.reports[0];
                    if (activeB && activeB.saleDate) bDate = activeB.saleDate;
                }
                return new Date(bDate).getTime() - new Date(aDate).getTime();
            });
        });

        return { rawGroups: sortedGroups, latestSaleIds: latestSet };
    }, [recentSales, localVersionOverrides]);

    const sections = useMemo(() => {
        return rawGroups.map((group, index) => ({
            title: group.dateStr,
            dateObj: group.dateObj,
            index,
            data: isExpanded(group.dateStr, index) ? group.sales : []
        }));
    }, [rawGroups, expandedDates]);

    // Track backend-driven changes for highlights
    const prevSales = useRef<any[] | undefined>(recentSales);
    useEffect(() => {
        if (recentSales && prevSales.current) {
            const changedSale = recentSales.find(s => {
                const prev = prevSales.current?.find(ps => ps.id === s.id);
                return prev && prev.selectedReportId !== s.selectedReportId;
            });
            if (changedSale) {
                setHighlightedSaleId(changedSale.id);
                setTimeout(() => setHighlightedSaleId(null), 3500);
            }
        }
        prevSales.current = recentSales;
    }, [recentSales]);

    // Native scrolling to highlight
    useEffect(() => {
        if (highlightedSaleId) {
            const sectionIndex = sections.findIndex(s => rawGroups[s.index].sales.some(sale => sale.id === highlightedSaleId));
            if (sectionIndex !== -1) {
                const group = rawGroups[sections[sectionIndex].index];
                const itemIndex = group.sales.findIndex(s => s.id === highlightedSaleId);

                // Auto-expand group
                setExpandedDates(prev => ({ ...prev, [group.dateStr]: true }));

                if (itemIndex !== -1) {
                    const timer = setTimeout(() => {
                        sectionListRef.current?.scrollToLocation({
                            sectionIndex,
                            itemIndex,
                            viewOffset: 80,
                            animated: true
                        });
                    }, 100);
                    return () => clearTimeout(timer);
                }
            }
        }
    }, [highlightedSaleId, sections, rawGroups]);

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

            {salesLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color={"#10b981"} />
                    <Text className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs">Loading Sales...</Text>
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
                    <SectionList
                        ref={sectionListRef}
                        sections={sections}
                        keyExtractor={(item) => item.id}
                        stickySectionHeadersEnabled={true}
                        contentContainerClassName="p-4 pb-20"
                        refreshControl={
                            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" colors={["transparent"]} />
                        }
                        ListHeaderComponent={
                            <View className="bg-card border border-border/50 px-3 pb-3 pt-2 rounded-2xl mb-4">
                                {isManagement && (
                                    <View className="mb-3">
                                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                                    </View>
                                )}
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
                        }
                        renderSectionHeader={({ section: { title, dateObj, index } }) => (
                            <View className="bg-background pt-1.5 pb-1" pointerEvents="box-none" style={{ zIndex: 10 }}>
                                <Pressable
                                    onPress={() => toggleDate(title, index)}
                                    collapsable={false}
                                    hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                                >
                                    <View
                                        className="flex-row items-center justify-between px-3 py-2.5 bg-card border border-border/50 rounded-lg shadow-sm"
                                        style={{ opacity: 0.95 }}
                                    >
                                        <View className="flex-row items-center gap-2">
                                            <Icon as={Calendar} size={16} className="text-muted-foreground" />
                                            <Text className="text-xs font-bold text-foreground uppercase tracking-widest">
                                                {format(dateObj, "dd MMM yyyy")}
                                            </Text>
                                        </View>
                                        <Icon as={isExpanded(title, index) ? ChevronUp : ChevronDown} size={18} className="text-muted-foreground" />
                                    </View>
                                </Pressable>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <View className="mt-2">
                                <SaleEventCard
                                    sale={item}
                                    isLatest={latestSaleIds.has(item.id)}
                                    showFarmerName={true}
                                    onVersionSwitch={handleVersionSwitch}
                                    isHighlighted={highlightedSaleId === item.id}
                                    selectedReportId={localVersionOverrides[item.id] || item.selectedReportId}
                                />
                            </View>
                        )}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20 opacity-50">
                                <Icon as={FileText} size={48} className="text-muted-foreground mb-4" />
                                <Text className="text-muted-foreground font-medium">No sales found.</Text>
                            </View>
                        }
                        SectionSeparatorComponent={() => <View className="h-4" />}
                    />
                </>
            )}
        </View>
    );
}
