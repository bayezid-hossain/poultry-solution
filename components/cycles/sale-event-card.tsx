import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { router } from "expo-router";
import { Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCopy, Edit, ExternalLink, Eye, EyeOff, History, Loader2, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Pressable, View, useColorScheme } from "react-native";
import { toast } from "sonner-native";
import { BirdyLoader } from "../ui/loading-state";
import { AdjustSaleModal } from "./adjust-sale-modal";
import { ConfirmModal } from "./confirm-modal";
import { SaleDetailsContent } from "./sale-details-content";
import { SaleDiffModal } from "./sale-diff-modal";

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const calculateTotalBags = (feedData: any) => {
    if (!feedData || !Array.isArray(feedData)) return 0;
    return feedData.reduce((total: number, item: any) => total + (Number(item.quantity) || Number(item.bags) || 0), 0);
};

export const formatFeedBreakdown = (feedData: any) => {
    if (!feedData || !Array.isArray(feedData) || feedData.length === 0) return "None";
    const breakdown = feedData
        .filter((item: any) => (Number(item.quantity) || Number(item.bags) || 0) > 0)
        .map((item: any) => `${item.type || 'Feed'}: ${Number(item.quantity) || Number(item.bags)} Bags`)
        .join("\n");

    return breakdown || "None";
};

const safeParseJSON = (data: any) => {
    if (!data) return [];
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
};

export const getFeedDiffFields = (beforeFeed: any, afterFeed: any, labelPrefix: string) => {
    const bFeed = safeParseJSON(beforeFeed);
    const aFeed = safeParseJSON(afterFeed);

    const types = new Set<string>();
    bFeed.forEach((f: any) => { if (f.type) types.add(f.type.toUpperCase().trim()); });
    aFeed.forEach((f: any) => { if (f.type) types.add(f.type.toUpperCase().trim()); });

    const fields: any[] = [];
    types.forEach(type => {
        const b = bFeed.find((f: any) => (f.type || "").toUpperCase().trim() === type)?.bags || 0;
        const a = aFeed.find((f: any) => (f.type || "").toUpperCase().trim() === type)?.bags || 0;
        if (Number(b) !== 0 || Number(a) !== 0 || (Number(b) === 0 && Number(a) === 0 && types.size === 1)) {
            fields.push({
                label: `${labelPrefix} (${type})`,
                before: Number(b),
                after: Number(a),
                type: "number",
                unit: "bags"
            });
        }
    });
    return fields;
};


