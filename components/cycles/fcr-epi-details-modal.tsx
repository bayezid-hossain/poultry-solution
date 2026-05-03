import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AlertTriangle } from "lucide-react-native";
import { ScrollView, View } from "react-native";

interface FcrEpiDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fcr: number;
    epi: number;
    doc: number;
    mortality: number;
    birdsRejected?: number;
    totalBirdsSold?: number;
    age: number;
    totalWeight: number;
    feedBags: number;
}

const StatRow = ({ label, sublabel, value, highlight }: { label: string; sublabel?: string; value: string; highlight?: boolean }) => (
    <View className={`flex-row justify-between items-center p-3 rounded-xl ${highlight ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-muted/20'}`}>
        <View className="flex-1 mr-4">
            <Text className={`text-xs font-medium ${highlight ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>{label}</Text>
            {sublabel && <Text className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</Text>}
        </View>
        <Text className={`font-mono ${highlight ? 'font-bold text-lg text-blue-700 dark:text-blue-400' : 'font-semibold text-foreground'}`}>{value}</Text>
    </View>
);

export const FcrEpiDetailsModal = ({
    open,
    onOpenChange,
    fcr,
    epi,
    doc,
    mortality,
    birdsRejected = 0,
    totalBirdsSold,
    age,
    totalWeight,
    feedBags,
}: FcrEpiDetailsModalProps) => {
    const survivors = doc - mortality - birdsRejected;
    const survivalRate = doc > 0 ? (survivors / doc) * 100 : 0;
    const feedKg = feedBags * 50;
    // Average weight should be calculated using total birds sold (excluding rejected)
    const effectiveBirdsSold = totalBirdsSold ?? survivors;
    const avgWeightKg = effectiveBirdsSold > 0 ? totalWeight / effectiveBirdsSold : 0;

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange} fullScreen>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-2 pb-4 border-b border-border/50">
                <View>
                    <Text className="text-lg font-bold text-foreground">Performance Details</Text>
                    <Text className="text-xs text-muted-foreground">Detailed breakdown of FCR & EPI</Text>
                </View>
                <Button variant="ghost" size="sm" onPress={() => onOpenChange(false)}>
                    <Text className="text-primary font-bold">Done</Text>
                </Button>
            </View>

            <ScrollView contentContainerClassName="p-4 pb-10 gap-6" keyboardShouldPersistTaps="handled">
                {/* Step 1: FCR */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-full bg-blue-500/10 items-center justify-center">
                            <Text className="text-xs font-bold text-blue-600 dark:text-blue-400">1</Text>
                        </View>
                        <Text className="text-sm font-bold text-blue-600 dark:text-blue-400">Feed Conversion Ratio (FCR)</Text>
                    </View>
                    <View className="ml-9 gap-2">
                        <StatRow
                            label="Total Feed Consumed"
                            sublabel={`${feedBags.toLocaleString()} bags × 50kg`}
                            value={`${feedKg.toLocaleString()} kg`}
                        />
                        <StatRow
                            label="Total Live Weight Sold"
                            value={`${totalWeight.toLocaleString()} kg`}
                        />
                        <StatRow
                            label="Final FCR"
                            sublabel="Total Feed (kg) / Total Weight (kg)"
                            value={fcr.toFixed(2)}
                            highlight
                        />
                    </View>
                </View>

                <View className="h-[1px] bg-border/50" />

                {/* Step 2: Survival & Growth */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-full bg-emerald-500/10 items-center justify-center">
                            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">2</Text>
                        </View>
                        <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Survival & Growth</Text>
                    </View>
                    <View className="ml-9 gap-2">
                        <StatRow
                            label="Survival Rate"
                            sublabel={`(${survivors.toLocaleString()} / ${doc.toLocaleString()}) × 100`}
                            value={`${survivalRate.toFixed(1)}%`}
                        />
                        <StatRow
                            label="Avg. Weight per Bird"
                            sublabel={`${totalWeight.toLocaleString()}kg / ${effectiveBirdsSold.toLocaleString()} birds sold`}
                            value={`${avgWeightKg.toFixed(3)} kg`}
                        />
                    </View>
                </View>

                <View className="h-[1px] bg-border/50" />

                {/* Step 3: EPI */}
                <View className="gap-3">
                    <View className="flex-row items-center gap-2">
                        <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
                            <Text className="text-xs font-bold text-primary">3</Text>
                        </View>
                        <Text className="text-sm font-bold text-primary">European Production Index (EPI)</Text>
                    </View>
                    <View className="ml-9 gap-2">
                        <StatRow
                            label="Cycle Duration"
                            value={`${age} Days`}
                        />
                        <View className="flex-row justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
                            <View className="flex-1 mr-4">
                                <Text className="text-xs font-bold text-foreground">Final EPI</Text>
                                <Text className="text-[10px] text-muted-foreground/70 mt-0.5">(Survival% × AvgWt) / (FCR × Age) × 100</Text>
                            </View>
                            <Text className="font-mono font-bold text-lg text-primary">{epi.toFixed(0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Educational Note */}
                <View className="flex-row items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <Icon as={AlertTriangle} size={16} className="text-amber-600 mt-0.5" />
                    <Text className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed flex-1">
                        EPI values above 300 indicate professional performance. FCR measures how many kg of feed is needed per 1kg of meat.
                    </Text>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
};
