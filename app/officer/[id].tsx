/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Bird, ChevronRight, Repeat, Skull, Wheat } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

export default function OfficerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";

    const { data, isLoading } = trpc.management.officers.getDetails.useQuery(
        { orgId, userId: id ?? "" },
        { enabled: !!orgId && !!id }
    );

    if (isLoading) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Officer Details" />
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground font-medium">Loading officer data...</Text>
                </View>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Officer Details" />
                <View className="flex-1 items-center justify-center p-10 opacity-50">
                    <Text className="text-center text-lg font-medium">Officer not found</Text>
                </View>
            </View>
        );
    }

    const { officer, role, stats, farmers } = data;

    const statItems = [
        { label: "Active Cycles", value: stats.activeCycles, icon: Repeat, color: "text-primary", bg: "bg-primary/10" },
        { label: "Past Cycles", value: stats.pastCycles, icon: Repeat, color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Active DOC", value: stats.activeDoc.toLocaleString(), icon: Bird, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "Feed Intake", value: Number(stats.activeIntake).toFixed(1), icon: Wheat, color: "text-amber-600", bg: "bg-amber-600/10" },
        { label: "Mortality", value: stats.activeMortality, icon: Skull, color: "text-destructive", bg: "bg-destructive/10" },
        { label: "Feed Stock", value: Number(stats.totalMainStock).toFixed(1), icon: Wheat, color: "text-blue-500", bg: "bg-blue-500/10" },
    ];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title={officer.name}
                leftElement={
                    <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                        <Icon as={ArrowLeft} size={24} className="text-foreground" />
                    </Pressable>
                }
            />

            <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
                {/* Officer Info */}
                <Card className="mb-6 border-border/50 overflow-hidden">
                    <CardContent className="p-6">
                        <Text className="text-2xl font-bold text-foreground mb-1">{officer.name}</Text>
                        <Text className="text-sm text-muted-foreground mb-3">{officer.email}</Text>
                        <Badge variant="outline" className="self-start h-5 px-2 border-primary/30 bg-primary/10">
                            <Text className="text-[10px] text-primary font-bold uppercase">{role}</Text>
                        </Badge>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap gap-3 mb-8">
                    {statItems.map(item => (
                        <View key={item.label} className="w-[31%] bg-card border border-border/50 rounded-2xl p-3 items-center">
                            <View className={`w-8 h-8 rounded-xl items-center justify-center ${item.bg} mb-2`}>
                                <Icon as={item.icon} size={16} className={item.color} />
                            </View>
                            <Text className="font-bold text-lg text-foreground">{item.value}</Text>
                            <Text className="text-[9px] text-muted-foreground font-bold uppercase text-center mt-0.5">{item.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Managed Farmers */}
                <View className="flex-row items-center gap-2 mb-4 px-1">
                    <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
                        <Icon as={Bird} size={16} className="text-amber-500" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">Managed Farmers</Text>
                    <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                        <Text className="text-[10px] text-primary font-bold">{farmers.length}</Text>
                    </Badge>
                </View>

                {farmers.length > 0 ? (
                    farmers.map((f: any) => (
                        <Pressable
                            key={f.id}
                            onPress={() => router.push(`/farmer/${f.id}` as any)}
                            className="mb-3 p-4 bg-card border border-border/50 rounded-2xl active:bg-muted/50"
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <Text className="font-bold text-foreground">{f.name}</Text>
                                        {f.status === "deleted" && (
                                            <Badge variant="outline" className="h-4 px-1 border-destructive/40 bg-destructive/10">
                                                <Text className="text-[8px] text-destructive font-bold">DELETED</Text>
                                            </Badge>
                                        )}
                                    </View>
                                    <View className="flex-row items-center gap-4 mt-1">
                                        <Text className="text-xs text-muted-foreground">
                                            {f.activeCyclesCount} active · {f.pastCyclesCount} past
                                        </Text>
                                        <View className="flex-row items-center gap-1">
                                            <Icon as={Wheat} size={10} className="text-amber-500/50" />
                                            <Text className="text-xs text-amber-600 font-bold">
                                                {Number(f.mainStock ?? 0).toFixed(1)} bags
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <Icon as={ChevronRight} size={18} className="text-muted-foreground/40" />
                            </View>
                        </Pressable>
                    ))
                ) : (
                    <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                        <CardContent className="flex-1 items-center justify-center">
                            <Text className="text-muted-foreground text-sm">No farmers assigned</Text>
                        </CardContent>
                    </Card>
                )}
            </ScrollView>
        </View>
    );
}
