import { AddMortalityModal } from "@/components/cycles/add-mortality-modal";
import { EndCycleModal } from "@/components/cycles/end-cycle-modal";
import { LogsTimeline } from "@/components/cycles/logs-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import { Archive, ArrowLeft, Bird, ExternalLink, Skull, TrendingUp, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

export default function CycleDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
    const [isEndCycleOpen, setIsEndCycleOpen] = useState(false);

    const { data: response, isLoading, error, refetch } = trpc.officer.cycles.getDetails.useQuery({ id: id as string });

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="hsl(var(--primary))" />
                <Text className="mt-4 text-muted-foreground">Loading cycle details...</Text>
            </View>
        );
    }

    if (error || !response) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text className="text-destructive font-bold text-lg mb-2">Error</Text>
                <Text className="text-muted-foreground text-center mb-6">
                    {error?.message || "Failed to load cycle details"}
                </Text>
                <Button onPress={() => router.back()}>
                    <Text className="text-primary-foreground font-bold">Go Back</Text>
                </Button>
            </View>
        );
    }

    const { data: cycle, farmerContext: farmer, logs } = response;
    const liveBirds = Math.max(0, (cycle.doc ?? 0) - (cycle.mortality ?? 0) - (cycle.birdsSold ?? 0));

    return (
        <View className="flex-1 bg-background">
            {/* Custom Header */}
            <View className="pt-12 pb-4 px-4 border-b border-border/50 bg-card flex-row items-center gap-4">
                <Button variant="ghost" size="icon" className="h-10 w-10 p-0" onPress={() => router.back()}>
                    <Icon as={ArrowLeft} size={20} className="text-foreground" />
                </Button>
                <Pressable
                    className="flex-1"
                    onPress={() => router.push(`/farmer/${farmer.id}` as any)}
                >
                    <View className="flex-row items-center gap-1.5">
                        <Text className="font-bold text-lg text-foreground uppercase tracking-tight" numberOfLines={1}>
                            {farmer.name}
                        </Text>
                        <Icon as={ExternalLink} size={14} className="text-primary/50" />
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Badge variant="outline" className={`h-4 px-1.5 ${cycle.status === 'active' ? 'border-emerald-500 bg-emerald-500/5' : 'border-muted-foreground'}`}>
                            <Text className={`text-[8px] font-bold uppercase ${cycle.status === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                {cycle.status}
                            </Text>
                        </Badge>
                        {cycle.birdType && (
                            <Badge variant="outline" className="h-4 px-1.5 bg-amber-500/10 border-amber-500/20">
                                <Text className="text-amber-600 text-[8px] font-bold uppercase">{cycle.birdType}</Text>
                            </Badge>
                        )}
                    </View>
                </Pressable>
            </View>

            <ScrollView contentContainerClassName="p-4 pb-20 gap-6">
                {/* Stats Grid */}
                <View className="flex-row gap-4">
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Age</Text>
                            <View className="flex-row items-baseline gap-0.5">
                                <Text className="font-bold text-2xl text-foreground">{cycle.age}</Text>
                                <Text className="text-xs text-muted-foreground">days</Text>
                            </View>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Live Birds</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Bird} size={20} className="text-primary/70" />
                                <Text className="font-bold text-2xl text-foreground">{liveBirds.toLocaleString()}</Text>
                            </View>
                        </CardContent>
                    </Card>
                </View>

                <View className="flex-row gap-4">
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Feed Intake</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Wheat} size={18} className="text-amber-500/70" />
                                <Text className="font-bold text-2xl text-amber-600">{Number(cycle.intake ?? 0).toFixed(1)}</Text>
                            </View>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Mortality</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Skull} size={18} className={cycle.mortality > 0 ? "text-destructive" : "text-muted-foreground/30"} />
                                <Text className={`font-bold text-2xl ${cycle.mortality > 0 ? "text-destructive" : "text-muted-foreground/30"}`}>
                                    {cycle.mortality || 0}
                                </Text>
                            </View>
                        </CardContent>
                    </Card>
                </View>

                {/* Quick Actions */}
                {cycle.status === 'active' && (
                    <View className="flex-row gap-4">
                        <Button
                            className="flex-1 h-14 flex-row gap-2 bg-destructive shadow-none rounded-2xl"
                            onPress={() => setIsMortalityModalOpen(true)}
                        >
                            <Icon as={Skull} size={18} className="text-destructive-foreground" />
                            <Text className="text-white font-bold">Add Mortality</Text>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-14 flex-row gap-2 border-amber-500/20 bg-amber-500/5 rounded-2xl"
                            onPress={() => setIsEndCycleOpen(true)}
                        >
                            <Icon as={Archive} size={18} className="text-amber-600" />
                            <Text className="text-amber-600 font-bold">End Cycle</Text>
                        </Button>
                    </View>
                )}

                {/* Activity Timeline */}
                <View className="mt-4">
                    <View className="flex-row items-center justify-between mb-4 px-1">
                        <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                                <ActivityIndicator size="small" color="hsl(var(--primary))" style={{ display: 'none' }} />
                                <Icon as={TrendingUp} size={16} className="text-primary" />
                            </View>
                            <Text className="font-bold text-xl text-foreground">Activity Timeline</Text>
                        </View>
                        <Button variant="ghost" size="sm" className="h-8 pr-0" onPress={() => refetch()}>
                            <Text className="text-primary text-xs font-bold font-mono">REFRESH</Text>
                        </Button>
                    </View>
                    <LogsTimeline logs={logs as any} />
                </View>
            </ScrollView>

            <AddMortalityModal
                open={isMortalityModalOpen}
                onOpenChange={setIsMortalityModalOpen}
                cycleId={cycle.id}
                farmerName={farmer.name}
                onSuccess={refetch}
            />

            <EndCycleModal
                open={isEndCycleOpen}
                onOpenChange={setIsEndCycleOpen}
                cycle={{
                    id: cycle.id,
                    name: cycle.name,
                    intake: Number(cycle.intake)
                }}
                onSuccess={() => {
                    refetch();
                    // Optionally navigate back or show success
                }}
            />
        </View>
    );
}
