/// <reference types="nativewind/types" />
import { ProBlocker } from "@/components/pro-blocker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { AlertCircle, Package, Sparkles } from "lucide-react-native";
import { Pressable, View } from "react-native";

interface WatchdogPrediction {
    farmerId: string;
    farmer: string;
    stock: number;
    burnRate: string;
    daysRemaining: string;
    urgency: "CRITICAL" | "HIGH";
    riskType: "IMMEDIATE" | "PREDICTED";
}

interface SmartWatchdogProps {
    data: WatchdogPrediction[];
    isLoading: boolean;
}

export const SmartWatchdog = ({ data, isLoading }: SmartWatchdogProps) => {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    if (!membership?.isPro) {
        return <ProBlocker feature="Smart Watchdog" description="Unlock AI-powered supply monitoring and predictions." />;
    }

    return (
        <Card className="border-primary/20 bg-card overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/10">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="p-2 rounded-xl bg-primary/10">
                            <Icon as={Sparkles} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-sm font-black uppercase tracking-tight text-foreground">Smart Watchdog</Text>
                            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                                AI-Powered Supply Monitoring
                            </Text>
                        </View>
                    </View>
                </View>
            </CardHeader>
            <CardContent className="pt-4">
                {isLoading && !data.length ? (
                    <View className="items-center justify-center py-10">
                        <BirdyLoader size={48} color={"#10b981"} />
                        <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Analyzing Supply Chain...
                        </Text>
                    </View>
                ) : data.length === 0 ? (
                    <View className="flex-col items-center justify-center py-10 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Supply Chain Healthy</Text>
                    </View>
                ) : (
                    <View className="gap-3">
                        {data.slice(0, 5).map((item, index) => (
                            <Pressable
                                key={item.farmerId}
                                className="flex-row items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 active:bg-muted/50"
                                onPress={() => router.push(`/farmer/${item.farmerId}` as any)}
                            >
                                <View className="flex-1 mr-2">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <Text className="font-black text-sm uppercase tracking-tight text-foreground">{item.farmer}</Text>
                                        <Badge variant="outline" className={`h-4 px-1.5 ${item.riskType === 'IMMEDIATE' ? 'bg-destructive/10 border-destructive/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                            <Text className={`text-[8px] font-black uppercase ${item.riskType === 'IMMEDIATE' ? 'text-destructive' : 'text-amber-600'}`}>
                                                {item.riskType}
                                            </Text>
                                        </Badge>
                                    </View>

                                    <View className="flex-row items-center gap-3 mt-1">
                                        <View className="flex-row items-center gap-1">
                                            <Icon as={Package} size={10} className="text-muted-foreground" />
                                            <Text className="text-[10px] font-bold text-muted-foreground">
                                                {parseFloat(item.stock.toString()).toFixed(1)} Bags left
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            <Icon as={AlertCircle} size={10} className={item.urgency === 'CRITICAL' ? 'text-destructive' : 'text-amber-500'} />
                                            <Text className={`text-[10px] font-black uppercase ${item.urgency === 'CRITICAL' ? 'text-destructive' : 'text-amber-600'}`}>
                                                {parseFloat(item.daysRemaining) === 0 ? 'OUT OF STOCK' : `${parseFloat(item.daysRemaining).toFixed(1)} DAYS LEFT`}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Icon as={AlertCircle} size={18} className={item.urgency === 'CRITICAL' ? 'text-destructive' : 'text-amber-500'} />
                            </Pressable>
                        ))}
                    </View>
                )}
            </CardContent>
        </Card>
    );
};
