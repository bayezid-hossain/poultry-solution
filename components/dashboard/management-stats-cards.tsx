import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Activity, Users, Wheat } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

export const ManagementStatsCards = ({ orgId }: { orgId: string }) => {
    const { data: stats, isLoading } = trpc.management.analytics.getDashboardStats.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const items = [
        {
            label: "Members",
            value: stats?.members,
            icon: Users,
            color: "#3b82f6", // blue-500
            bgClass: "bg-blue-500/10",
            description: "Organization Total",
        },
        {
            label: "Farmers",
            value: stats?.farmers,
            icon: Wheat,
            color: "#f59e0b", // amber-500
            bgClass: "bg-amber-500/10",
            description: "Total Active Farmers",
        },
        {
            label: "Active Cycles",
            value: stats?.activeCycles,
            icon: Activity,
            color: "#8b5cf6", // violet-500
            bgClass: "bg-violet-500/10",
            description: "Production Cycles",
        },
    ];

    if (isLoading) {
        return (
            <View className="flex-row flex-wrap gap-4">
                {[1, 2, 3].map((i) => (
                    <View key={i} className="flex-1 min-w-[140px] h-32 bg-muted/50 rounded-3xl" />
                ))}
            </View>
        );
    }

    return (
        <View className="flex-row flex-wrap gap-4">
            {items.map((item, index) => (
                <Card
                    key={index}
                    className="flex-1 min-w-[140px] p-4 bg-card rounded-3xl border border-border/50 flex-col justify-between"
                >
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.15em]">
                            {item.label}
                        </Text>
                        <View className={`h-8 w-8 rounded-xl ${item.bgClass} flex items-center justify-center`}>
                            <Icon as={item.icon} size={16} color={item.color} />
                        </View>
                    </View>

                    <View>
                        <Text className="text-3xl font-black text-foreground tracking-tighter mb-1 mt-2">
                            {item.value?.toLocaleString() || 0}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                            {item.description}
                        </Text>
                    </View>
                </Card>
            ))}
        </View>
    );
};
