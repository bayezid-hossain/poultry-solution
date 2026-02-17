import { FarmerCard } from "@/components/farmers/farmer-card";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

export default function FarmersScreen() {
    const [search, setSearch] = useState("");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const { data, isLoading, refetch } = trpc.officer.farmers.listWithStock.useQuery(
        {
            orgId: membership?.orgId ?? "",
            search: search,
            pageSize: 50,
        },
        {
            enabled: !!membership?.orgId,
        }
    );

    const farmers = data?.items ?? [];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Farmers" />

            <View className="px-4 py-3">
                <View className="relative">
                    <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <Icon as={Search} size={18} className="text-muted-foreground" />
                    </View>
                    <Input
                        placeholder="Search farmers..."
                        className="pl-10 h-11 bg-card border-border/50"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground font-medium">Loading farmers...</Text>
                </View>
            ) : (
                <FlatList
                    data={farmers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <FarmerCard
                            farmer={item}
                            onPress={() => router.push(`/farmer/${item.id}` as any)}
                        />
                    )}
                    contentContainerClassName="p-4 pt-1 pb-10"
                    onRefresh={refetch}
                    refreshing={isLoading}
                    ListEmptyComponent={
                        <View className="items-center justify-center p-10 opacity-50">
                            <Icon as={Search} size={48} className="text-muted-foreground mb-4" />
                            <Text className="text-center text-lg font-medium">No farmers found</Text>
                            <Text className="text-center text-sm text-muted-foreground">Try searching with a different name</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
