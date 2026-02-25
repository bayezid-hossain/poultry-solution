/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader, LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { Activity, Bird, Building2, ChevronDown, ChevronRight, ChevronUp, Users, Wheat } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

export default function OverviewScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";

    const { data: stats, isLoading: statsLoading } = trpc.management.analytics.getDashboardStats.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const { data: productionTree, isLoading: treeLoading } = trpc.management.officers.getProductionTree.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const [expandedOfficers, setExpandedOfficers] = useState<Set<string>>(new Set());

    const toggleOfficer = (id: string) => {
        setExpandedOfficers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (statsLoading && !stats) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Management" />
                <View className="flex-1 items-center justify-center">
                    <LoadingState title="Synchronizing" description="Fetching management dashboard..." />
                </View>
            </View>
        );
    }

    const statCards = [
        { label: "Members", value: stats?.members ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Organization Total" },
        { label: "Farmers", value: stats?.farmers ?? 0, icon: Wheat, color: "text-amber-500", bg: "bg-amber-500/10", desc: "Active Farmers" },
        { label: "Cycles", value: stats?.activeCycles ?? 0, icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10", desc: "Active Production" },
    ];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Management" />

            <ScrollView
                contentContainerClassName="p-4 pb-20"
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center gap-3 mb-6">
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
                        <Icon as={Building2} size={24} className="text-primary" />
                    </View>
                    <View>
                        <Text className="text-2xl font-black text-foreground tracking-tight uppercase">Dashboard</Text>
                        <Text className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            Overseeing {membership?.orgName || "Organization"}
                        </Text>
                    </View>
                </View>

                {/* Stat Cards */}
                <View className="flex-row gap-3 mb-6">
                    {statCards.map(item => (
                        <Card key={item.label} className="flex-1 border-border/50 overflow-hidden">
                            <CardContent className="p-4">
                                <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{item.label}</Text>
                                    <View className={`w-8 h-8 rounded-xl items-center justify-center ${item.bg}`}>
                                        <Icon as={item.icon} size={16} className={item.color} />
                                    </View>
                                </View>
                                <Text className="text-3xl font-black text-foreground tracking-tighter">{item.value}</Text>
                                <Text className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest mt-1">{item.desc}</Text>
                            </CardContent>
                        </Card>
                    ))}
                </View>

                {/* Quick Actions */}
                <View className="flex-row gap-3 mb-8">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2 border-primary/20 bg-primary/5"
                        onPress={() => router.push("/officers" as any)}
                    >
                        <Icon as={Users} size={16} className="text-primary" />
                        <Text className="text-primary font-bold text-xs">Officers</Text>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2 border-amber-500/20 bg-amber-500/5"
                        onPress={() => router.push("/members" as any)}
                    >
                        <Icon as={Users} size={16} className="text-amber-500" />
                        <Text className="text-amber-500 font-bold text-xs">Members</Text>
                    </Button>
                </View>

                {/* Production Tree */}
                <View className="flex-row items-center gap-2 mb-4 px-1">
                    <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                        <Icon as={Activity} size={16} className="text-primary" />
                    </View>
                    <Text className="text-xl font-bold text-foreground">Production Tree</Text>
                </View>

                {treeLoading ? (
                    <View className="items-center justify-center py-10">
                        <BirdyLoader size={48} color={"#10b981"} />
                        <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Gathering Production Intel...
                        </Text>
                    </View>
                ) : productionTree && productionTree.length > 0 ? (
                    productionTree.map((officer: any) => {
                        const isExpanded = expandedOfficers.has(officer.userId);
                        const totalCycles = officer.farmers.reduce(
                            (acc: number, f: any) => acc + (f.activeCycles?.length || 0), 0
                        );
                        const totalBirds = officer.farmers.reduce(
                            (acc: number, f: any) => acc + f.activeCycles?.reduce(
                                (a: number, c: any) => a + (c.doc - c.mortality - (c.birdsSold || 0)), 0
                            ), 0
                        );

                        return (
                            <Card key={officer.userId} className="mb-3 border-border/50 overflow-hidden">
                                <Pressable onPress={() => toggleOfficer(officer.userId)} className="active:bg-muted/50">
                                    <CardContent className="p-4">
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                <View className="flex-row items-center gap-2 mb-1">
                                                    <Text className="font-bold text-base text-foreground">{officer.name}</Text>
                                                    <Badge variant="outline" className="h-4 px-1.5 border-primary/30">
                                                        <Text className="text-[8px] text-primary font-bold uppercase">{officer.role}</Text>
                                                    </Badge>
                                                </View>
                                                <View className="flex-row items-center gap-4">
                                                    <Text className="text-xs text-muted-foreground">
                                                        {officer.farmers.length} farmer{officer.farmers.length !== 1 ? "s" : ""}
                                                    </Text>
                                                    <Text className="text-xs text-muted-foreground">
                                                        {totalCycles} cycle{totalCycles !== 1 ? "s" : ""}
                                                    </Text>
                                                    <View className="flex-row items-center gap-1">
                                                        <Icon as={Bird} size={12} className="text-primary/50" />
                                                        <Text className="text-xs text-primary font-bold">{totalBirds.toLocaleString()}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <Icon as={isExpanded ? ChevronUp : ChevronDown} size={18} className="text-muted-foreground" />
                                        </View>
                                    </CardContent>
                                </Pressable>

                                {isExpanded && (
                                    <View className="border-t border-border/50 bg-muted/10">
                                        {officer.farmers.length > 0 ? (
                                            officer.farmers.map((f: any) => (
                                                <Pressable
                                                    key={f.id}
                                                    className="px-4 py-3 border-b border-border/30 active:bg-muted/30"
                                                    onPress={() => router.push(`/farmer/${f.id}` as any)}
                                                >
                                                    <View className="flex-row items-center justify-between">
                                                        <View className="flex-1">
                                                            <Text className="font-medium text-foreground">{f.name}</Text>
                                                            <View className="flex-row items-center gap-3 mt-1">
                                                                <Text className="text-[10px] text-muted-foreground">
                                                                    {f.activeCycles?.length || 0} active · {f.pastCycles?.length || 0} past
                                                                </Text>
                                                                <View className="flex-row items-center gap-1">
                                                                    <Icon as={Wheat} size={10} className="text-amber-500/50" />
                                                                    <Text className="text-[10px] text-amber-600 font-bold">
                                                                        {Number(f.mainStock ?? 0).toFixed(1)} bags
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        </View>
                                                        <Icon as={ChevronRight} size={16} className="text-muted-foreground/40" />
                                                    </View>
                                                </Pressable>
                                            ))
                                        ) : (
                                            <View className="px-4 py-6 items-center">
                                                <Text className="text-sm text-muted-foreground">No farmers assigned</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Card>
                        );
                    })
                ) : (
                    <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                        <CardContent className="flex-1 items-center justify-center">
                            <Text className="text-muted-foreground text-sm">No officers found</Text>
                        </CardContent>
                    </Card>
                )}
            </ScrollView>
        </View>
    );
}