export const generateReportText = (sale: any, report: any, isLatest: boolean): string => {
    const birdsSold = report ? report.birdsSold : sale.birdsSold;
    const totalWeight = report ? report.totalWeight : sale.totalWeight;
    const displayAvgWeight = report ? report.avgWeight : sale.avgWeight;

    const cumulativeWeight = sale.cycleContext?.totalWeight || 0;
    const cumulativeBirdsSold = sale.cycleContext?.cumulativeBirdsSold || 0;

    const avgWeight = (isLatest && cumulativeWeight > 0 && cumulativeBirdsSold > 0)
        ? (cumulativeWeight / cumulativeBirdsSold).toFixed(2)
        : displayAvgWeight;
    const pricePerKg = report ? report.pricePerKg : sale.pricePerKg;
    const totalAmount = report ? report.totalAmount : sale.totalAmount;

    const cashReceived = report ? (report.cashReceived ?? sale.cashReceived) : sale.cashReceived;
    const depositReceived = report ? (report.depositReceived ?? sale.depositReceived) : sale.depositReceived;
    const medicineCost = report ? (report.medicineCost ?? sale.medicineCost) : sale.medicineCost;

    const totalMortality = (report && report.totalMortality !== undefined && report.totalMortality !== null) ? report.totalMortality : sale.totalMortality;

    const feedConsumed = safeParseJSON(report?.feedConsumed ?? sale.feedConsumed);
    const feedStock = safeParseJSON(report?.feedStock ?? sale.feedStock);
    const feedTotal = calculateTotalBags(feedConsumed);
    const feedBreakdown = formatFeedBreakdown(feedConsumed);
    const stockBreakdown = formatFeedBreakdown(feedStock);

    const fcr = sale.cycleContext?.fcr || 0;
    const epi = sale.cycleContext?.epi || 0;
    const isEnded = sale.cycleContext?.isEnded || false;

    const saleAge = sale.saleAge ?? sale.cycleContext?.age ?? "N/A";
    const previousSold = sale.houseBirds - sale.remainingBirds - birdsSold - totalMortality;
    const ageText = `Age: ${saleAge} days`;

    const officialInputDate = report?.officialInputDate || sale.cycleContext?.officialInputDate || sale.cycleContext?.createdAt || sale.history?.startDate || sale.cycle?.createdAt;
    const docInputDateStr = officialInputDate ? format(new Date(officialInputDate), "dd MMM yyyy") : "N/A";
    const saleDateStr = report?.saleDate || report?.createdAt || sale.saleDate;

    return `Date: ${format(new Date(saleDateStr), "dd MMM yyyy")}

Farmer: ${sale.farmerName || "N/A"}
Location: ${sale.location || "N/A"}
${sale.cycleContext?.birdType ? `\nBird Type: ${sale.cycleContext?.birdType}` : ""}
DOC In: ${docInputDateStr}
${sale.houseBirds ? `House bird : ${sale.houseBirds}pcs` : ""}
${previousSold > 0 ? `Previously Sold: ${previousSold}pcs\n` : ""}Today's Sale : ${birdsSold}pcs
Total Mortality: ${totalMortality} pcs
${(!isEnded || !isLatest) ? `\nRemaining Birds: ${sale.remainingBirds ?? 0} pcs` : ""}

${ageText}
Weight: ${totalWeight} kg
Avg. Weight: ${avgWeight} kg
${isEnded && isLatest ? `
FCR: ${fcr}
EPI: ${epi}
` : ""}
Price : ${pricePerKg} tk
Total taka : ${parseFloat(totalAmount?.toString() || "0").toLocaleString()} tk
Deposit: ${depositReceived ? `${parseFloat(depositReceived?.toString() || "0").toLocaleString()} tk` : ""}
Cash: ${parseFloat(cashReceived?.toString() || "0").toLocaleString()} tk

Feed: ${feedTotal} bags
${feedBreakdown}
${stockBreakdown !== "None" ? `\nStock:\n${stockBreakdown}\n` : ""}
Medicine: ${medicineCost ? parseFloat(medicineCost?.toString() || "0").toLocaleString() : 0} tk
${!isEnded || !isLatest ? "\n--- Sale not complete ---" : ""}`;
};

interface SaleEventCardProps {
    sale: any;
    isLatest?: boolean;
    showFarmerName?: boolean;
    onVersionSwitch?: (saleId: string, reportId: string) => void;
    isHighlighted?: boolean;
    colorScheme?: string | null;
    selectedReportId?: string | null;
    onNavigateToSale?: (saleId: string) => void;
    onCyclePress?: (cycleId: string | null) => void;
    showOfficerName?: boolean;
}

