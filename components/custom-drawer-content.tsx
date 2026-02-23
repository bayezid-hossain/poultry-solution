import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NavItem {
    label: string;
    icon: string;
    route: string;
}

const officerItems: NavItem[] = [
    { label: "Home", icon: "🏠", route: "/(drawer)/(tabs)" },
    { label: "Cycles", icon: "🔄", route: "/(drawer)/(tabs)/cycles" },
    { label: "Farmers", icon: "🧑‍🌾", route: "/(drawer)/(tabs)/farmers" },
    { label: "Sales", icon: "💰", route: "/(drawer)/sales" },
    { label: "Stock & Import History", icon: "📋", route: "/(drawer)/stock-ledger" },
    { label: "Orders", icon: "📦", route: "/(drawer)/(tabs)/orders" },
    { label: "DOC Placements", icon: "📄", route: "/(drawer)/doc-placements" },
    { label: "Performance", icon: "📊", route: "/(drawer)/performance" },
    { label: "Production", icon: "🏭", route: "/(drawer)/production" },
    { label: "Settings", icon: "⚙️", route: "/(drawer)/settings" },
];

const managementItems: NavItem[] = [
    { label: "Overview", icon: "📊", route: "/(drawer)/(tabs)/overview" },
    { label: "Officers", icon: "👥", route: "/(drawer)/officers" },
    { label: "Members", icon: "🛡️", route: "/(drawer)/members" },
    { label: "Farmers", icon: "🧑‍🌾", route: "/(drawer)/(tabs)/farmers" },
    { label: "Cycles", icon: "🔄", route: "/(drawer)/(tabs)/cycles" },
    { label: "Orders", icon: "📦", route: "/(drawer)/(tabs)/orders" },
    { label: "Sales & Stock", icon: "📈", route: "/(drawer)/reports" },
    { label: "DOC Placements", icon: "📄", route: "/(drawer)/doc-placements" },
    { label: "Performance", icon: "📊", route: "/(drawer)/performance" },
    { label: "Production", icon: "🏭", route: "/(drawer)/production" },
    { label: "Settings", icon: "⚙️", route: "/(drawer)/settings" },
];

export function CustomDrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const { data: sessionData } = trpc.auth.getSession.useQuery();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

    const orgMode = orgStatus?.activeMode || "OFFICER";
    const isManagement = orgMode === "MANAGEMENT";
    const navItems = isManagement ? managementItems : officerItems;

    const isActive = (route: string) => {
        if (route === "/(drawer)/(tabs)") return pathname === "/" || pathname === "";
        return pathname === route.replace("/(drawer)/(tabs)", "").replace("/(drawer)", "");
    };

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-5 py-4">
                <Text className="text-xl font-bold text-primary">Poultry Solution</Text>
                {sessionData?.user && (
                    <View className="mt-2">
                        <Text className="text-sm font-semibold">{sessionData.user.name}</Text>
                        <Text variant="muted" className="text-xs">{sessionData.user.email}</Text>
                    </View>
                )}
            </View>

            <Separator className="mx-4" />

            {/* Navigation Items */}
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 8 }}>
                <View className="px-2 gap-1">
                    {navItems.map((item) => (
                        <Pressable
                            key={item.route}
                            onPress={() => router.push(item.route as any)}
                            className={`flex-row items-center gap-3 px-3 py-3 rounded-lg ${isActive(item.route)
                                ? "bg-primary/10"
                                : "active:bg-accent"
                                }`}
                        >
                            <Text className="text-lg">{item.icon}</Text>
                            <Text className={`text-sm font-medium ${isActive(item.route) ? "text-primary font-bold" : ""}`}>
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <View className="px-4 py-3">
                    <Separator />
                </View>

                {/* Settings */}
                <View className="px-2">
                    <Pressable
                        onPress={() => router.push("/(drawer)/(tabs)/settings" as any)}
                        className={`flex-row items-center gap-3 px-3 py-3 rounded-lg ${pathname === "/settings" ? "bg-primary/10" : "active:bg-accent"
                            }`}
                    >
                        <Text className="text-lg">⚙️</Text>
                        <Text className={`text-sm font-medium ${pathname === "/settings" ? "text-primary font-bold" : ""}`}>
                            Settings
                        </Text>
                    </Pressable>
                </View>
            </DrawerContentScrollView>
        </View>
    );
}
