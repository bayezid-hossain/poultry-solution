/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import { BarChart3, Bird, DollarSign, Scale, Wheat } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function ReportsScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const router = useRouter();
    const orgId = membership?.orgId ?? "";

    const { data: salesSummary, isLoading: salesLoading, refetch: refetchSales } = trpc.management.reports.getSalesSummary.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const { data: stockSummary, isLoading: stockLoading, refetch: refetchStock } = trpc.management.reports.getStockSummary.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    useFocusEffect(
        useCallback(() => {
            if (orgId) {
                refetchSales();
                refetchStock();
            }
        }, [orgId, refetchSales, refetchStock])
    );

    const isLoading = salesLoading || stockLoading;

    if (isLoading) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Reports" />
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color={"#10b981"} />
                    <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                        Synthesizing Reports...
                    </Text>
                </View>
            </View>
        );
    }

    const summary = salesSummary?.metrics;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Reports" />

            <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">

                {/* Sales Summary Header */}
                <View className="flex-row items-center gap-2 mb-4 px-1">
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                        <Icon as={BarChart3} size={16} className="text-primary" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">Sales Summary</Text>
                </View>

                {/* Sales KPI Cards */}
                <View className="flex-row gap-3 mb-3">
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <View className="w-10 h-10 rounded-xl bg-emerald-500/10 items-center justify-center mb-2">
                                <Icon as={DollarSign} size={20} className="text-emerald-500" />
                            </View>
                            <Text className="text-2xl font-black text-foreground tracking-tight">
                                ৳{(summary?.totalRevenue ?? 0).toLocaleString()}
                            </Text>
                            <Text className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Total Revenue</Text>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <View className="w-10 h-10 rounded-xl bg-blue-500/10 items-center justify-center mb-2">
                                <Icon as={Bird} size={20} className="text-blue-500" />
                            </View>
                            <Text className="text-2xl font-black text-foreground tracking-tight">
                                {(summary?.totalBirdsSold ?? 0).toLocaleString()}
                            </Text>
                            <Text className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Birds Sold</Text>
                        </CardContent>
                    </Card>
                </View>

                <View className="flex-row gap-3 mb-6">
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <View className="w-10 h-10 rounded-xl bg-amber-500/10 items-center justify-center mb-2">
                                <Icon as={Scale} size={20} className="text-amber-500" />
                            </View>
                            <Text className="text-2xl font-black text-foreground tracking-tight">
                                {Number(summary?.totalWeight ?? 0).toLocaleString()} kg
                            </Text>
                            <Text className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Total Weight</Text>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-border/50">
                        <CardContent className="p-4 items-center">
                            <View className="w-10 h-10 rounded-xl bg-violet-500/10 items-center justify-center mb-2">
                                <Icon as={DollarSign} size={20} className="text-violet-500" />
                            </View>
                            <Text className="text-2xl font-black text-foreground tracking-tight">
                                ৳{Number(summary?.avgPricePerKg ?? 0).toFixed(2)}
                            </Text>
                            <Text className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Avg Price/kg</Text>
                        </CardContent>
                    </Card>
                </View>

                {/* Farmer Sales Breakdown */}
                {salesSummary?.farmerStats && salesSummary.farmerStats.length > 0 && (
                    <>
                        <View className="flex-row items-center gap-2 mb-3 px-1">
                            <Text className="text-base font-bold text-foreground">Sales by Farmer</Text>
                            <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                                <Text className="text-[10px] text-primary font-bold">{salesSummary.farmerStats.length}</Text>
                            </Badge>
                        </View>

                        {salesSummary.farmerStats
                            .filter((f: any) => f.birdsSold > 0)
                            .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
                            .map((f: any) => (
                                <Card key={f.farmerId} className="mb-2 border-border/50">
                                    <CardContent className="p-3 flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Pressable
                                                className="active:opacity-70"
                                                onPress={() => router.push(`/farmer/${f.farmerId}`)}
                                            >
                                                <Text className="font-bold text-sm text-foreground active:text-primary">{f.name}</Text>
                                            </Pressable>
                                            <Text className="text-[10px] text-muted-foreground">{f.birdsSold} birds sold</Text>
                                        </View>
                                        <Text className="font-bold text-primary">৳{f.totalRevenue.toLocaleString()}</Text>
                                    </CardContent>
                                </Card>
                            ))
                        }
                    </>
                )}

                {/* Stock Summary */}
                <View className="flex-row items-center gap-2 mt-6 mb-4 px-1">
                    <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
                        <Icon as={Wheat} size={16} className="text-amber-500" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">Stock Summary</Text>
                </View>

                <Card className="mb-4 border-border/50">
                    <CardContent className="p-4 items-center">
                        <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Total Feed Stock</Text>
                        <Text className="text-3xl font-black text-primary tracking-tight">
                            {Number(stockSummary?.totalStock ?? 0).toFixed(1)} bags
                        </Text>
                    </CardContent>
                </Card>

                {stockSummary?.farmers && stockSummary.farmers.length > 0 && (
                    stockSummary.farmers.map((f: any) => (
                        <Card key={f.id} className="mb-2 border-border/50">
                            <CardContent className="p-3 flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Pressable
                                        className="active:opacity-70"
                                        onPress={() => router.push(`/farmer/${f.id}`)}
                                    >
                                        <Text className="font-bold text-sm text-foreground active:text-primary">{f.name}</Text>
                                    </Pressable>
                                </View>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="font-bold text-amber-600">{Number(f.mainStock).toFixed(1)}</Text>
                                    <Text className="text-[10px] text-muted-foreground">bags</Text>
                                </View>
                            </CardContent>
                        </Card>
                    ))
                )}
            </ScrollView>
        </View>
    );
}