export function SaleEventCard({
    sale,
    isLatest = false,
    showFarmerName = false,
    onVersionSwitch,
    isHighlighted = false,
    colorScheme: propColorScheme,
    selectedReportId: propsSelectedReportId,
    onNavigateToSale,
    onCyclePress,
    showOfficerName = false,
}: SaleEventCardProps) {
    const internalColorScheme = useColorScheme();
    const colorScheme = propColorScheme || internalColorScheme;
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showVersionPicker, setShowVersionPicker] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
    const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
    const [highlightAnim] = useState(new Animated.Value(0));
    const [isNavigatingPrev, setIsNavigatingPrev] = useState(false);
    const [isNavigatingNext, setIsNavigatingNext] = useState(false);

    const overlayBg = colorScheme === 'dark' ? '#000000' : '#ffffff';

    useEffect(() => {
        if (isHighlighted) {
            // User requested: do not automatically expand details when highlighting
            Animated.sequence([
                Animated.timing(highlightAnim, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: false,
                }),
                Animated.delay(600),
                Animated.timing(highlightAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: false,
                }),
            ]).start();
        }
    }, [isHighlighted, highlightAnim]);

    const handleCopy = async () => {
        try {
            await Clipboard.setStringAsync(generateReportText(sale, selectedReport, isLatest));
            setCopied(true);
            toast.success("Report copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy report");
        }
    };

    const utils = trpc.useUtils();

    const hasReports = sale.reports && sale.reports.length > 0;
    const sortedReports = hasReports
        ? [...sale.reports].sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return timeB - timeA; // Descending: Newest first
        })
        : [];

    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
        propsSelectedReportId || sale.selectedReportId || (sortedReports[0]?.id ?? null)
    );

    const [prevReportId, setPrevReportId] = useState(propsSelectedReportId || sale.selectedReportId);
    if ((propsSelectedReportId || sale.selectedReportId) !== prevReportId) {
        setPrevReportId(propsSelectedReportId || sale.selectedReportId);
        // If pointers changed or override updated, update selected version
        // Prefer explicit override, then the canonical pointer, then fallback to newest
        setSelectedVersionId(propsSelectedReportId || sale.selectedReportId || (sortedReports[0]?.id ?? null));

        if (isHighlighted || (isLatest && !propsSelectedReportId)) {
            Animated.sequence([
                Animated.timing(highlightAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
                Animated.delay(800),
                Animated.timing(highlightAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
            ]).start();
        }
    }

    const selectedReport = selectedVersionId
        ? sortedReports.find((r: any) => r.id === selectedVersionId) || sortedReports[0]
        : sortedReports[0];

    const setActiveMutation = trpc.officer.sales.setActiveVersion.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.officer.sales.getSaleEvents.invalidate(),
                utils.officer.sales.getRecentSales.invalidate(),
                utils.officer.cycles.getDetails.invalidate(),
                utils.officer.cycles.listActive.invalidate(),
                utils.officer.cycles.listPast.invalidate(),
                utils.officer.farmers.getDetails.invalidate(),
                utils.management.cycles.listActive.invalidate(),
                utils.management.cycles.listPast.invalidate(),
                utils.management.farmers.getDetails.invalidate(),
                utils.management.sales.getRecentSales.invalidate(),
            ]);
            setIsSwitchingVersion(false);
        },
        onError: () => {
            setIsSwitchingVersion(false);
        },
    });

    const deleteMutation = trpc.officer.sales.delete.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.officer.sales.getSaleEvents.invalidate(),
                utils.officer.sales.getRecentSales.invalidate(),
                utils.officer.cycles.getDetails.invalidate(),
                utils.officer.cycles.listActive.invalidate(),
                utils.officer.cycles.listPast.invalidate(),
                utils.officer.farmers.getDetails.invalidate(),
            ]);
            setIsConfirmDeleteOpen(false);
            toast.success("Sales record deleted successfully");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete sales record");
        }
    });

    const handleDelete = () => {
        deleteMutation.mutate({ saleEventId: sale.id, historyId: sale.historyId });
    };

    const handleSelectVersion = (reportId: string) => {
        if (reportId === selectedReport?.id) return;

        if (sortedReports.length > 1) {
            setPendingVersionId(reportId);
            setShowVersionPicker(false);
        } else {
            setSelectedVersionId(reportId);
            setShowVersionPicker(false);
            if (onVersionSwitch) onVersionSwitch(sale.id, reportId);
        }
    };

    const confirmVersionSwitch = () => {
        if (!pendingVersionId) return;
        setSelectedVersionId(pendingVersionId);
        if (onVersionSwitch) onVersionSwitch(sale.id, pendingVersionId);

        if (isLatest) {
            setIsSwitchingVersion(true);
            setActiveMutation.mutate({
                saleEventId: sale.id,
                saleReportId: pendingVersionId,
            });
        }
        setPendingVersionId(null);
    };

    const pendingReport = pendingVersionId ? sortedReports.find((r: any) => r.id === pendingVersionId) : null;
    const versionDiffFields = pendingReport && selectedReport ? [
        { label: "Birds Sold", before: selectedReport.birdsSold, after: pendingReport.birdsSold, type: "number" as const },
        { label: "Mortality", before: selectedReport.totalMortality, after: pendingReport.totalMortality, type: "number" as const, invertColor: true },
        { label: "Weight", before: selectedReport.totalWeight, after: pendingReport.totalWeight, type: "number" as const, unit: "kg" },
        { label: "Price/kg", before: selectedReport.pricePerKg, after: pendingReport.pricePerKg, type: "number" as const, unit: "৳" },
        { label: "Total Amount", before: selectedReport.totalAmount, after: pendingReport.totalAmount, type: "number" as const, unit: "৳" },
        { label: "Cash Rcvd", before: selectedReport.cashReceived, after: pendingReport.cashReceived, type: "number" as const, unit: "৳" },
        { label: "Deposit", before: selectedReport.depositReceived, after: pendingReport.depositReceived, type: "number" as const, unit: "৳" },
        { label: "Medicine", before: selectedReport.medicineCost, after: pendingReport.medicineCost, type: "number" as const, unit: "৳" },
        { label: "Sale Date", before: selectedReport.saleDate || selectedReport.createdAt, after: pendingReport.saleDate || pendingReport.createdAt, type: "date" as const },
        { label: "DOC Date", before: selectedReport.officialInputDate || sale.officialInputDate || sale.cycle?.officialInputDate || sale.history?.startDate || sale.cycle?.createdAt, after: pendingReport.officialInputDate || sale.officialInputDate || sale.cycle?.officialInputDate || sale.history?.startDate || sale.cycle?.createdAt, type: "date" as const },
        { label: "Age", before: selectedReport.age, after: pendingReport.age, type: "number" as const, unit: "days" },
        { label: "Rec. Price", before: selectedReport.recoveryPrice, after: pendingReport.recoveryPrice, type: "number" as const, unit: "৳" },
        { label: "Feed/Bag", before: selectedReport.feedPriceUsed, after: pendingReport.feedPriceUsed, type: "number" as const, unit: "৳" },
        { label: "DOC Price", before: selectedReport.docPriceUsed, after: pendingReport.docPriceUsed, type: "number" as const, unit: "৳" },
        { label: "Party", before: selectedReport.party || sale.party || "N/A", after: pendingReport.party || sale.party || "N/A", type: "text" as const },
        ...getFeedDiffFields(selectedReport.feedConsumed, pendingReport.feedConsumed, "Consumed"),
        ...getFeedDiffFields(selectedReport.feedStock, pendingReport.feedStock, "Returned")
    ] : [];

    const displayReport = selectedReport || sale;
    const displayBirdsSold = displayReport.birdsSold ?? 0;
    const displayTotalWeight = String(displayReport.totalWeight ?? "0");
    const displayAvgWeight = displayReport.birdsSold > 0
        ? (parseFloat(displayReport.totalWeight || "0") / displayReport.birdsSold).toFixed(2)
        : "0";
    const displayPricePerKg = String(displayReport.pricePerKg ?? "0");
    const displayTotalAmount = String(displayReport.totalAmount ?? "0");
    const displayMortality = (displayReport && displayReport.totalMortality !== undefined && displayReport.totalMortality !== null) ? displayReport.totalMortality : sale.totalMortality;

    const displaySaleDate = selectedReport?.saleDate || sale.saleDate;
    const isLatestVersion = selectedReport?.id === sortedReports[0]?.id;

    const highlightBg = highlightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: colorScheme === 'dark'
            ? ['rgba(32, 26, 26, 0.98)', 'rgba(6, 98, 67, 0.08)']
            : ['rgba(255, 255, 255, 1)', 'rgba(16, 185, 129, 0.12)'],
    });


    const highlightScale = highlightAnim.interpolate({
        inputRange: [0, 0.1, 0.9, 1],
        outputRange: [1, 1.03, 1.03, 1],
    });

    return (
        <Animated.View style={{ transform: [{ scale: highlightScale }], zIndex: isHighlighted ? 50 : 1 }}>
            <AnimatedCard
                className="mb-3 relative overflow-hidden border border-border dark:border-border/30 "
                style={{
                    backgroundColor: highlightBg as any,
                }}
            >
                {(isSwitchingVersion || deleteMutation.isPending) && (
                    <View
                        className="absolute inset-0 items-center justify-center rounded-xl"
                        style={{
                            backgroundColor: overlayBg,
                            zIndex: 200,
                            elevation: 10
                        }}
                    >
                        {/* Removed withGlow to test for the Android SVG filter bug */}
                        <BirdyLoader size={48} color="#10b981" />

                        <Text className="text-xs font-black text-emerald-600 uppercase mt-4 tracking-[0.2em]">
                            {deleteMutation.isPending ? "Deleting Record" : "Updating Version"}
                        </Text>
                    </View>
                )}
                <CardContent className="p-0">
                    {/* Header */}
                    <View className="gap-x-2 px-4 py-3 bg-transparent border-b border-border flex-row items-start justify-between">
                        <View className="flex-1 items-start justify-start gap-x-4">
                            <View className="flex-row items-start justify-start gap-2 mb-1">
                                <Pressable
                                    className="flex max-w-[85%] flex-shrink"
                                    disabled={!showFarmerName}
                                    onPress={() => {
                                        if (showFarmerName) {
                                            const farmerId = sale.farmerId || sale.cycle?.farmerId || sale.cycle?.farmer?.id || sale.history?.farmerId || sale.history?.farmer?.id;
                                            if (farmerId) {
                                                router.push(`/farmer/${farmerId}` as any);
                                            }
                                        }
                                    }}
                                >
                                    <Text className={`font-bold text-base underline ${showFarmerName ? 'text-emerald-600 dark:text-emerald-400' : ''}`} numberOfLines={2}>
                                        {showFarmerName
                                            ? (sale.farmerName || sale.cycle?.farmer?.name || sale.history?.farmer?.name || "Unknown Farmer")
                                            : format(new Date(displaySaleDate), "dd MMM yyyy")}
                                    </Text>
                                </Pressable>
                                {isLatest && (
                                    <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 py-0 h-5 px-1.5 shrink-0">
                                        <Text className="text-emerald-600 text-[10px] font-bold uppercase">Latest</Text>
                                    </Badge>
                                )}
                                {showOfficerName && selectedReport?.createdByUser?.name && (
                                    <Badge variant="outline" className="border-blue-500 bg-blue-500/10 py-0 h-5 px-1.5 shrink-0">
                                        <Text className="text-blue-600 text-[10px] font-bold uppercase">{selectedReport.createdByUser.name}</Text>
                                    </Badge>
                                )}
                            </View>
                            <Text className="text-xs text-muted-foreground">{sale.location}</Text>
                        </View>

                        {isLatest && (
                            <View className="flex-row gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 border-amber-500/20 bg-amber-500/5 flex-row gap-1.5 active:bg-amber-500/10"
                                    onPress={() => setIsAdjustModalOpen(true)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Icon as={Edit} size={14} className="text-amber-600" />
                                    <Text className="text-amber-600 font-bold text-xs">Adjust</Text>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 border-destructive/20 bg-destructive/5 items-center justify-center active:bg-destructive/10"
                                    onPress={() => setIsConfirmDeleteOpen(true)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <BirdyLoader size={12} color="#ef4444" />
                                    ) : (
                                        <Icon as={Trash2} size={14} className="text-destructive" />
                                    )}
                                </Button>
                            </View>
                        )}
                    </View>

                    {/* Active Version Summary */}
                    <View className="p-4">
                        <View className="p-3 rounded-xl border bg-background/50 border-border/30">
                            {/* Summary Header */}
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-xs font-bold text-muted-foreground uppercase">Sale Summary</Text>
                                    {sale.cycleContext?.birdType && (
                                        <View className="bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                            <Text className="text-[9px] font-black text-primary uppercase">{sale.cycleContext.birdType}</Text>
                                        </View>
                                    )}
                                </View>

                                {isLatestVersion ? (
                                    <View className="flex-row items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                        <Icon as={CheckCircle2} size={10} className="text-emerald-500" />
                                        <Text className="text-[9px] font-black text-emerald-600 uppercase">Settled</Text>
                                    </View>
                                ) : (
                                    <Badge variant="outline" className="h-5 px-1.5 border-amber-500/30 bg-amber-500/5">
                                        <Text className="text-[8px] text-amber-600 font-black uppercase">Archived</Text>
                                    </Badge>
                                )}
                            </View>

                            <View className="flex-row justify-between pt-2 border-t border-border/10">
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Birds</Text>
                                    <Text className="font-bold text-foreground">{displayBirdsSold}</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Weight</Text>
                                    <Text className="font-bold text-blue-600 dark:text-blue-400">{displayTotalWeight} kg</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Price/kg</Text>
                                    <Text className="font-bold text-amber-600 dark:text-amber-400">৳{displayPricePerKg}</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Total Amount</Text>
                                    <Text className="font-black text-emerald-600 dark:text-emerald-400">৳{parseFloat(displayTotalAmount).toLocaleString()}</Text>
                                </View>
                            </View>

                            {selectedReport?.adjustmentNote && (
                                <View className="mt-3 p-2 bg-background border border-border/50 rounded-md">
                                    <Text className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">Reason</Text>
                                    <Text className="text-xs text-foreground italic">{selectedReport.adjustmentNote}</Text>
                                </View>
                            )}
                        </View>

                        {/* Cycle Link + Prev/Next Navigation */}
                        {(sale.cycleId || sale.historyId || sale.previousSaleId || sale.nextSaleId) && (
                            <View className="mt-3 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-2">
                                    {(sale.cycleId || sale.historyId) && onCyclePress && (
                                        <Pressable
                                            onPress={() => onCyclePress(sale.cycleId || sale.historyId)}
                                            className="flex-row items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded active:bg-primary/20"
                                        >
                                            <Text className="text-[10px] font-bold text-primary">View Cycle</Text>
                                            <Icon as={ExternalLink} size={10} className="text-primary" />
                                        </Pressable>
                                    )}

                                    {sale.cycleContext?.isEnded && (
                                        <View className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
                                            <Text className="text-[9px] font-black text-amber-600 uppercase">Ended</Text>
                                        </View>
                                    )}
                                    {(selectedReport?.party || sale.party) && (
                                        <Badge variant="outline" className="rounded-sm">
                                            <Text className="font-bold rounded-sm">
                                                Note: {selectedReport?.party || sale.party}
                                            </Text>
                                        </Badge>
                                    )}

                                </View>
                                <View className="flex-row items-center gap-1">
                                    {sale.previousSaleId && onNavigateToSale && (
                                        <Pressable
                                            onPress={() => {
                                                setIsNavigatingPrev(true);
                                                onNavigateToSale(sale.previousSaleId);
                                                setTimeout(() => setIsNavigatingPrev(false), 1200);
                                            }}
                                            disabled={isNavigatingPrev || isNavigatingNext}
                                            className="flex-row items-center gap-1 px-2 py-1 bg-muted border border-border/30 rounded active:bg-muted/50"
                                        >
                                            {isNavigatingPrev ? (
                                                <Loader2 size={12} color="#10b981" />
                                            ) : (
                                                <Icon as={ChevronLeft} size={12} className="text-muted-foreground" />
                                            )}
                                            <Text className="text-[10px] font-bold text-muted-foreground">Previous Sale</Text>
                                        </Pressable>
                                    )}
                                    {sale.nextSaleId && onNavigateToSale && (
                                        <Pressable
                                            onPress={() => {
                                                setIsNavigatingNext(true);
                                                onNavigateToSale(sale.nextSaleId);
                                                setTimeout(() => setIsNavigatingNext(false), 1200);
                                            }}
                                            disabled={isNavigatingPrev || isNavigatingNext}
                                            className="flex-row items-center gap-1 px-2 py-1 bg-muted border border-border/30 rounded active:bg-muted/50"
                                        >
                                            <Text className="text-[10px] font-bold text-muted-foreground">Next Sale</Text>
                                            {isNavigatingNext ? (
                                                <Loader2 size={12} color="#10b981" />
                                            ) : (
                                                <Icon as={ChevronRight} size={12} className="text-muted-foreground" />
                                            )}
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        )}

                        {sortedReports.length > 1 && (
                            <View className="mt-3 flex-row items-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 flex-row gap-1.5 bg-muted "
                                    onPress={() => setShowVersionPicker(!showVersionPicker)}
                                >
                                    <Icon as={History} size={14} className="text-muted-foreground mr-1" />
                                    <Text className="text-xs font-bold text-foreground">
                                        Version {sortedReports.length - sortedReports.findIndex((r: any) => r.id === selectedReport?.id)}
                                    </Text>
                                    <Icon as={showVersionPicker ? ChevronUp : ChevronDown} size={14} className="text-muted-foreground opacity-50 ml-1" />
                                </Button>
                            </View>
                        )}

                        {showVersionPicker && sortedReports.length > 1 && (
                            <View className="mt-2 border border-border/50 rounded-lg overflow-hidden">
                                {sortedReports.map((report: any, idx: number) => (
                                    <Pressable
                                        key={report.id}
                                        onPress={() => handleSelectVersion(report.id)}
                                        className={`p-3 flex-row items-center justify-between ${report.id === selectedReport?.id ? 'bg-primary/10' : 'bg-muted/10'
                                            } ${idx < sortedReports.length - 1 ? 'border-b border-border/30' : ''}`}
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className={`w-6 h-6 rounded-full items-center justify-center ${report.id === selectedReport?.id ? 'bg-primary' : 'bg-muted-foreground/20'}`}>
                                                <Text className={`text-[10px] font-black ${report.id === selectedReport?.id ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                                    {sortedReports.length - idx}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text className={`text-xs font-bold ${report.id === selectedReport?.id ? 'text-primary' : 'text-foreground'}`}>
                                                    Version {sortedReports.length - idx}
                                                    {idx === 0 && (
                                                        <Text className="text-[10px] text-emerald-600 font-black ml-1 uppercase"> • Latest</Text>
                                                    )}
                                                </Text>
                                                <Text className="text-[10px] text-muted-foreground">{format(new Date(report.createdAt), "dd MMM, HH:mm")}</Text>
                                            </View>
                                        </View>
                                        {report.id === selectedReport?.id ? (
                                            <Icon as={Check} size={14} className="text-primary" />
                                        ) : (
                                            <Icon as={Eye} size={12} className="text-muted-foreground/40" />
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                </CardContent>

                <View className="flex-row items-center border-t border-border/50 bg-muted/5">
                    <Pressable
                        onPress={() => setShowDetails(!showDetails)}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3.5 border-r border-border/50 active:bg-muted/10"
                    >
                        <Icon as={showDetails ? EyeOff : Eye} size={14} className="text-primary" />
                        <Text className="text-xs text-primary font-bold uppercase tracking-tight">
                            {showDetails ? "Hide Details" : "View Details"}
                        </Text>
                        <Icon as={showDetails ? ChevronUp : ChevronDown} size={12} className="text-muted-foreground" />
                    </Pressable>
                    <Pressable
                        onPress={handleCopy}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3.5 active:bg-muted/10"
                    >
                        <Icon as={copied ? Check : ClipboardCopy} size={14} className={copied ? "text-emerald-500" : "text-amber-500"} />
                        <Text className={`text-xs font-bold uppercase tracking-tight ${copied ? "text-emerald-500" : "text-amber-600"}`}>
                            {copied ? "Copied" : "Copy Report"}
                        </Text>
                    </Pressable>
                </View>

                {showDetails && (
                    <View className="px-4 pb-4 pt-2 border-t border-border/30 relative">
                        <View className={isSwitchingVersion ? "opacity-30" : ""} pointerEvents={isSwitchingVersion ? "none" : "auto"}>
                            <SaleDetailsContent
                                sale={sale}
                                isLatest={isLatest}
                                displayBirdsSold={displayBirdsSold}
                                displayTotalWeight={displayTotalWeight}
                                displayAvgWeight={displayAvgWeight}
                                displayPricePerKg={displayPricePerKg}
                                displayTotalAmount={displayTotalAmount}
                                displayMortality={displayMortality}
                                selectedReport={selectedReport}
                            />
                        </View>

                    </View>
                )}

                {isAdjustModalOpen && (
                    <AdjustSaleModal
                        open={isAdjustModalOpen}
                        onOpenChange={setIsAdjustModalOpen}
                        saleEvent={sale}
                        latestReport={sortedReports[0]}
                        onSuccess={() => {
                            utils.officer.sales.getSaleEvents.invalidate();
                        }}
                    />
                )}

                <ConfirmModal
                    visible={isConfirmDeleteOpen}
                    title="Delete Sales History?"
                    description={sale.cycleContext?.isEnded
                        ? "This will delete the sale records for this batch. Batch stats and status will NOT be changed."
                        : "This will delete ALL sales records for this cycle and revert stats (mortality/population). This cannot be undone."}
                    confirmText="Delete"
                    cancelText="Keep"
                    destructive
                    isLoading={deleteMutation.isPending}
                    onConfirm={handleDelete}
                    onCancel={() => setIsConfirmDeleteOpen(false)}
                />

                <SaleDiffModal
                    visible={!!pendingVersionId}
                    title="Switch Version?"
                    description="The following values will change when you switch to this version."
                    fields={versionDiffFields}
                    confirmText="Switch Version"
                    cancelText="Keep Current"
                    isLoading={isSwitchingVersion}
                    onConfirm={confirmVersionSwitch}
                    onCancel={() => setPendingVersionId(null)}
                />
            </AnimatedCard>
        </Animated.View>
    );
}
