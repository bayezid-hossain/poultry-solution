import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { BarChart3, Bird, ClipboardList, Crown, LayoutDashboard, Package, Settings, ShoppingBag, TrendingUp, Users, Wheat } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SubscriptionStatus } from "./subscription-status";

interface NavItem {
    label: string;
    icon: any;
    route: string;
    isPro?: boolean;
}

const officerCoreItems: NavItem[] = [
    { label: "Dashboard", icon: LayoutDashboard, route: "/(drawer)/(tabs)" },
    { label: "Cycles", icon: Users, route: "/(drawer)/(tabs)/cycles" },
    { label: "Farmers", icon: Wheat, route: "/(drawer)/(tabs)/farmers" },
];

const officerActivityItems: NavItem[] = [
    { label: "Sales", icon: ShoppingBag, route: "/(drawer)/sales", isPro: true },
    { label: "Stock & Import", icon: ClipboardList, route: "/(drawer)/stock-ledger", isPro: true },
];

const officerOrderItems: NavItem[] = [
    { label: "Feed Orders", icon: Package, route: "/(drawer)/(tabs)/orders?tab=feed", isPro: true },
    { label: "DOC Orders", icon: Bird, route: "/(drawer)/(tabs)/orders?tab=doc", isPro: true },
    { label: "Sale Orders", icon: ShoppingBag, route: "/(drawer)/(tabs)/orders?tab=sale", isPro: true },
];

const officerReportItems: NavItem[] = [
    { label: "Monthly DOC Placements", icon: ClipboardList, route: "/(drawer)/doc-placements", isPro: true },
    { label: "Yearly Performance", icon: TrendingUp, route: "/(drawer)/performance", isPro: true },
    { label: "Monthly Production", icon: BarChart3, route: "/(drawer)/production", isPro: true },
];

const managementCoreItems: NavItem[] = [
    { label: "Overview", icon: LayoutDashboard, route: "/(drawer)/(tabs)/overview" },
    { label: "Officers", icon: Users, route: "/(drawer)/officers" },
    { label: "Members", icon: Crown, route: "/(drawer)/members" },
    { label: "Farmers", icon: Wheat, route: "/(drawer)/(tabs)/farmers" },
    { label: "Cycles", icon: Users, route: "/(drawer)/(tabs)/cycles" },
];

const managementActivityItems: NavItem[] = [
    { label: "Sales & Stock", icon: ShoppingBag, route: "/(drawer)/reports", isPro: true },
];

const managementOrderItems: NavItem[] = [
    { label: "Orders", icon: Package, route: "/(drawer)/(tabs)/orders", isPro: true },
];

const managementReportItems: NavItem[] = [
    { label: "Monthly DOC Placements", icon: ClipboardList, route: "/(drawer)/doc-placements", isPro: true },
    { label: "Yearly Performance", icon: TrendingUp, route: "/(drawer)/performance", isPro: true },
    { label: "Monthly Performance", icon: BarChart3, route: "/(drawer)/production", isPro: true },
];

