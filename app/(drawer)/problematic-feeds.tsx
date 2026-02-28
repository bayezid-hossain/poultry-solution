import { ScreenHeader } from "@/components/screen-header";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatLocalDate } from "@/lib/export";
import { trpc } from "@/lib/trpc";
import { Leaf } from "lucide-react-native";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

export default function ProblematicFeedsScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManager = membership?.activeMode === "MANAGEMENT";
    const orgId = membership?.orgId as string;

    const managementQuery = trpc.management.farmers.getProblematicFeeds.useQuery({ orgId }, { enabled: !!orgId && isManager });
    const officerQuery = trpc.officer.farmers.getProblematicFeeds.useQuery({ orgId }, { enabled: !!orgId && !isManager });

    const activeQuery = isManager ? managementQuery : officerQuery;
    const { data: problematicFeeds, isLoading, isError, refetch, isRefetching } = activeQuery;

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Problematic Feeds" />

            <View className="flex-1">
                {isLoading ? (
                    <View className="flex-1 items-center justify-center p-8">
                        <ActivityIndicator size="large" color={isDark ? "white" : "black"} />
                        <Text className="mt-4 text-muted-foreground">Loading problematic feeds...</Text>
                    </View>
                ) : isError ? (
                    <View className="flex-1 items-center justify-center p-8">
                        <Text className="text-destructive text-center font-medium">Failed to load problematic feeds. Please try again later.</Text>
                    </View>
                ) : problematicFeeds?.length === 0 ? (
                    <View className="flex-1 items-center justify-center p-12">
                        <Leaf size={48} className="text-muted-foreground opacity-50 mb-4" />
                        <Text className="text-xl font-semibold text-foreground mb-2 text-center">All Clear!</Text>
                        <Text className="text-muted-foreground text-center">No farmers currently have problematic feeds.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={problematicFeeds}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={isDark ? "white" : "black"} />}
                        renderItem={({ item }) => (
                            <Card className="mb-4 overflow-hidden border-l-4 border-l-destructive">
                                <CardContent className="p-4">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-lg font-black text-foreground uppercase tracking-tight" numberOfLines={1}>{item.name}</Text>
                                        </View>
                                        <View className="bg-destructive/10 px-3 py-1 rounded-full border border-destructive/20">
                                            <Text className="text-destructive font-bold text-xs">
                                                {item.problematicFeed} bags
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between mt-4">
                                        <View>
                                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Main Stock</Text>
                                            <Text className="text-foreground font-bold">{item.mainStock} bags</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Last Update</Text>
                                            <Text className="text-foreground font-bold">
                                                {formatLocalDate(item.problematicFeedUpdatedAt)}
                                            </Text>
                                        </View>
                                    </View>
                                </CardContent>
                            </Card>
                        )}
                    />
                )}
            </View>
        </View>
    );
}
