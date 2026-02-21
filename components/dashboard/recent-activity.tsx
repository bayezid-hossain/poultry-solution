/// <reference types="nativewind/types" />
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ClipboardList } from "lucide-react-native";
import { View } from "react-native";

interface RecentActivityProps {
    cycles: Array<{
        id: string;
        name: string;
        farmerName: string;
        farmerMainStock: number;
        intake: number;
        age: number;
        doc: number;
        mortality: number;
        birdsSold?: number;
    }>;
}

export const RecentActivity = ({ cycles }: RecentActivityProps) => {
    return (
        <Card className="border-border/50 bg-card overflow-hidden">
            <CardHeader className="pb-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                    <View className="p-2 rounded-xl bg-muted ring-1 ring-border/50">
                        <Icon as={ClipboardList} size={20} className="text-muted-foreground" />
                    </View>
                    <View>
                        <Text className="text-sm font-black uppercase tracking-tight text-foreground">Recent Activity</Text>
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                            Operational Overview
                        </Text>
                    </View>
                </View>
            </CardHeader>
            <CardContent>
                <View className="rounded-2xl border border-border/50 overflow-hidden bg-muted/10">
                    <View className="flex-row bg-muted/30 border-b border-border/50 px-3 py-2">
                        <Text className="flex-1 font-black text-[10px] uppercase tracking-widest text-muted-foreground/70">Farmer</Text>
                        <Text className="w-20 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground/70">Birds</Text>
                        <Text className="w-12 text-right font-black text-[10px] uppercase tracking-widest text-muted-foreground/70">Age</Text>
                    </View>
                    {cycles.length === 0 ? (
                        <View className="py-8 items-center justify-center">
                            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No active cycles found.</Text>
                        </View>
                    ) : (
                        cycles.slice(0, 5).map((cycle) => {
                            const liveBirds = (cycle.doc || 0) - (cycle.mortality || 0) - (cycle.birdsSold || 0);
                            const mortalityRate = cycle.doc > 0 ? (((cycle.mortality || 0) / cycle.doc) * 100).toFixed(1) : "0";
                            return (
                                <View key={cycle.id} className="flex-row items-center px-3 py-3 border-b border-border/20">
                                    <View className="flex-1">
                                        <Text className="font-black text-xs uppercase tracking-tight text-foreground" numberOfLines={1}>{cycle.farmerName}</Text>
                                    </View>
                                    <View className="w-20 items-center">
                                        <Text className="font-black text-sm text-emerald-500">{liveBirds.toLocaleString()}</Text>
                                        <Text className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">
                                            {mortalityRate}% mort
                                        </Text>
                                    </View>
                                    <View className="w-12 items-end">
                                        <View className="bg-primary/10 px-1.5 py-0.5 rounded-lg">
                                            <Text className="text-primary text-[10px] font-black">{cycle.age}D</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </CardContent>
        </Card>
    );
};