export function CustomDrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const globalParams = useGlobalSearchParams();
    const insets = useSafeAreaInsets();

    const { data: sessionData } = trpc.auth.getSession.useQuery();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

    const orgMode = orgStatus?.activeMode || "OFFICER";
    const isManagement = orgMode === "MANAGEMENT";

    const coreItems = isManagement ? managementCoreItems : officerCoreItems;
    const activityItems = isManagement ? managementActivityItems : officerActivityItems;
    const orderItems = isManagement ? managementOrderItems : officerOrderItems;
    const reportItems = isManagement ? managementReportItems : officerReportItems;

    const isActive = (route: string) => {
        const [path, query] = route.split('?');
        const normalizedPathname = pathname === "/" || pathname === "" ? "/(drawer)/(tabs)" : pathname;

        // Remove prefixes from the route path to match normalizedPathname
        const cleanRoutePath = path.replace("/(drawer)/(tabs)", "").replace("/(drawer)", "") || "/(drawer)/(tabs)";

        const pathMatches = normalizedPathname === cleanRoutePath;

        if (!pathMatches) return false;

        // If the item route has query params (like ?tab=feed), we MUST match them
        if (query) {
            const params = new URLSearchParams(query);
            const tabParam = params.get('tab');
            if (tabParam) {
                return globalParams.tab === tabParam;
            }
        }

        // If the item route has NO query params, but we are on a page that DOES have params,
        // we should only be active if the base path matches and we aren't a specifically "tabbed" item.
        // For orders, we always have a tab, so if query is empty here, it shouldn't match /orders.
        if (cleanRoutePath === "/orders" && !query) return false;

        return true;
    };

    const renderNavSection = (items: NavItem[], title?: string) => (
        <View className="px-2 gap-0.5 mb-4">
            {title && (
                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                    {title}
                </Text>
            )}
            {items.map((item) => (
                <Pressable
                    key={item.route}
                    onPress={() => router.push(item.route as any)}
                    className={`flex-row items-center gap-3 px-3 py-2 rounded-xl ${isActive(item.route)
                        ? "bg-primary/10"
                        : "active:bg-accent/50"
                        }`}
                >
                    <Icon as={item.icon} size={20} className={isActive(item.route) ? "text-primary" : "text-foreground"} />
                    <Text className={`text-sm flex-1 ${isActive(item.route) ? "text-primary font-bold" : "font-medium text-foreground"}`}>
                        {item.label}
                    </Text>
                    {item.isPro && (
                        <View className="bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            <Text className="text-[8px] font-black text-foreground">PRO</Text>
                        </View>
                    )}
                </Pressable>
            ))}
        </View>
    );

    const isPro = sessionData?.user?.isPro;
    const proExpiresAt = sessionData?.user?.proExpiresAt ? new Date(sessionData.user.proExpiresAt) : null;

    return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="px-5 py-8">
                <View className="flex-row items-center gap-3">
                    <View className="relative">
                        <View className="absolute -inset-2 bg-primary/10 rounded-2xl blur-md" />
                        <Image
                            source={require("@/assets/images/logo.png")}
                            style={{ width: 44, height: 44, borderRadius: 12 }}
                            className="bg-background p-1 border border-border/50"
                        />
                    </View>
                    <View>
                        <Text className="text-xl font-black text-foreground tracking-tighter uppercase leading-none">
                            Poultry
                        </Text>
                        <Text className="text-[10px] font-black text-primary tracking-[0.2em] uppercase leading-none mt-1">
                            Solution
                        </Text>
                    </View>
                </View>


            </View>

            <View className="px-4 mb-4">
                <Separator className="opacity-20" />
            </View>

            {/* Navigation Items */}
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0, paddingBottom: 20 }}>
                {renderNavSection(coreItems)}
                {renderNavSection(activityItems, "Activity")}
                {renderNavSection(orderItems, "Orders")}
                {renderNavSection(reportItems, "Reports")}

                <View className="px-5 mt-2">
                    <Separator className="opacity-20" />
                </View>

                {/* Settings Section */}
                <View className="px-2 mt-4">
                    <Pressable
                        onPress={() => router.push("/(drawer)/settings" as any)}
                        className={`flex-row items-center gap-3 px-3 py-2 rounded-xl ${pathname === "/settings" ? "bg-primary/10" : "active:bg-accent/50"
                            }`}
                    >
                        <Icon as={Settings} size={20} className={pathname === "/settings" ? "text-primary" : "text-foreground"} />
                        <Text className={`text-sm flex-1 ${pathname === "/settings" ? "text-primary font-bold" : "font-medium text-foreground"}`}>
                            Settings
                        </Text>
                    </Pressable>
                </View>
            </DrawerContentScrollView>

            {/* Footer / Subscription Status */}
            <View className="p-2 -gap-y-2 border-t border-border/10 bg-card/30">
                <SubscriptionStatus isPro={isPro} proExpiresAt={proExpiresAt} />
                {sessionData?.user && (
                    <View className="mt-2 flex-row items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/50">
                        <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20">
                            <Text className="font-bold text-primary">{sessionData.user.name?.[0] || "?"}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-black text-foreground uppercase tracking-tight" numberOfLines={1}>{sessionData.user.name}</Text>
                            <Text variant="muted" className="text-[10px] font-bold uppercase opacity-50 tracking-wider" numberOfLines={1}>{sessionData.user.email}</Text>
                        </View>
                    </View>
                )}
            </View>

        </View>
    );
}
