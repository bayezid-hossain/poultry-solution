/// <reference types="nativewind/types" />
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { Activity, Bird, Layers, Wheat } from "lucide-react-native";
import { View } from "react-native";

interface KpiCardsProps {
    totalBirds: number;
    totalBirdsSold?: number;
    totalFeedStock: number;
    activeConsumption: number;
    availableStock: number;
    avgMortality: string;
    activeCyclesCount: number;
    totalFarmers?: number;
}

export const OfficerKpiCards = ({
    totalBirds,
    totalBirdsSold = 0,
    totalFeedStock,
    activeConsumption,
    availableStock,
    avgMortality,
    activeCyclesCount,
    totalFarmers
}: KpiCardsProps) => {
    const items = [
        {
            label: "Live Birds",
            value: totalBirds.toLocaleString(),
            icon: Bird,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            subValue: totalBirdsSold > 0 ? `${totalBirdsSold.toLocaleString()} sold` : undefined,
            description: `Across ${activeCyclesCount} active cycles`
        },
        {
            label: "Feed Inventory",
            value: `${availableStock.toFixed(1)} Bags`,
            icon: Layers,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            subValue: `+${activeConsumption.toFixed(1)} active`,
            description: `Total: ${totalFeedStock.toFixed(1)}`
        },
        {
            label: "Avg. Mortality",
            value: `${avgMortality}%`,
            icon: Activity,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
            description: "Active average"
        },

        ...(totalFarmers !== undefined ? [{
            label: "Total Farmers",
            value: totalFarmers.toLocaleString(),
            icon: Wheat,
            color: "text-sky-500",
            bg: "bg-sky-500/10",
            description: "Active under you",
            isAlert: false,
            subValue: undefined as string | undefined
        }] : [])
    ];

    return (
        <View className="flex-row flex-wrap gap-4">
            {items.map((item, i) => (
                <Card key={i} className={cn(
                    "relative overflow-hidden border-border/50 bg-card flex-1 min-w-[160px]",
                    item.isAlert && "border-destructive/20 "
                )}>
                    <View className={cn(
                        "absolute top-0 left-0 w-1 h-full opacity-40",
                        item.isAlert ? "bg-destructive" : item.bg.replace("/10", "").replace("bg-", "bg-")
                    )} />

                    <CardHeader className="flex-row items-center justify-between pb-2 p-4">
                        <Text className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">{item.label}</Text>
                        <View className={cn(
                            "p-2 rounded-xl",
                            item.bg,
                        )}>
                            <Icon as={item.icon} size={14} className={item.color} />
                        </View>
                    </CardHeader>

                    <CardContent className="px-4 pb-4">
                        <Text className={cn(
                            "text-2xl font-black text-foreground",
                            item.isAlert && "text-destructive"
                        )}>
                            {item.value || "0"}
                        </Text>
                        <View className="mt-2 flex-row items-center justify-between gap-1">
                            <Text className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest flex-1" numberOfLines={1}>
                                {item.description}
                            </Text>
                            {item.subValue && (
                                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 h-4 px-1">
                                    <Text className="text-[8px] font-black text-amber-500/80">{item.subValue}</Text>
                                </Badge>
                            )}
                        </View>
                    </CardContent>
                </Card>
            ))}
        </View>
    );
};
