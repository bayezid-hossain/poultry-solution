import { NotificationItem } from "@/components/notifications/notification-item";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { handleNotificationNavigation } from "@/hooks/use-push-notifications";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { ArrowLeft, BellIcon, CheckCheck } from "lucide-react-native";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

export default function NotificationsScreen() {
    const trpcContext = trpc.useUtils();

    const { data: notificationsData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = trpc.notifications.list.useInfiniteQuery(
        { limit: 20 },
        { getNextPageParam: (lastPage: any) => lastPage.nextCursor }
    );

    const markReadMutation = trpc.notifications.markAsRead.useMutation({
        onSuccess: () => {
            trpcContext.notifications.getUnreadCount.invalidate();
            trpcContext.notifications.list.invalidate();
        }
    });

    const markAllReadMutation = trpc.notifications.markAllAsRead.useMutation({
        onSuccess: () => {
            trpcContext.notifications.getUnreadCount.invalidate();
            trpcContext.notifications.list.invalidate();
        }
    });

    const handlePress = (notification: any) => {
        if (!notification.isRead) {
            markReadMutation.mutate({ id: notification.id });
        }

        if (notification.link) {
            handleNotificationNavigation(notification.link, router.push as any);
        }
    };

    const flatData = notificationsData?.pages.flatMap((p: any) => p.items) || [];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Notifications"
                leftElement={
                    <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-lg active:bg-accent mr-2">
                        <Icon as={ArrowLeft} size={20} className="text-foreground" />
                    </Pressable>
                }
            />

            {/* Header Actions */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border/50 bg-card">

                <Button
                    variant="ghost"
                    className="h-8 px-2 flex-row items-center gap-1.5"
                    disabled={markAllReadMutation.isPending || flatData.length === 0}
                    onPress={() => markAllReadMutation.mutate()}
                >
                    <Icon as={CheckCheck} size={14} className="text-primary" />
                    <Text className="text-primary text-xs font-bold uppercase tracking-wider">Mark all read</Text>
                </Button>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color="#10b981" />
                </View>
            ) : flatData.length === 0 ? (
                <View className="flex-1 items-center justify-center p-8">
                    <View className="w-16 h-16 rounded-3xl bg-muted/30 items-center justify-center mb-4">
                        <BellIcon size={24} className="text-primary dark:text-[#10b981]" color="#10b981" />
                    </View>
                    <Text className="text-lg font-bold text-foreground mb-2">All Caught Up</Text>
                    <Text className="text-sm text-center text-muted-foreground">
                        You have no new notifications right now. We'll alert you when something happens.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={flatData}
                    keyExtractor={(item) => item.id}
                    className="flex-1"
                    renderItem={({ item }) => (
                        <NotificationItem
                            id={item.id}
                            title={item.title}
                            message={item.message}
                            type={item.type as any}
                            createdAt={item.createdAt}
                            isRead={item.isRead}
                            onPress={() => handlePress(item)}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={async () => {
                                await trpcContext.notifications.list.invalidate();
                                await trpcContext.notifications.getUnreadCount.invalidate();
                            }}
                            colors={["#10b981"]}
                            tintColor="#10b981"
                        />
                    }
                    onEndReached={() => {
                        if (hasNextPage) {
                            fetchNextPage();
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() =>
                        isFetchingNextPage ? (
                            <View className="p-4 items-center">
                                <ActivityIndicator color="#10b981" />
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}

import { ActivityIndicator } from "react-native";

