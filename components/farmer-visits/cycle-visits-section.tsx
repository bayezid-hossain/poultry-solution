import { VisitCard, type VisitListItem } from "@/components/farmer-visits/visit-card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFarmerVisitApi } from "@/lib/use-farmer-visit-api";
import { useRouter } from "expo-router";
import { ClipboardCheck, Plus } from "lucide-react-native";
import { View } from "react-native";
import { toast } from "sonner-native";

type VisitPage = { items: VisitListItem[]; nextCursor: number | null };

interface CycleVisitsSectionProps {
    // The cycle id, or its history id once the cycle has ended.
    cycleRef: string;
    // New visits can only be created for active cycles.
    canAdd: boolean;
}

export function CycleVisitsSection({ cycleRef, canAdd }: CycleVisitsSectionProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const { orgId, api } = useFarmerVisitApi();

    const query = api.list.useInfiniteQuery(
        { orgId, cycleRef, sort: "date", order: "desc" },
        {
            enabled: !!orgId,
            initialCursor: 1,
            getNextPageParam: (last: VisitPage) => last.nextCursor ?? undefined,
        },
    );

    const remove = api.delete.useMutation({
        onSuccess: () => { toast.success("Report deleted"); utils.invalidate(); },
        onError: (e) => toast.error(e.message),
    });

    const items = (query.data?.pages.flatMap((p: VisitPage) => p.items) ?? []) as unknown as VisitListItem[];

    if (query.isLoading) {
        return <View className="py-12 items-center justify-center"><BirdyLoader size={40} color="#10b981" /></View>;
    }

    if (query.isError) {
        return (
            <View className="py-8 items-center gap-3">
                <Text className="text-center text-muted-foreground">{query.error.message}</Text>
                <Button variant="outline" onPress={() => query.refetch()}><Text>Try again</Text></Button>
            </View>
        );
    }

    return (
        <View className="gap-3">
            {canAdd && (
                <Button
                    className="h-11 rounded-xl active:scale-[0.98]"
                    onPress={() => router.push(`/cycle/${cycleRef}/farmer-visit` as any)}
                >
                    <Icon as={Plus} size={16} className="text-primary-foreground" />
                    <Text className="font-bold">New visit</Text>
                </Button>
            )}

            {items.length === 0 ? (
                <View className="py-8 items-center gap-2">
                    <Icon as={ClipboardCheck} size={32} className="text-muted-foreground/50" />
                    <Text className="text-base font-bold text-foreground">No visits yet</Text>
                    <Text className="text-sm text-muted-foreground text-center">
                        {canAdd ? "Tap New visit to record the first farm visit for this cycle." : "No farm visits were recorded for this cycle."}
                    </Text>
                </View>
            ) : (
                items.map((item) => (
                    <VisitCard
                        key={item.id}
                        item={item}
                        onPress={() => router.push(`/cycle/${item.cycleId}/farmer-visit?date=${item.visitDate}` as any)}
                        onDelete={() => remove.mutate({ orgId, id: item.id })}
                    />
                ))
            )}

            {query.hasNextPage && (
                <Button variant="outline" className="h-10 rounded-xl" onPress={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                    <Text className="font-bold">{query.isFetchingNextPage ? "Loading..." : "Show more"}</Text>
                </Button>
            )}
        </View>
    );
}
