import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ColorScheme = "light" | "dark" | "system";

interface NavItem {
    label: string;
    icon: string;
    route: string;
}

const officerItems: NavItem[] = [
    { label: "Home", icon: "🏠", route: "/(tabs)" },
    { label: "Cycles", icon: "🔄", route: "/(tabs)/cycles" },
    { label: "Farmers", icon: "🧑‍🌾", route: "/(tabs)/farmers" },
];

const managementItems: NavItem[] = [
    { label: "Overview", icon: "📊", route: "/(tabs)/overview" },
    { label: "Officers", icon: "👥", route: "/(tabs)/officers" },
    { label: "Farmers", icon: "🧑‍🌾", route: "/(tabs)/farmers" },
    { label: "Cycles", icon: "🔄", route: "/(tabs)/cycles" },
];

function ModeToggleSection() {
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();
    const queryClient = useQueryClient();

    const isManager = orgStatus?.role === "OWNER" || orgStatus?.role === "MANAGER";
    const orgMode = orgStatus?.activeMode || "OFFICER";

    const updateOrgMode = trpc.auth.updateOrgMode.useMutation({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [["auth", "getMyMembership"]] });
        },
    });

    if (!isManager) return null;

    return (
        <View className="px-4 py-2">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                View Mode
            </Text>
            <View className="flex-row bg-muted rounded-lg p-1 gap-1">
                <Pressable
                    onPress={() => orgMode !== "MANAGEMENT" && updateOrgMode.mutate({ mode: "MANAGEMENT" })}
                    className={`flex-1 py-2 rounded-md items-center ${orgMode === "MANAGEMENT" ? "bg-primary " : ""}`}
                    disabled={updateOrgMode.isPending}
                >
                    <Text className={`text-[11px] font-bold ${orgMode === "MANAGEMENT" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        MGT
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => orgMode !== "OFFICER" && updateOrgMode.mutate({ mode: "OFFICER" })}
                    className={`flex-1 py-2 rounded-md items-center ${orgMode === "OFFICER" ? "bg-primary " : ""}`}
                    disabled={updateOrgMode.isPending}
                >
                    <Text className={`text-[11px] font-bold ${orgMode === "OFFICER" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        OFFICER
                    </Text>
                </Pressable>
            </View>
            {updateOrgMode.isPending && (
                <ActivityIndicator size="small" className="text-primary mt-2" />
            )}
        </View>
    );
}

function ThemeToggleSection() {
    const { preference, setColorScheme } = useTheme();

    const options: { label: string; value: ColorScheme }[] = [
        { label: "☀️", value: "light" },
        { label: "🌙", value: "dark" },
        { label: "⚙️", value: "system" },
    ];

    return (
        <View className="px-4 py-2">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                Theme
            </Text>
            <View className="flex-row bg-muted rounded-lg p-1 gap-1">
                {options.map((opt) => (
                    <Pressable
                        key={opt.value}
                        onPress={() => setColorScheme(opt.value)}
                        className={`flex-1 py-2 rounded-md items-center ${preference === opt.value ? "bg-primary " : ""}`}
                    >
                        <Text className={`text-sm ${preference === opt.value ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            {opt.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

export function CustomDrawerContent(props: any) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const { data: sessionData } = trpc.auth.getSession.useQuery();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

    const orgMode = orgStatus?.activeMode || "OFFICER";
    const isManagement = orgMode === "MANAGEMENT";
    const navItems = isManagement ? managementItems : officerItems;

    const handleSignOut = async () => {
        await authClient.signOut();
        router.replace("/sign-in");
    };

    const isActive = (route: string) => {
        if (route === "/(tabs)") return pathname === "/" || pathname === "";
        return pathname === route.replace("/(tabs)", "");
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

            {/* Mode Toggle */}
            <ModeToggleSection />

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
                        onPress={() => router.push("/(tabs)/settings" as any)}
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

            {/* Footer */}
            <View className="px-4 pb-4 gap-3" style={{ paddingBottom: insets.bottom + 16 }}>
                <ThemeToggleSection />
                <Separator />
                <Button
                    variant="ghost"
                    onPress={handleSignOut}
                    className="justify-start"
                >
                    <Text className="text-destructive text-sm font-medium">🚪 Sign Out</Text>
                </Button>
            </View>
        </View>
    );
}
