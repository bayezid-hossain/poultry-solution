import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { BASE_SELLING_PRICE, DOC_PRICE_PER_BIRD, FEED_PRICE_PER_BAG } from "@/lib/profit-constants";
import { Coins } from "lucide-react-native";
import { Modal, ScrollView, View } from "react-native";

interface ProfitDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    revenue: number;
    actualRevenue: number;
    totalWeight: number;
    avgPrice: number;
    effectiveRate: number;
    netAdjustment: number;
    feedBags: number;
    docCount: number;
    feedCost: number;
    docCost: number;
    profit: number;
    baseRate?: number;
}

const StatRow = ({ label, sublabel, value, highlight, color }: { label: string; sublabel?: string; value: string; highlight?: boolean; color?: string }) => (
    <View className={`flex-row justify-between items-center p-3 rounded-xl ${highlight ? `${color || 'bg-primary/5 border border-primary/20'}` : 'bg-muted/20'}`}>
        <View className="flex-1 mr-4">
            <Text className={`text-xs font-medium ${highlight ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{label}</Text>
            {sublabel && <Text className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</Text>}
        </View>
        <Text className={`font-mono ${highlight ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>{value}</Text>
    </View>
);

export const ProfitDetailsModal = ({
    open,
    onOpenChange,
    revenue,
    actualRevenue,
    totalWeight,
    avgPrice,
    effectiveRate,
    netAdjustment,
    feedBags,
    docCount,
    feedCost,
    docCost,
    profit,
    baseRate = BASE_SELLING_PRICE,
}: ProfitDetailsModalProps) => {
    const adjustmentType = netAdjustment > 0 ? "surplus" : netAdjustment < 0 ? "deficit" : "neutral";

    return (
        <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onOpenChange(false)}>
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-border/50 bg-card pt-12">
                    <View>
                        <Text className="text-lg font-bold text-foreground">Profit Calculation</Text>
                        <Text className="text-xs text-muted-foreground">Step-by-step breakdown</Text>
                    </View>
                    <Button variant="ghost" size="sm" onPress={() => onOpenChange(false)}>
                        <Text className="text-primary font-bold">Done</Text>
                    </Button>
                </View>

                <ScrollView contentContainerClassName="p-4 pb-20 gap-6">
                    {/* Formula Summary */}
                    <View className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                        <Text className="text-xs font-bold text-foreground mb-1">Profit Formula:</Text>
                        <Text className="text-xs text-muted-foreground font-mono">(Weight × Effective Rate) - (Feed Cost + DOC Cost)</Text>
                        <Text className="text-[10px] text-muted-foreground/70 mt-1 font-mono">Effective Rate = max({baseRate}, {baseRate} + Σ Adjustments)</Text>
                    </View>

                    {/* Step A: Average Price */}
                    <View className="gap-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-7 h-7 rounded-full bg-blue-500/10 items-center justify-center">
                                <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">A</Text>
                            </View>
                            <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">Average Selling Price</Text>
                        </View>
                        <View className="ml-9 gap-2">
                            <StatRow label="Total Sales Income" value={`৳${Math.round(actualRevenue).toLocaleString()}`} />
                            <StatRow label="Total Meat Sold" value={`${totalWeight.toLocaleString()} kg`} />
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-bold text-foreground">Weighted Average Rate</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">Total Income / Total Weight</Text>
                                </View>
                                <Text className="font-mono font-bold text-blue-700 dark:text-blue-400">৳{avgPrice.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-[1px] bg-border/50" />

                    {/* Step 1: Effective Rate */}
                    <View className="gap-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
                                <Text className="text-xs font-bold text-primary">1</Text>
                            </View>
                            <Text className="text-sm font-bold text-primary">Effective Rate Calculation</Text>
                        </View>
                        <View className="ml-9 gap-2">
                            <StatRow label="Base Rate" value={`৳${baseRate}`} />
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-muted/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-medium text-muted-foreground">Total Net Adjustment</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        {adjustmentType === "surplus" ? `Σ Surplus(P-${baseRate})/2` : adjustmentType === "deficit" ? `Σ Deficit(P-${baseRate})` : "No adjustment"}
                                    </Text>
                                </View>
                                <Text className={`font-mono font-semibold ${netAdjustment >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {netAdjustment >= 0 ? "+" : ""}{netAdjustment.toFixed(2)} tk
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-primary/5 border border-primary/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-bold text-foreground">Farmer's Effective Rate</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        max({baseRate}, {baseRate} + {netAdjustment.toFixed(2)})
                                    </Text>
                                </View>
                                <Text className="font-mono font-bold text-primary">৳{effectiveRate.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-[1px] bg-border/50" />

                    {/* Step 2: Revenue */}
                    <View className="gap-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-7 h-7 rounded-full bg-emerald-500/10 items-center justify-center">
                                <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">2</Text>
                            </View>
                            <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Formula Revenue</Text>
                        </View>
                        <View className="ml-9 gap-2">
                            <StatRow label="Total Meat Sold" value={`${totalWeight.toLocaleString()} kg`} />
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-bold text-foreground">Total Formula Revenue</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        {totalWeight.toLocaleString()} kg × ৳{effectiveRate.toFixed(2)}
                                    </Text>
                                </View>
                                <Text className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                    ৳{Math.round(revenue).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-[1px] bg-border/50" />

                    {/* Step 3: Costs */}
                    <View className="gap-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-7 h-7 rounded-full bg-red-500/10 items-center justify-center">
                                <Text className="text-xs font-bold text-red-600 dark:text-red-400">3</Text>
                            </View>
                            <Text className="text-sm font-bold text-red-600 dark:text-red-400">Cost Deduction</Text>
                        </View>
                        <View className="ml-9 gap-2">
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-muted/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-medium text-muted-foreground">Feed Cost</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        {feedBags.toLocaleString()} bags × ৳{FEED_PRICE_PER_BAG.toLocaleString()}
                                    </Text>
                                </View>
                                <Text className="font-mono font-semibold text-red-500/80">- ৳{Math.round(feedCost).toLocaleString()}</Text>
                            </View>
                            <View className="flex-row justify-between items-center p-3 rounded-xl bg-muted/20">
                                <View className="flex-1 mr-4">
                                    <Text className="text-xs font-medium text-muted-foreground">DOC Cost</Text>
                                    <Text className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        {docCount.toLocaleString()} birds × ৳{DOC_PRICE_PER_BIRD}
                                    </Text>
                                </View>
                                <Text className="font-mono font-semibold text-red-500/80">- ৳{Math.round(docCost).toLocaleString()}</Text>
                            </View>
                            <View className="items-end pt-1">
                                <Text className="text-xs font-bold text-red-600">
                                    Total Deductions: ৳{Math.round(feedCost + docCost).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-[1px] bg-border/50" />

                    {/* Final Profit */}
                    <View className={`p-5 rounded-2xl border ${profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center gap-2">
                                <Icon as={Coins} size={20} className={profit >= 0 ? "text-emerald-600" : "text-red-600"} />
                                <View>
                                    <Text className="font-bold text-lg text-foreground">Net Profit</Text>
                                    <Text className="text-xs text-muted-foreground">Revenue - (Feed + DOC)</Text>
                                </View>
                            </View>
                            <Text className={`text-2xl font-black font-mono ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                ৳{Math.round(profit).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};
