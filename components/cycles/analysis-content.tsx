import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { AlertTriangle, Calculator, Lightbulb, Scale, TrendingUp } from "lucide-react-native";
import { View } from "react-native";

interface NormalizedCycle {
    id: string;
    doc: number;
    mortality: number;
    age: number;
    intake: number;
}

interface HistoryRecord {
    doc: number;
    mortality: number;
    finalIntake: number;
}

export const AnalysisContent = ({
    cycle,
    history
}: {
    cycle: NormalizedCycle,
    history: HistoryRecord[]
}) => {
    const doc = cycle.doc || 0;
    const mortality = cycle.mortality || 0;
    const currentMortalityRate = doc > 0 ? (mortality / doc) * 100 : 0;

    // Calculate Historical Averages (safely)
    const historicalAvgMortality = history.length > 0
        ? history.reduce((acc: number, h: HistoryRecord) => {
            const hDoc = h.doc || 0;
            const hMort = h.mortality || 0;
            return acc + (hDoc > 0 ? (hMort / hDoc * 100) : 0);
        }, 0) / history.length
        : 0;

    // Feed Calculations
    const intake = cycle.intake || 0;
    const age = cycle.age || 0;
    const avgDailyIntake = age > 0 ? (intake / age) : 0;

    // Feed per Bird (Efficiency Proxy)
    const liveBirds = Math.max(0, doc - mortality);
    const currentFeedPerBird = liveBirds > 0 ? (intake / liveBirds) : 0; // Bags per bird

    const historicalAvgFeedPerBird = history.length > 0
        ? history.reduce((acc: number, h: HistoryRecord) => {
            const hLive = (h.doc || 0) - (h.mortality || 0);
            const hIntake = h.finalIntake || 0;
            return acc + (hLive > 0 ? hIntake / hLive : 0);
        }, 0) / history.length
        : 0;

    // --- Logic-Based Suggestions ---
    const suggestions = [];

    // Mortality Logic
    if (currentMortalityRate > 5) {
        suggestions.push({
            type: "critical",
            title: "High Mortality Alert",
            text: `Current mortality (${currentMortalityRate.toFixed(2)}%) is above the 5% warning threshold. Isolate sick birds immediately.`
        });
    } else if (history.length > 0 && currentMortalityRate > historicalAvgMortality * 1.2) {
        suggestions.push({
            type: "warning",
            title: "Performance Dip",
            text: `Mortality is 20% higher than your historical average (${historicalAvgMortality.toFixed(2)}%). Review ventilation or litter quality.`
        });
    }

    return (
        <View className="space-y-4 gap-y-4">
            <View className="flex-row gap-4">
                {/* Consumption Insights */}
                <View className="flex-1 bg-muted/30 border border-border/50 rounded-2xl p-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Icon as={Calculator} size={16} className="text-primary" />
                        <Text className="text-sm font-medium text-foreground">Consumption Insights</Text>
                    </View>
                    <View className="flex-row justify-between items-end mb-3">
                        <View>
                            <Text className="text-xl font-bold text-foreground">
                                {avgDailyIntake.toFixed(2)} bags
                            </Text>
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Daily Avg Consumption</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-sm font-bold text-foreground">{currentFeedPerBird.toFixed(3)}</Text>
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Bags per Bird</Text>
                        </View>
                    </View>
                    <View className="pt-3 border-t border-border/20">
                        <Text className="text-[10px] text-muted-foreground italic">
                            Efficiency calculated on {liveBirds} live birds.
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row gap-4">
                {/* Historical Benchmark */}
                <View className="flex-1 bg-card border border-border/50 rounded-2xl p-4">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Icon as={Scale} size={16} className="text-primary" />
                        <Text className="text-sm font-medium text-foreground">Historical Benchmark</Text>
                    </View>
                    <View className="space-y-1 mb-2">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Mortality Status</Text>
                            <Text className={`font-bold text-xs ${currentMortalityRate <= historicalAvgMortality ? "text-emerald-500" : "text-destructive"}`}>
                                {currentMortalityRate <= historicalAvgMortality ? "Better" : "Worse"} than usual
                            </Text>
                        </View>
                        <View className="flex-row justify-between items-center my-1">
                            <Text className="text-[10px] text-muted-foreground">Current: {currentMortalityRate.toFixed(2)}%</Text>
                            <Text className="text-[10px] text-muted-foreground">Avg: {historicalAvgMortality.toFixed(2)}%</Text>
                        </View>
                    </View>
                    {historicalAvgFeedPerBird > 0 && (
                        <View className="space-y-1 pt-2 border-t border-border/20">
                            <View className="flex-row justify-between items-center mt-1">
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Avg Consumed</Text>
                                <Text className="font-bold text-xs text-foreground">{historicalAvgFeedPerBird.toFixed(3)} bags/bird</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Smart Suggestions */}
            <View className="bg-card border border-border/50 rounded-2xl overflow-hidden mt-1">
                <View className="p-4 border-b border-border/20 flex-row items-center gap-2">
                    <Icon as={Lightbulb} size={20} className="text-amber-500" />
                    <View>
                        <Text className="text-base font-bold text-foreground">Smart Suggestions</Text>
                        <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-80 mt-0.5">Automated insights from your data</Text>
                    </View>
                </View>
                <View className="p-4 gap-y-3 flex-col">
                    {suggestions.length === 0 ? (
                        <View className="py-6 items-center border-2 border-dashed border-border/50 rounded-xl bg-muted/30 px-6">
                            <Text className="text-sm text-foreground mb-1 font-bold text-center">
                                Everything looks good!
                            </Text>
                            <Text className="text-xs text-muted-foreground text-center">
                                No critical alerts at this time.
                            </Text>
                        </View>
                    ) : (
                        suggestions.map((s, i) => (
                            <View key={i} className={`p-4 rounded-xl border ${s.type === 'critical' ? 'bg-destructive/10 border-destructive/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                <View className="flex-row gap-3">
                                    <View className="mt-0.5">
                                        <Icon as={s.type === 'critical' ? AlertTriangle : TrendingUp} size={18} className={s.type === 'critical' ? 'text-destructive' : 'text-amber-600'} />
                                    </View>
                                    <View className="flex-1 pr-2 mt-0.5">
                                        <Text className={`font-bold text-sm ${s.type === 'critical' ? 'text-destructive' : 'text-amber-800 dark:text-amber-400'}`}>
                                            {s.title}
                                        </Text>
                                        <Text className={`text-xs mt-1 leading-5 ${s.type === 'critical' ? 'text-destructive/80' : 'text-amber-700 dark:text-amber-500'}`}>
                                            {s.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </View>
    );
};
