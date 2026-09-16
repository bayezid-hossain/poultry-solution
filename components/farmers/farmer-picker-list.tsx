import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react-native";
import { ReactElement, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

export type PickerFarmer = {
    id: string;
    name: string;
    location?: string | null;
    mainStock: number;
    [key: string]: any;
};

interface FarmerPickerListProps {
    orgId: string;
    /** Skip the query until the picker is actually visible. */
    enabled?: boolean;
    placeholder?: string;
    pageSize?: number;
    /** Caller owns the row: selection state, layout, press handling. */
    renderRow: (farmer: PickerFarmer) => ReactElement;
}

export const FarmerPickerList = ({
    orgId,
    enabled = true,
    placeholder = "Search farmers...",
    pageSize = 20,
    renderRow,
}: FarmerPickerListProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        isError,
    } = trpc.officer.farmers.listWithStock.useInfiniteQuery(
        { orgId, pageSize, search: debouncedSearch.trim() || undefined },
        {
            enabled: enabled && !!orgId,
            getNextPageParam: (lastPage: any) => lastPage.nextCursor,
            placeholderData: (prev: any) => prev,
        }
    );

    const farmers: PickerFarmer[] = data?.pages.flatMap((p: any) => p.items) ?? [];
    const isSearching = debouncedSearch.trim().length > 0;

    return (
        <View className="flex-1">
            <View className="px-4 py-3 border-b border-border/50">
                <View className="relative justify-center">
                    <View className="absolute left-3 z-10 w-5 h-5 justify-center items-center">
                        <Icon as={Search} size={18} className="text-muted-foreground" />
                    </View>
                    <Input
                        placeholder={placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="pl-10 h-10"
                    />
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={36} />
                    <Text className="mt-4 text-muted-foreground font-black uppercase tracking-tight text-xs">
                        Loading farmers...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={farmers}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => renderRow(item)}
                    onEndReachedThreshold={0.4}
                    onEndReached={() => {
                        if (hasNextPage && !isFetchingNextPage) {
                            fetchNextPage();
                        }
                    }}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <View className="py-4 items-center">
                                <ActivityIndicator />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View className="p-8 items-center">
                            <Text className="text-muted-foreground">
                                {isError
                                    ? "Couldn't load farmers. Pull to retry."
                                    : isSearching
                                        ? "No farmer matches that search."
                                        : "No farmers found."}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
