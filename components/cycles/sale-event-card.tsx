import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardCopy, Edit, Eye, EyeOff, Loader2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "sonner-native";
import { AdjustSaleModal } from "./adjust-sale-modal";
import { SaleDetailsContent } from "./sale-details-content";

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
    console.log(data)
    if (!data) return [];
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return []; }
    }
    return data;
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

    return `Date: ${format(new Date(sale.saleDate), "dd/MM/yyyy")}

Farmer: ${sale.farmerName || "N/A"}
Location: ${sale.location || "N/A"}
House bird : ${sale.houseBirds || 0}pcs
Total Sold : ${birdsSold}pcs
Total Mortality: ${totalMortality} pcs
${(!isEnded || !isLatest) ? `\nRemaining Birds: ${(sale.cycleContext?.doc || 0) - totalMortality - birdsSold} pcs` : ""}

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
}

export function SaleEventCard({ sale, isLatest = false }: SaleEventCardProps) {
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showVersionPicker, setShowVersionPicker] = useState(false);
    const [copied, setCopied] = useState(false);

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
        ? [...sale.reports].sort((a: any, b: any) => b.version - a.version)
        : [];

    // Default to the persisted selectedReportId, or latest version
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
        sale.selectedReportId || null
    );
    const selectedReport = selectedVersionId
        ? sortedReports.find((r: any) => r.id === selectedVersionId) || sortedReports[0]
        : sortedReports[0];

    // Backend mutation to persist version selection
    const setActiveMutation = trpc.officer.sales.setActiveVersion.useMutation({
        onSuccess: () => {
            utils.officer.sales.getSaleEvents.invalidate();
            utils.officer.cycles.getDetails.invalidate();
        },
    });

    const handleSelectVersion = (reportId: string) => {
        setSelectedVersionId(reportId);
        setShowVersionPicker(false);

        // Persist to backend
        setActiveMutation.mutate({
            saleEventId: sale.id,
            saleReportId: reportId,
        });
    };

    // Derive display values from selected report
    const displayReport = selectedReport || sale;
    const displayBirdsSold = displayReport.birdsSold ?? 0;
    const displayTotalWeight = String(displayReport.totalWeight ?? "0");
    const displayAvgWeight = displayReport.birdsSold > 0
        ? (parseFloat(displayReport.totalWeight || "0") / displayReport.birdsSold).toFixed(2)
        : "0";
    const displayPricePerKg = String(displayReport.pricePerKg ?? "0");
    const displayTotalAmount = String(displayReport.totalAmount ?? "0");
    const displayMortality = displayReport.mortalityChange ?? sale.mortalityChange ?? 0;
    const isLatestVersion = selectedReport?.id === sortedReports[0]?.id;

    return (
        <Card className="mb-4 overflow-hidden border-border/50">
            <CardContent className="p-0">
                {/* Header */}
                <View className="px-4 py-3 bg-muted/30 border-b border-border/50 flex-row items-center justify-between">
                    <View>
                        <View className="flex-row items-center gap-2 mb-1">
                            <Text className="font-bold text-base">
                                {format(new Date(sale.saleDate), "dd MMM yyyy")}
                            </Text>
                            {isLatest && (
                                <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 py-0 h-5 px-1.5">
                                    <Text className="text-emerald-600 text-[10px] font-bold uppercase">Latest</Text>
                                </Badge>
                            )}
                        </View>
                        <Text className="text-xs text-muted-foreground">{sale.location}</Text>
                    </View>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 border-primary/20 bg-primary/5 flex-row gap-1.5"
                        onPress={() => setIsAdjustModalOpen(true)}
                    >
                        <Icon as={Edit} size={14} className="text-primary" />
                        <Text className="text-primary font-bold text-xs">Adjust</Text>
                    </Button>
                </View>

                {/* Active Version Summary */}
                <View className="p-4">
                    <View className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                        {/* Version selector header */}
                        <Pressable
                            onPress={() => sortedReports.length > 1 && setShowVersionPicker(!showVersionPicker)}
                            className="flex-row justify-between items-center mb-2"
                        >
                            <View className="flex-row items-center gap-2">
                                <View className="w-6 h-6 rounded-full items-center justify-center bg-primary/20">
                                    <Text className="text-xs font-bold text-primary">
                                        v{selectedReport?.version || 1}
                                    </Text>
                                </View>
                                <Text className="text-xs text-muted-foreground">
                                    {selectedReport ? format(new Date(selectedReport.createdAt), "HH:mm a, d MMM") : ""}
                                </Text>
                                {sortedReports.length > 1 && (
                                    <View className="flex-row items-center">
                                        <Icon as={showVersionPicker ? ChevronUp : ChevronDown} size={14} className="text-primary" />
                                        <Text className="text-[10px] text-primary font-bold ml-0.5">
                                            {sortedReports.length} versions
                                        </Text>
                                    </View>
                                )}
                                {setActiveMutation.isPending && (
                                    <Icon as={Loader2} size={12} className="text-primary animate-spin" />
                                )}
                            </View>
                            <View className="flex-row items-center gap-1">
                                {isLatestVersion ? (
                                    <>
                                        <Icon as={CheckCircle2} size={12} className="text-primary" />
                                        <Text className="text-[10px] font-bold text-primary uppercase">Latest</Text>
                                    </>
                                ) : (
                                    <Badge variant="outline" className="h-4 px-1.5 border-amber-500/40 bg-amber-500/10">
                                        <Text className="text-[8px] text-amber-600 font-bold uppercase">Older Version</Text>
                                    </Badge>
                                )}
                            </View>
                        </Pressable>

                        {/* Compact stats row */}
                        <View className="flex-row justify-between pt-2 border-t border-border/30">
                            <View>
                                <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Birds</Text>
                                <Text className="font-bold">{displayBirdsSold}</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Weight</Text>
                                <Text className="font-bold">{displayTotalWeight} kg</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Price/kg</Text>
                                <Text className="font-bold">৳{displayPricePerKg}</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Total</Text>
                                <Text className="font-bold text-primary">৳{parseFloat(displayTotalAmount).toLocaleString()}</Text>
                            </View>
                        </View>

                        {selectedReport?.adjustmentNote && (
                            <View className="mt-3 p-2 bg-background border border-border/50 rounded-md">
                                <Text className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">Reason</Text>
                                <Text className="text-xs text-foreground italic">{selectedReport.adjustmentNote}</Text>
                            </View>
                        )}
                    </View>

                    {/* Version Picker Dropdown */}
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
                                        <View className={`w-7 h-7 rounded-full items-center justify-center ${report.id === selectedReport?.id ? 'bg-primary/20' : 'bg-muted'}`}>
                                            <Text className={`text-xs font-bold ${report.id === selectedReport?.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                                v{report.version}
                                            </Text>
                                        </View>
                                        <View>
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-xs font-medium text-foreground">
                                                    {format(new Date(report.createdAt), "HH:mm a, d MMM")}
                                                </Text>
                                                {idx === 0 && (
                                                    <Badge variant="outline" className="h-4 px-1 border-emerald-500/40 bg-emerald-500/10">
                                                        <Text className="text-[8px] text-emerald-600 font-bold">LATEST</Text>
                                                    </Badge>
                                                )}
                                            </View>
                                            <Text className="text-[10px] text-muted-foreground mt-0.5">
                                                {report.birdsSold} birds · {report.totalWeight}kg · ৳{parseFloat(report.totalAmount || "0").toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                    {report.id === selectedReport?.id && (
                                        <Icon as={CheckCircle2} size={16} className="text-primary" />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                <View className="flex-row items-center border-t border-border/50 bg-muted/10">
                    {/* Expandable Sale Details */}
                    <Pressable
                        onPress={() => setShowDetails(!showDetails)}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3 border-r border-border/50"
                    >
                        <Icon as={showDetails ? EyeOff : Eye} size={14} className="text-primary" />
                        <Text className="text-xs text-primary font-bold">
                            {showDetails ? "Hide Details" : "View Full Details"}
                        </Text>
                        <Icon as={showDetails ? ChevronUp : ChevronDown} size={12} className="text-primary" />
                    </Pressable>
                    <Pressable
                        onPress={handleCopy}
                        className="flex-1 flex-row items-center justify-center gap-2 py-3"
                    >
                        <Icon as={copied ? Check : ClipboardCopy} size={14} className={copied ? "text-emerald-500" : "text-primary"} />
                        <Text className={`text-xs font-bold ${copied ? "text-emerald-500" : "text-primary"}`}>
                            {copied ? "Copied" : "Copy Report"}
                        </Text>
                    </Pressable>
                </View>

                {showDetails && (
                    <View className="px-4 pb-4 pt-2 border-t border-border/30">
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
                )}

                {isAdjustModalOpen && (
                    <AdjustSaleModal
                        open={isAdjustModalOpen}
                        onOpenChange={setIsAdjustModalOpen}
                        saleEvent={sale}
                        latestReport={selectedReport}
                    />
                )}
            </CardContent>
        </Card>
    );
}
