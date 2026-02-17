import { CycleCard } from "@/components/cycles/cycle-card";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { History, List, RefreshCcw, Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, View } from "react-native";

export default function CyclesScreen() {
    const [status, setStatus] = useState<"active" | "past">("active");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const activeQuery = trpc.officer.cycles.listActive.useQuery(
        { orgId: membership?.orgId ?? "" },
        { enabled: !!membership?.orgId }
    );

    const pastQuery = trpc.officer.cycles.listPast.useQuery(
        { orgId: membership?.orgId ?? "" },
        { enabled: !!membership?.orgId }
    );

    const syncMutation = trpc.officer.cycles.syncFeed.useMutation({
        onSuccess: (data) => {
            Alert.alert("Success", `Synced feed for ${data.updatedCount} cycles.`);
            activeQuery.refetch();
        },
        onError: (error) => {
            Alert.alert("Error", error.message);
        }
    });

    const activeCycles = activeQuery.data?.items ?? [];
    const pastCycles = pastQuery.data?.items ?? [];

    const activeCount = activeQuery.data?.total ?? 0;
    const pastCount = pastQuery.data?.total ?? 0;

    const isLoading = status === "active" ? activeQuery.isLoading : pastQuery.isLoading;
    const isFetching = status === "active" ? activeQuery.isFetching : pastQuery.isFetching;
    const currentData = status === "active" ? activeCycles : pastCycles;
    const refetch = status === "active" ? activeQuery.refetch : pastQuery.refetch;

    return (
        <View className='flex-1 bg-background'>
            <ScreenHeader title='Batch Browser' />

            <View className='px-4 py-4 flex-row gap-2'>
                <Button
                    variant={status === "active" ? "default" : "outline"}
                    className='flex-1 flex-row gap-2 h-11'
                    onPress={() => setStatus("active")}
                >
                    <Icon as={List} className={status === "active" ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                    <Text className={status === "active" ? "text-primary-foreground font-bold" : "text-muted-foreground"}>
                        Active ({activeCount})
                    </Text>
                </Button>
                <Button
                    variant={status === "past" ? "default" : "outline"}
                    className='flex-1 flex-row gap-2 h-11'
                    onPress={() => setStatus("past")}
                >
                    <Icon as={History} className={status === "past" ? "text-primary-foreground" : "text-muted-foreground"} size={14} />
                    <Text className={status === "past" ? "text-primary-foreground font-bold" : "text-muted-foreground"}>
                        History ({pastCount})
                    </Text>
                </Button>
            </View>

            {status === "active" && activeCycles.length > 0 && (
                <View className="px-4 pb-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-row gap-2 border border-primary/20 bg-primary/5"
                        onPress={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                    >
                        {syncMutation.isPending ? (
                            <ActivityIndicator size="small" color="hsl(var(--primary))" />
                        ) : (
                            <Icon as={RefreshCcw} size={14} className="text-primary" />
                        )}
                        <Text className="text-xs font-bold text-primary italic uppercase">Refresh All Feed Intake</Text>
                    </Button>
                </View>
            )}

            {isLoading && !isFetching ? (
                <View className='flex-1 items-center justify-center'>
                    <ActivityIndicator size='large' color='hsl(var(--primary))' />
                    <Text className='mt-4 text-muted-foreground font-medium'>Fetching batches...</Text>
                </View>
            ) : (
                <FlatList
                    data={currentData}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <CycleCard
                            cycle={{
                                ...item,
                                intake: Number(item.intake ?? 0)
                            }}
                            onPress={() => router.push(`/cycle/${item.id}` as any)}
                        />
                    )}
                    contentContainerClassName='p-4 pt-0 pb-10'
                    onRefresh={() => refetch()}
                    refreshing={isFetching}
                    ListEmptyComponent={
                        <View className='items-center justify-center p-10 opacity-50'>
                            <Icon as={Search} size={48} className='text-muted-foreground mb-4' />
                            <Text className='text-center text-lg font-medium'>
                                {status === "active" ? "No active cycles" : "No cycle history"}
                            </Text>
                            <Text className='text-center text-sm text-muted-foreground'>
                                {status === "active"
                                    ? "Active cycles will appear here when started"
                                    : "Past cycles will be archived here"}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
