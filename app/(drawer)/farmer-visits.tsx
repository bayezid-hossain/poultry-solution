import { DateField } from "@/components/farmer-visits/date-field";
import { VisitCard, type VisitListItem } from "@/components/farmer-visits/visit-card";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { ProBlocker } from "@/components/pro-blocker";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFarmerVisitApi } from "@/lib/use-farmer-visit-api";
import { useRouter } from "expo-router";
import { ArrowDown, ArrowUp, ClipboardList, Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { toast } from "sonner-native";

type VisitPage = { items: VisitListItem[]; nextCursor: number | null };
type SortKey = "date" | "farmer";

export default function FarmerVisitsScreen() {
    const router = useRouter();
    const utils = trpc.useUtils();
    const { orgId, api, isPro } = useFarmerVisitApi();

    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sort, setSort] = useState<SortKey>("date");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    // Debounce typing so every keystroke does not hit the API.
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchText.trim()), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    const query = api.list.useInfiniteQuery(
        {
            orgId,
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            sort,
            order,
        },
        {
            enabled: !!orgId && isPro,
            initialCursor: 1,
            getNextPageParam: (last: VisitPage) => last.nextCursor ?? undefined,
        },
    );

    const remove = api.delete.useMutation({
        onSuccess: () => { toast.success("Report deleted"); utils.invalidate(); },
        onError: (e) => toast.error(e.message),
    });

    const items = (query.data?.pages.flatMap((p: VisitPage) => p.items) ?? []) as unknown as VisitListItem[];

    const toggleSort = (key: SortKey) => {
        if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
        else { setSort(key); setOrder(key === "farmer" ? "asc" : "desc"); }
    };

    const SortChip = ({ k, label }: { k: SortKey; label: string }) => {
        const active = sort === k;
        return (
            <Pressable
                onPress={() => toggleSort(k)}
                className={`flex-row items-center gap-1 h-9 px-3 rounded-full border active:opacity-70 ${active ? "bg-primary/10 border-primary/40" : "border-border"}`}
            >
                <Text className={`text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>{label}</Text>
                {active && <Icon as={order === "asc" ? ArrowUp : ArrowDown} size={12} className="text-primary" />}
            </Pressable>
        );
    };

    if (!isPro) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Farmer Visits" />
                <ProBlocker feature="Farmer Visit Reports" description="Create, track and share farmer visit reports with automatic FCR and standard comparisons." />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Farmer Visits" />

            <View className="px-4 pt-3 pb-2 gap-3 border-b border-border/50">
                <View className="flex-row items-center h-11 rounded-xl border border-border bg-card px-3 gap-2">
                    <Icon as={Search} size={16} className="text-muted-foreground" />
                    <Input
                        className="flex-1 h-9 border-0 bg-transparent px-0 shadow-none"
                        placeholder="Search farmer name"
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
                <View className="flex-row gap-3">
                    <DateField placeholder="From" value={dateFrom} onChange={setDateFrom} maximumDate={new Date()} clearable />
                    <DateField placeholder="To" value={dateTo} onChange={setDateTo} maximumDate={new Date()} clearable />
                </View>
                <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-semibold text-muted-foreground">Sort</Text>
                    <SortChip k="date" label="Date" />
                    <SortChip k="farmer" label="Farmer" />
                </View>
            </View>

            {query.isLoading ? (
                <View className="flex-1 items-center justify-center"><BirdyLoader /></View>
            ) : query.isError ? (
                <View className="flex-1 items-center justify-center px-8 gap-3">
                    <Text className="text-center text-muted-foreground">{query.error.message}</Text>
                    <Pressable className="h-10 px-4 rounded-xl border border-border items-center justify-center active:bg-accent" onPress={() => query.refetch()}>
                        <Text className="font-bold text-foreground">Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
                    renderItem={({ item }) => (
                        <VisitCard
                            item={item}
                            onPress={() => router.push(`/cycle/${item.cycleId}/farmer-visit?date=${item.visitDate}` as any)}
                            onDelete={() => remove.mutate({ orgId, id: item.id })}
                        />
                    )}
                    onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
                    onEndReachedThreshold={0.4}
                    refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-8 gap-2">
                            <Icon as={ClipboardList} size={36} className="text-muted-foreground/50" />
                            <Text className="text-base font-bold text-foreground">No visit reports yet</Text>
                            <Text className="text-sm text-muted-foreground text-center">
                                Open a cycle, choose Farmer Visit from its menu, and your reports will appear here.
                            </Text>
                        </View>
                    }
                    ListFooterComponent={query.isFetchingNextPage ? <View className="py-4"><BirdyLoader /></View> : null}
                />
            )}
        </View>
    );
}
