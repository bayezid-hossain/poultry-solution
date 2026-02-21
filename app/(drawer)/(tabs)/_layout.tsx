import { useTheme } from "@/context/theme-context";
import { trpc } from "@/lib/trpc";
import { Tabs } from "expo-router";
import { Home, Repeat, Settings, ShoppingCart, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
    const { colorScheme } = useTheme();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();
    const insets = useSafeAreaInsets();

    const orgMode = orgStatus?.activeMode || "OFFICER";
    const isManagement = orgMode === "MANAGEMENT";

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colorScheme === "dark" ? "#09090b" : "#ffffff",
                    borderTopColor: colorScheme === "dark" ? "#27272a" : "#e4e4e7",
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colorScheme === "dark" ? "#fafafa" : "#18181b",
                tabBarInactiveTintColor: colorScheme === "dark" ? "#a1a1aa" : "#71717a",
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "600",
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    href: isManagement ? null : "/",
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="overview"
                options={{
                    title: "Overview",
                    href: isManagement ? "/overview" : null,
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="cycles"
                options={{
                    title: "Cycles",
                    tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="farmers"
                options={{
                    title: "Farmers",
                    tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: "Orders",
                    tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
