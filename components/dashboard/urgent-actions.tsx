/// <reference types="nativewind/types" />
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { AlertCircle, ArrowRight } from "lucide-react-native";
import { View } from "react-native";

interface UrgentActionsProps {
    lowStockCycles: Array<{
        id: string;
        name: string;
        farmerName: string;
        farmerMainStock?: number;
        availableStock: number;
    }>;
    canEdit: boolean;
}

export const UrgentActions = ({ lowStockCycles, canEdit }: UrgentActionsProps) => {
    return (
        <Card className="border-amber-500/20 bg-card overflow-hidden">
            <CardHeader className="pb-4">
                <View className="flex-row items-center gap-3">
                    <View className="p-2 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                        <Icon as={AlertCircle} size={20} className="text-amber-500" />
                    </View>
                    <View>
                        <Text className="text-sm font-black uppercase tracking-tight text-foreground">Urgent Needs</Text>
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                            Critical Supply Monitoring
                        </Text>
                    </View>
                </View>
            </CardHeader>
            <CardContent>
                {lowStockCycles.length === 0 ? (
                    <View className="flex-col items-center justify-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">All Farmers Stocked</Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {lowStockCycles.slice(0, 3).map((cycle) => (
                            <View key={cycle.id} className="flex-row items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <View className="flex-1 mr-2">
                                    <Text className="font-black text-sm uppercase tracking-tight text-foreground">{cycle.farmerName}</Text>
                                    <View className="flex-row items-center gap-2 mt-1">
                                        <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 h-5 px-2">
                                            <Text className="text-[9px] font-black uppercase tracking-tighter text-amber-600 dark:text-amber-500">
                                                {cycle.availableStock < 0 ? 0 : cycle.availableStock.toFixed(1)} BAGS LEFT
                                            </Text>
                                        </Badge>
                                    </View>
                                </View>
                                {canEdit && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-9 px-3 rounded-xl bg-background border border-border/50"
                                        onPress={() => router.push("/(drawer)/(tabs)/cycles" as any)}
                                    >
                                        <Text className="font-black uppercase text-[10px] tracking-widest">Manage</Text>
                                    </Button>
                                )}
                            </View>
                        ))}
                        {lowStockCycles.length > 3 && (
                            <Button
                                variant="ghost"
                                className="w-full h-10"
                                onPress={() => router.push("/(drawer)/(tabs)/cycles" as any)}
                            >
                                <View className="flex-row items-center gap-2">
                                    <Text className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                                        View {lowStockCycles.length - 3} more alerts
                                    </Text>
                                    <Icon as={ArrowRight} size={14} className="text-muted-foreground" />
                                </View>
                            </Button>
                        )}
                    </View>
                )}
            </CardContent>
        </Card>
    );
};
