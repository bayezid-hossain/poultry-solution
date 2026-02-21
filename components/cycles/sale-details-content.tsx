import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Info } from "lucide-react-native";
import { View } from "react-native";

type SaleEvent = any;
type SaleReport = any;

export interface SaleDetailsContentProps {
    sale: Partial<SaleEvent> & { cycleContext?: any; houseBirds?: number; cashReceived?: string; depositReceived?: string; medicineCost?: string; feedConsumed?: string; feedStock?: string };
    isLatest?: boolean;
    displayBirdsSold: number;
    displayTotalWeight: string;
    displayAvgWeight: string;
    displayPricePerKg: string;
    displayTotalAmount: string;
    displayMortality: number;
    selectedReport?: SaleReport | null;
    setShowFcrEpiModal?: (open: boolean) => void;
    setShowProfitModal?: (open: boolean) => void;
}

const formatFeedBreakdown = (feedData: string | any[] | undefined | null) => {
    if (!feedData) return "None";
    try {
        const parsed = typeof feedData === 'string' ? JSON.parse(feedData) : feedData;
        if (!Array.isArray(parsed) || parsed.length === 0) return "None";
        return parsed.map((f: any) => `${f.bags}x ${f.type || 'Feed'}`).join('\n');
    } catch {
        return "Invalid Data";
    }
};

export const SaleDetailsContent = ({
    sale,
    isLatest = false,
    displayBirdsSold,
    displayTotalWeight,
    displayAvgWeight,
    displayPricePerKg,
    displayTotalAmount,
    displayMortality,
    selectedReport,
    setShowFcrEpiModal,
}: SaleDetailsContentProps) => {
    // Inventory data from either report or parent sale
    const currentFeedConsumed = selectedReport?.feedConsumed || sale.feedConsumed;
    const currentFeedStock = selectedReport?.feedStock || sale.feedStock;

    // Calculate cumulative average weight - ONLY for the final sale of the cycle
    const cumulativeWeight = sale.cycleContext?.totalWeight || 0;
    const cumulativeBirdsSold = sale.cycleContext?.cumulativeBirdsSold || 0;
    const finalAvgWeight = (isLatest && cumulativeWeight > 0 && cumulativeBirdsSold > 0)
        ? (cumulativeWeight / cumulativeBirdsSold).toFixed(2)
        : displayAvgWeight;

    return (
        <View className="space-y-4">
            {/* FCR/EPI Row */}
            {isLatest && sale.cycleContext?.isEnded && (
                <View className="flex-row gap-4 mb-4">
                    <View className="flex-1 bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">FCR</Text>
                            {setShowFcrEpiModal && (
                                <View className="h-6 w-6 items-center justify-center rounded-full bg-blue-500/10">
                                    <Icon as={Info} size={14} className="text-blue-600" />
                                </View>
                            )}
                        </View>
                        <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">{sale.cycleContext.fcr}</Text>
                    </View>
                    <View className="flex-1 bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">EPI</Text>
                            {setShowFcrEpiModal && (
                                <View className="h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                                    <Icon as={Info} size={14} className="text-emerald-600" />
                                </View>
                            )}
                        </View>
                        <Text className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{sale.cycleContext.epi}</Text>
                    </View>
                </View>
            )}

            {/* Main Stats Grid */}
            <View className="flex-row gap-4">
                <View className="flex-1 space-y-4">
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Sale Age</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="font-bold text-foreground">{sale.cycleContext?.age || "N/A"}</Text>
                            <Text className="text-[10px] text-muted-foreground">days</Text>
                        </View>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Total DOC</Text>
                        <Text className="font-bold text-foreground">{sale.cycleContext?.doc || sale.houseBirds}</Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Birds Sold</Text>
                        <Text className="font-bold text-foreground">{displayBirdsSold}</Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Mortality</Text>
                        <Text className="font-bold text-destructive">{displayMortality}</Text>
                    </View>
                </View>

                <View className="w-[1px] bg-border/50" />

                <View className="flex-1 space-y-4">
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Total Wt</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="font-bold text-foreground">{displayTotalWeight}</Text>
                            <Text className="text-[10px] text-muted-foreground">kg</Text>
                        </View>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Avg Wt</Text>
                        <Text className="font-bold text-foreground">{finalAvgWeight}</Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Price/kg</Text>
                        <Text className="font-bold text-foreground">৳{displayPricePerKg}</Text>
                    </View>
                    <View className="flex-row justify-between items-baseline">
                        <Text className="text-muted-foreground text-xs uppercase tracking-tight font-bold">Total</Text>
                        <Text className="font-bold text-emerald-600 dark:text-emerald-400">৳{parseFloat(displayTotalAmount).toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            <View className="h-[1px] bg-border/50 my-4" />

            {/* Financial Breakdown */}
            <View className="flex-row gap-2 mb-4">
                <View className="flex-1 bg-muted/30 rounded-xl p-3 items-center">
                    <Text className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Cash</Text>
                    <Text className="font-bold text-foreground">৳{parseFloat(sale.cashReceived || "0").toLocaleString()}</Text>
                </View>
                <View className="flex-1 bg-muted/30 rounded-xl p-3 items-center">
                    <Text className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Deposit</Text>
                    <Text className="font-bold text-foreground">৳{parseFloat(sale.depositReceived || "0").toLocaleString()}</Text>
                </View>
                <View className="flex-1 bg-muted/30 rounded-xl p-3 items-center">
                    <Text className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Medicine</Text>
                    <Text className="font-bold text-foreground">৳{parseFloat(sale.medicineCost || "0").toLocaleString()}</Text>
                </View>
            </View>

            {/* Feed Info */}
            <View className="flex-row gap-4">
                <View className="flex-1">
                    <Text className="text-muted-foreground text-xs font-bold mb-1">Feed Consumed:</Text>
                    <View className="bg-muted/40 p-2 rounded-lg self-start">
                        <Text className="font-medium text-sm text-foreground">{formatFeedBreakdown(currentFeedConsumed)}</Text>
                    </View>
                </View>
                <View className="flex-1">
                    <Text className="text-muted-foreground text-xs font-bold mb-1">Feed Stock:</Text>
                    <View className="bg-muted/40 p-2 rounded-lg self-start">
                        <Text className="font-medium text-sm text-foreground">{formatFeedBreakdown(currentFeedStock)}</Text>
                    </View>
                </View>
            </View>

        </View>
    );
};
