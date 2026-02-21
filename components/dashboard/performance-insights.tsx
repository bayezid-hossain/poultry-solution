/// <reference types="nativewind/types" />
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react-native";
import { View } from "react-native";

interface PerformanceInsightsProps {
    topPerformers: Array<{
        farmerId: string;
        farmerName: string;
        activeCyclesCount: number;
        totalDoc: number;
        avgMortalityRate: number; // Percent
    }>;
    cycleLabel?: string;
}

export const PerformanceInsights = ({
    topPerformers,
    cycleLabel = "Active Cycle",
}: PerformanceInsightsProps) => {
    return (
        <Card className="border-primary/10 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <View className="flex-row items-center gap-3">
                    <View className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                        <Icon as={Trophy} size={20} className="text-primary" />
                    </View>
                    <View>
                        <Text className="text-sm font-black uppercase tracking-tight text-foreground">Top Performers</Text>
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                            Efficiency by Mortality Rate
                        </Text>
                    </View>
                </View>
            </CardHeader>
            <CardContent>
                <View className="gap-3">
                    {topPerformers.length === 0 ? (
                        <View className="flex-col items-center justify-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">No Performance Data</Text>
                        </View>
                    ) : (
                        topPerformers.map((farmer, i) => {
                            return (
                                <View key={farmer.farmerId} className="flex-row items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 gap-2">
                                    <View className="flex-row items-center gap-3 flex-1">
                                        <View className={cn(
                                            "flex items-center justify-center h-8 w-8 rounded-xl shrink-0",
                                            i === 0 ? "bg-amber-500/20 ring-1 ring-amber-500/30" :
                                                i === 1 ? "bg-muted ring-1 ring-border/50" :
                                                    "bg-orange-500/10 ring-1 ring-orange-500/20"
                                        )}>
                                            <Text className={cn(
                                                "font-black text-xs",
                                                i === 0 ? "text-amber-600 dark:text-amber-500" :
                                                    i === 1 ? "text-muted-foreground" :
                                                        "text-orange-600 dark:text-orange-500"
                                            )}>#{i + 1}</Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-black text-sm uppercase tracking-tight text-foreground" numberOfLines={2}>{farmer.farmerName}</Text>
                                            <Text className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest opacity-60">
                                                {farmer.activeCyclesCount} {cycleLabel}{farmer.activeCyclesCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="shrink-0">
                                        <Badge variant="outline" className="bg-primary/10 border-primary/20 h-6 px-2 rounded-full">
                                            <Text className="text-[9px] font-black uppercase tracking-tighter text-primary">
                                                {farmer.avgMortalityRate.toFixed(1)}% <Text className="lowercase font-medium opacity-50">mortality</Text>
                                            </Text>
                                        </Badge>
                                    </View>
                                </View>
                            )
                        })
                    )}
                </View>
            </CardContent>
        </Card>
    );
};
