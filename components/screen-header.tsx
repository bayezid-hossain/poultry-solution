import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
    title: string;
    leftElement?: ReactNode;
}

export function ScreenHeader({ title, leftElement }: ScreenHeaderProps) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const isManagerOrAdmin = membership?.activeMode === "MANAGEMENT" || membership?.activeMode === "ADMIN";

    const { data: unreadData } = trpc.notifications.getUnreadCount.useQuery(undefined, {
        refetchInterval: 30000,
        enabled: isManagerOrAdmin,
    });

    const unreadCount = unreadData?.count || 0;

    return (
        <View
            className="flex-row items-center px-4 pb-3 bg-background border-b border-border"
            style={{ paddingTop: insets.top + 8 }}
        >
            {leftElement ? (
                leftElement
            ) : (
                <Pressable
                    onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                    className="w-10 h-10 items-center justify-center rounded-lg active:bg-accent mr-2"
                >
                    <Text className="text-xl text-foreground">☰</Text>
                </Pressable>
            )}
            <Text className="text-xl font-bold text-[#16a34a] flex-1" numberOfLines={1}>{title}</Text>

            {isManagerOrAdmin && (
                <View className="flex-row items-center gap-1">

                    <Pressable
                        onPress={() => router.push("/notifications" as any)}
                        className="w-10 h-10 items-center justify-center rounded-full active:bg-accent relative"
                    >
                        <Bell size={20} className="text-primary" color="#10b981" />
                        {unreadCount > 0 && (
                            <View className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                        )}
                    </Pressable>
                </View>
            )}
        </View>
    );
}
