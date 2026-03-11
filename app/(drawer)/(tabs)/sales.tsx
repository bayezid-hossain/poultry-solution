import { SaleEventCard } from "@/components/cycles/sale-event-card";
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";
import { format, isThisMonth, isThisWeek, isToday } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { Calendar, ChevronDown, ChevronUp, FileText, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, SectionList, View } from "react-native";

type DateFilter = "all" | "today" | "week" | "month";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
];

export default function SalesScreen() {
    const router = useRouter();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");

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
    const scrollTargetRef = useRef<{ sectionIndex: number; itemIndex: number } | null>(null);
    const [highlightedSaleId, setHighlightedSaleId] = useState<string | null>(null);
    const [localVersionOverrides, setLocalVersionOverrides] = useState<Record<string, string>>({});

    const handleVersionSwitch = useCallback((saleId: string, reportId: string) => {
        setLocalVersionOverrides(prev => ({ ...prev, [saleId]: reportId }));
        setHighlightedSaleId(saleId);
    }, []);

    // Filter sales by date
    const filteredSales = useMemo(() => {
        if (!recentSales) return [];
        if (dateFilter === "all") return recentSales;

        return recentSales.filter((sale: any) => {
            const saleDate = new Date(sale.saleDate || sale.createdAt);
            switch (dateFilter) {
                case "today": return isToday(saleDate);
                case "week": return isThisWeek(saleDate, { weekStartsOn: 6 });
                case "month": return isThisMonth(saleDate);
                default: return true;
            }
        });
    }, [recentSales, dateFilter]);

    // Group by date (original approach) + compute latestSaleIds
    const { rawGroups, latestSaleIds } = useMemo(() => {
        if (!filteredSales) return { rawGroups: [], latestSaleIds: new Set() };

        const dates: Record<string, { dateStr: string; dateObj: Date; sales: any[] }> = {};
        const cycleLatestMap = new Map();

        filteredSales.forEach((sale: any) => {
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
    }, [filteredSales, localVersionOverrides]);

    const sections = useMemo(() => {
        return rawGroups.map((group, index) => ({
            title: group.dateStr,
            dateObj: group.dateObj,
            index,
            allSales: group.sales,
            data: isExpanded(group.dateStr, index) ? group.sales : []
        }));
    }, [rawGroups, expandedDates]);

    // Navigate to a specific sale (scroll + highlight)
    const navigateToSale = useCallback((saleId: string) => {
        setHighlightedSaleId(saleId);
        setTimeout(() => setHighlightedSaleId(null), 3500);

        // Find section and item indices
        const sectionIndex = rawGroups.findIndex(g => g.sales.some(s => s.id === saleId));
        if (sectionIndex === -1) return;

        const group = rawGroups[sectionIndex];
        const itemIndex = group.sales.findIndex(s => s.id === saleId);

        // Auto-expand the date group
        if (!isExpanded(group.dateStr, sectionIndex)) {
            setExpandedDates(prev => ({ ...prev, [group.dateStr]: true }));
        }

        if (itemIndex !== -1) {
            // We only set the highlight and expansion here.
            // The useEffect below handles the actual scrolling to ensure it waits for the list to re-render.
        }
    }, [rawGroups, expandedDates]);

    // Cycle link navigation
    const handleCyclePress = useCallback((cycleId: string | null) => {
        if (cycleId) router.push(`/cycle/${cycleId}`);
    }, [router]);

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
                setTimeout(() => setHighlightedSaleId(null), 1500);
            }
        }
        prevSales.current = recentSales;
    }, [recentSales]);

    // Scroll to highlighted sale
    useEffect(() => {
        if (!highlightedSaleId || sections.length === 0) return;

        // 1. Find section index in the current 'sections' array
        const sectionIdx = sections.findIndex(s =>
            rawGroups[s.index].sales.some(sale => sale.id === highlightedSaleId)
        );
        if (sectionIdx === -1) return;

        const group = rawGroups[sections[sectionIdx].index];
        const itemIdx = group.sales.findIndex(s => s.id === highlightedSaleId);

        // 2. If the section is currently empty (collapsed), trigger expand and return.
        // The subsequent render of 'sections' will re-trigger this effect.
        if (sections[sectionIdx].data.length === 0) {
            setExpandedDates(prev => ({ ...prev, [group.dateStr]: true }));
            return;
        }

        // Save the target for potential retries
        scrollTargetRef.current = { sectionIndex: sectionIdx, itemIndex: itemIdx };

        // 3. Perform the scroll with a healthy delay for layout stability
        const timer = setTimeout(() => {
            try {
                sectionListRef.current?.scrollToLocation({
                    sectionIndex: sectionIdx,
                    itemIndex: itemIdx,
                    animated: true,
                    viewPosition: 0, // Centers the item in the viewport
                });
            } catch (error) {
                console.warn("Initial scroll failed, waiting for onScrollToIndexFailed...", error);
            }
        }, 450);

        return () => clearTimeout(timer);
    }, [highlightedSaleId, sections, rawGroups]);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

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
                        extraData={expandedDates}
                        keyboardShouldPersistTaps="handled"
                        contentContainerClassName="p-4 pb-20"

                        refreshControl={
                            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" colors={["transparent"]} />
                        }
                        ListHeaderComponent={
                            <View className="mb-4 gap-3">
                                <View className="bg-card border border-border/50 px-3 pb-3 pt-2 rounded-2xl">
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
                                                placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)"}
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

                                {/* Date Filter Chips */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-1">
                                    {DATE_FILTERS.map(f => (
                                        <Pressable
                                            key={f.key}
                                            onPress={() => setDateFilter(f.key)}
                                            className={`px-4 py-2 rounded-full border ${dateFilter === f.key
                                                ? "bg-primary border-primary"
                                                : "bg-card border-border/50 active:bg-muted/30"
                                                } `}
                                        >
                                            <Text className={`text-xs font-bold uppercase tracking-wider ${dateFilter === f.key ? "text-primary-foreground" : "text-muted-foreground"
                                                }`}>
                                                {f.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                    {dateFilter !== "all" && (
                                        <Pressable
                                            onPress={() => setDateFilter("all")}
                                            className="px-3 py-2 rounded-full items-center justify-center active:bg-muted/30"
                                        >
                                            <Icon as={X} size={14} className="text-muted-foreground" />
                                        </Pressable>
                                    )}
                                </ScrollView>
                            </View>
                        }
                        renderSectionHeader={({ section: { title, dateObj, index, allSales } }) => {
                            const getShortName = (name: string) => {
                                if (!name) return "";
                                const words = name.split(" ").filter(w => isNaN(Number(w)));
                                if (words.length === 0) return name.split(" ")[0] || "";
                                
                                let result = "";
                                for (let i = 0; i < words.length; i++) {
                                    result += (i > 0 ? " " : "") + words[i];
                                    if (words[i].length >= 3) break;
                                }
                                return result.toUpperCase();
                            };
                            const uniqueFarmers = Array.from(new Set((allSales as any[]).map(s => s.farmerName || "Unknown"))).map(name => getShortName(name as string));
                            
                            // Dynamic Badge Calculation
                            const screenWidth = Dimensions.get('window').width;
                            const availableWidth = screenWidth - 175; // safe margin for date (+icon), chevron, padding
                            
                            let currentWidth = 0;
                            let visibleCount = 0;
                            
                            for (let i = 0; i < uniqueFarmers.length; i++) {
                                // Estimate badge width: ~7.5px per uppercase char + 24px for padding/borders/gaps
                                const badgeWidth = uniqueFarmers[i].length * 7.5 + 24;
                                
                                if (i === 0) {
                                    currentWidth += badgeWidth;
                                    visibleCount = 1;
                                } else {
                                    const moreBadgeWidth = 35; // approx width for "+X"
                                    if (currentWidth + badgeWidth + moreBadgeWidth > availableWidth) {
                                        break;
                                    }
                                    currentWidth += badgeWidth;
                                    visibleCount++;
                                }
                            }
                            
                            const visibleFarmers = uniqueFarmers.slice(0, visibleCount);
                            const hiddenCount = uniqueFarmers.length - visibleCount;

                            return (
                                <View className="bg-background p-2 pt-3 border border-[0.5px] mb-2 rounded-sm border-primary " style={{ zIndex: 10 }} collapsable={false} >
                                    <Pressable
                                        onPress={() => toggleDate(title, index)}
                                        className="flex-row items-center justify-between px-1"
                                        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
                                        collapsable={false}
                                    >
                                        <View className="flex-row items-center gap-2 flex-1 mr-2">
                                            <View className="w-7 h-7 rounded-lg bg-muted/40 items-center justify-center shrink-0">
                                                <Icon as={Calendar} size={14} className="text-foreground/70" />
                                            </View>
                                            <Text className="text-[14px] font-black text-foreground/80 uppercase tracking-widest mt-0.5 shrink-0">
                                                {format(dateObj, "dd MMM yyyy")}
                                            </Text>
                                            <View className="flex-1 flex-row pl-2">
                                                <View className="flex-row gap-x-1.5 items-center overflow-hidden">
                                                    {visibleFarmers.map((name, i) => (
                                                        <View key={i} className="bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                                            <Text className="text-[10px] font-bold text-primary">{name}</Text>
                                                        </View>
                                                    ))}
                                                    {hiddenCount > 0 && (
                                                        <View className="bg-muted/80 px-1.5 py-0.5 rounded border border-border">
                                                            <Text className="text-[10px] font-bold text-muted-foreground">+{hiddenCount}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                        <Icon as={isExpanded(title, index) ? ChevronUp : ChevronDown} size={16} className="text-muted-foreground/50 shrink-0" />
                                    </Pressable>
                                </View>
                            )
                        }}
                        renderItem={({ item }) => (
                            <SaleEventCard
                                sale={item}
                                isLatest={latestSaleIds.has(item.id)}
                                showFarmerName={true}
                                onVersionSwitch={handleVersionSwitch}
                                isHighlighted={highlightedSaleId === item.id}
                                selectedReportId={localVersionOverrides[item.id] || item.selectedReportId}
                                colorScheme={colorScheme}
                                onNavigateToSale={navigateToSale}
                                onCyclePress={handleCyclePress}
                                showOfficerName={isManagement}
                            />
                        )}
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20 opacity-50">
                                <Icon as={FileText} size={48} className="text-muted-foreground mb-4" />
                                <Text className="text-muted-foreground font-medium">
                                    {dateFilter !== "all" ? "No sales for this period." : "No sales found."}
                                </Text>
                            </View>
                        }
                        SectionSeparatorComponent={() => null}
                        ListFooterComponent={<View className="" />}
                    />
                </>
            )}
        </View>
    );
}