import { CycleRowAccordion } from "@/components/cycles/cycle-row-accordion";
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ExportPreviewDialog } from "@/components/reports/ExportPreviewDialog";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { generateExcel, generatePDF, openFile, shareFile } from "@/lib/export";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronDown, ChevronUp, FileText, Search, Table, User, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";

export default function SalesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    // Preview States
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<{ uri: string, type: 'pdf' | 'excel', title: string } | null>(null);

    if (!membership?.isPro) {
        return <ProBlocker feature="Sales History" description="Access the complete sales ledger and profit margins." />;
    }

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

    const exportPdf = async () => {
        if (!recentSales || recentSales.length === 0) return;
        const reportTitle = "Sales_Ledger";

        let totalRevenue = 0;
        let totalBirds = 0;
        let totalWeight = 0;
        let totalProfit = 0;

        // Grouping to identify latest sale per cycle
        const cycleSalesMap: Record<string, string[]> = {};
        recentSales.forEach((s: any) => {
            const key = s.cycleId || s.historyId || "unknown";
            if (!cycleSalesMap[key]) cycleSalesMap[key] = [];
            cycleSalesMap[key].push(s.id);
        });

        recentSales.forEach((s: any) => {
            const revenue = s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0;
            totalRevenue += revenue;
            totalBirds += s.birdsSold || 0;
            totalWeight += Number(s.totalWeight) || 0;
            if (s.cycleContext?.isEnded && s.reports?.[0]?.id === s.selectedReportId) {
                totalProfit += s.cycleContext.profit || 0;
            }
        });

        const html = `
            <h2>Sales Ledger</h2>
            <div class="kpi-container">
                <div class="kpi-card">
                    <div class="kpi-value">৳${(totalRevenue || 0).toLocaleString()}</div>
                    <div class="kpi-label">Total Revenue</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${(totalBirds || 0).toLocaleString()}</div>
                    <div class="kpi-label">Total Birds Sold</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${totalWeight.toFixed(2)} kg</div>
                    <div class="kpi-label">Total Weight</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">৳${(totalProfit || 0).toLocaleString()}</div>
                    <div class="kpi-label">Net Profit</div>
                </div>
            </div>
            
            <h3>Detailed Sales Records</h3>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Farmer/Cycle</th>
                        <th>Age (W)</th>
                        <th>Birds</th>
                        <th>Weight (kg)</th>
                        <th>Revenue</th>
                        <th>Cash/Dep/Med</th>
                        <th>Feed (Bags)</th>
                        <th>FCR/EPI</th>
                        <th>Profit</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentSales.map((s: any) => {
            const ctx = s.cycleContext;
            const isEnded = ctx?.isEnded;
            const isLatest = cycleSalesMap[s.cycleId || s.historyId || "unknown"]?.[0] === s.id;
            const showWeighted = isEnded && isLatest;

            const feedConsumed = s.feedConsumed || s.reports?.[0]?.feedConsumed;
            let feedTotal = 0;
            try {
                const parsed = typeof feedConsumed === 'string' ? JSON.parse(feedConsumed) : feedConsumed;
                if (Array.isArray(parsed)) feedTotal = parsed.reduce((sum: number, f: any) => sum + (Number(f.bags) || 0), 0);
            } catch (e) { }

            return `
                        <tr>
                            <td>${new Date(s.saleDate || s.createdAt).toLocaleDateString()}</td>
                            <td>
                                <b>${s.farmerName || s.cycle?.farmer?.name || s.history?.farmer?.name || "-"}</b><br/>
                               
                            </td>
                            <td>
                                ${showWeighted ? `<b>${ctx.age}</b>` : (s.saleAge ?? ctx?.age ?? "N/A")} d
                            </td>
                            <td>${s.birdsSold}</td>
                            <td>${Number(s.totalWeight).toFixed(2)}</td>
                            <td>৳${(s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0).toLocaleString()}</td>
                            <td>
                                <small>
                                    C: ৳${(s.cashReceived || 0).toLocaleString()}<br/>
                                    D: ৳${(s.depositReceived || 0).toLocaleString()}<br/>
                                    M: ৳${(s.medicineCost || 0).toLocaleString()}
                                </small>
                            </td>
                            <td>${feedTotal || "-"}</td>
                            <td>
                                ${showWeighted ? `${ctx?.fcr || "-"} / ${ctx?.epi || "-"}` : "-"}
                            </td>
                            <td style="color: ${showWeighted ? ((ctx?.profit || 0) >= 0 ? '#10b981' : '#ef4444') : 'inherit'}">
                                ${showWeighted ? `৳${Math.round(ctx?.profit || 0).toLocaleString()}` : "-"}
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;

        try {
            const uri = await generatePDF({ title: reportTitle, htmlContent: html });
            setPreviewData({ uri, type: 'pdf', title: reportTitle });
            setPreviewVisible(true);
        }
        catch (e) { Alert.alert("Export Failed", "Error generating PDF."); }
    };

    const exportExcel = async () => {
        if (!recentSales || recentSales.length === 0) return;
        const reportTitle = "Sales_Ledger";

        let totalRevenue = 0; let totalBirds = 0; let totalWeight = 0; let totalProfit = 0;

        // Grouping to identify latest sale per cycle
        const cycleSalesMap: Record<string, string[]> = {};
        recentSales.forEach((s: any) => {
            const key = s.cycleId || s.historyId || "unknown";
            if (!cycleSalesMap[key]) cycleSalesMap[key] = [];
            cycleSalesMap[key].push(s.id);
        });

        recentSales.forEach((s: any) => {
            const revenue = s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0;
            totalRevenue += revenue;
            totalBirds += s.birdsSold || 0;
            totalWeight += Number(s.totalWeight) || 0;
            if (s.cycleContext?.isEnded && s.reports?.[0]?.id === s.selectedReportId) {
                totalProfit += s.cycleContext.profit || 0;
            }
        });

        const summaryData = [
            { Metric: "Total Revenue", Value: `৳${totalRevenue.toLocaleString()}` },
            { Metric: "Birds Sold", Value: totalBirds.toLocaleString() },
            { Metric: "Total Weight", Value: `${totalWeight.toFixed(2)} kg` },
            { Metric: "Net Profit", Value: `৳${totalProfit.toLocaleString()}` }
        ];

        const rawData = recentSales.map((s: any) => {
            const ctx = s.cycleContext;
            const isEnded = ctx?.isEnded;
            const isLatest = cycleSalesMap[s.cycleId || s.historyId || "unknown"]?.[0] === s.id;
            const showWeighted = isEnded && isLatest;

            const feedConsumed = s.feedConsumed || s.reports?.[0]?.feedConsumed;
            let feedTotal = 0;
            try {
                const parsed = typeof feedConsumed === 'string' ? JSON.parse(feedConsumed) : feedConsumed;
                if (Array.isArray(parsed)) feedTotal = parsed.reduce((sum: number, f: any) => sum + (Number(f.bags) || 0), 0);
            } catch (e) { }

            return {
                Farmer: s.farmerName || s.cycle?.farmer?.name || s.history?.farmer?.name || "-",
                Date: new Date(s.saleDate || s.createdAt).toLocaleDateString(),
                Age: showWeighted ? `${ctx.age} (Weighted)` : (s.saleAge ?? ctx?.age ?? "N/A"),
                "Birds Sold": s.birdsSold,
                "Total Weight (kg)": Number(s.totalWeight).toFixed(2),
                "Price/kg": `৳${s.pricePerKg}`,
                Revenue: `৳${(s.totalRevenue || (Number(s.totalWeight) * Number(s.pricePerKg)) || 0).toLocaleString()}`,
                Cash: `৳${(s.cashReceived || 0).toLocaleString()}`,
                Deposit: `৳${(s.depositReceived || 0).toLocaleString()}`,
                Medicine: `৳${(s.medicineCost || 0).toLocaleString()}`,
                "Feed (Bags)": feedTotal || "-",
                Mortality: showWeighted ? ctx.mortality : "-",
                FCR: showWeighted ? ctx.fcr : "-",
                EPI: showWeighted ? ctx.epi : "-",
                Profit: showWeighted ? `৳${Math.round(ctx?.profit || 0).toLocaleString()}` : "-"
            };
        });

        try {
            const uri = await generateExcel({
                title: reportTitle,
                summaryData,
                rawHeaders: [
                    "Farmer", "Date", "Age", "Birds Sold", "Total Weight (kg)",
                    "Price/kg", "Revenue", "Cash", "Deposit", "Medicine", "Feed (Bags)",
                    "Mortality", "FCR", "EPI", "Profit"
                ],
                rawDataTable: rawData,
                mergePrimaryColumn: true,
                definitions: [
                    { Metric: "Avg. Selling Price", Calculation: "Total Revenue / Total Weight" },
                    { Metric: "Farmer Effective Rate", Calculation: "max(Base Rate, Base Rate + Summation of Adjustments)" },
                    { Metric: "Summation of Adjustments", Calculation: "Σ [(Sale Price - Base Rate) * (0.5 if surplus else 1.0) * Weight] / Total Weight" },
                    { Metric: "FCR", Calculation: "(Total Feed Bags * 50) / Total Weight kg" },
                    { Metric: "EPI", Calculation: "(Survival% * Avg Weight) / (FCR * Average Age) * 100" },
                    { Metric: "Profit", Calculation: "(Weight * Effective Rate) - (Feed Cost + DOC Cost)" }
                ]
            });
            setPreviewData({ uri, type: 'excel', title: reportTitle });
            setPreviewVisible(true);
        } catch (e) { Alert.alert("Export Failed", "Error generating Excel."); }
    };

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
                    <Pressable onPress={exportExcel} className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl items-center justify-center active:bg-emerald-500/20">
                        <Icon as={Table} size={20} className="text-emerald-600" />
                    </Pressable>
                    <Pressable onPress={exportPdf} className="w-12 h-12 bg-destructive/10 border border-destructive/20 rounded-2xl items-center justify-center active:bg-destructive/20">
                        <Icon as={FileText} size={20} className="text-destructive" />
                    </Pressable>
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
            {previewData && (
                <ExportPreviewDialog
                    visible={previewVisible}
                    onClose={() => setPreviewVisible(false)}
                    title={previewData.title}
                    type={previewData.type}
                    onView={() => openFile(previewData.uri, previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                    onShare={() => shareFile(previewData.uri, previewData.title, previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', previewData.type === 'pdf' ? 'com.adobe.pdf' : 'com.microsoft.excel.xlsx')}
                />
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

