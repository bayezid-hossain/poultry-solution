import { CycleCard } from "@/components/cycles/cycle-card";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { History, List } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

export default function CyclesScreen() {
    const [status, setStatus] = useState<"active" | "past">("active");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const activeQuery = trpc.officer.cycles.listActive.useQuery(
        {
            orgId: membership?.orgId ?? "",
            pageSize: 50,
        },
        { enabled: !!membership?.orgId }
    );

    const pastQuery = trpc.officer.cycles.listPast.useQuery(
        {
            orgId: membership?.orgId ?? "",
            pageSize: 50,
        },
        { enabled: !!membership?.orgId }
    );

    const query = status === "active" ? activeQuery : pastQuery;
    const cycles = query.data?.items ?? [];

    const activeCount = activeQuery.data?.total ?? 0;
    const pastCount = pastQuery.data?.total ?? 0;

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Cycles" />

            <View className="px-4 py-3">
                <View className="flex-row bg-muted rounded-lg p-1">
                    <Button
                        variant={status === "active" ? "secondary" : "ghost"}
                        className={`flex-1 flex-row gap-2 h-9 ${status === "active" ? "bg-background shadow-sm" : ""}`}
                        onPress={() => setStatus("active")}
                    >
                        <Icon
                            as={List}
                            className={status === "active" ? "text-primary" : "text-muted-foreground"}
                            size={14}
                        />
                        <Text className={`text-xs font-bold ${status === "active" ? "text-primary" : "text-muted-foreground"}`}>
                            Active
                        </Text>
                        {activeCount > 0 && (
                            <Badge variant="secondary" className="h-4 px-1 bg-primary/10">
                                <Text className="text-[8px] font-bold text-primary">{activeCount}</Text>
                            </Badge>
                        )}
                    </Button>
                    <Button
                        variant={status === "past" ? "secondary" : "ghost"}
                        className={`flex-1 flex-row gap-2 h-9 ${status === "past" ? "bg-background shadow-sm" : ""}`}
                        onPress={() => setStatus("past")}
                    >
                        <Icon
                            as={History}
                            className={status === "past" ? "text-primary" : "text-muted-foreground"}
                            size={14}
                        />
                        <Text className={`text-xs font-bold ${status === "past" ? "text-primary" : "text-muted-foreground"}`}>
                            History
                        </Text>
                        {pastCount > 0 && (
                            <Badge variant="secondary" className="h-4 px-1">
                                <Text className="text-[8px] font-bold text-muted-foreground">{pastCount}</Text>
                            </Badge>
                        )}
                    </Button>
                </View>
            </View>

            {query.isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground font-medium">Loading cycles...</Text>
                </View>
            ) : (
                <FlatList
                    data={cycles}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <CycleCard
                            cycle={item}
                            onPress={() => router.push(`/cycle/${item.id}` as any)}
                        />
                    )}
                    contentContainerClassName="p-4 pt-1 pb-10"
                    onRefresh={() => query.refetch()}
                    refreshing={query.isFetching}
                    ListEmptyComponent={
                        <View className="items-center justify-center p-10 opacity-50">
                            <Icon as={List} size={48} className="text-muted-foreground mb-4" />
                            <Text className="text-center text-lg font-medium">No {status} cycles</Text>
                            <Text className="text-center text-sm text-muted-foreground">
                                {status === "active" ? "Start a new cycle to see it here" : "Completed cycles will appear here"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
