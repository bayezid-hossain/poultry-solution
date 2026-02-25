import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

type ColorScheme = "light" | "dark" | "system";

function ModeToggle() {
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
        <Card className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest mb-3">
                View Mode
            </Text>
            <View className="flex-row bg-muted rounded-lg p-1 gap-1">
                <Pressable
                    onPress={() => {
                        if (orgMode !== "MANAGEMENT") {
                            updateOrgMode.mutate({ mode: "MANAGEMENT" });
                        }
                    }}
                    className={`flex-1 py-2 px-3 rounded-md items-center ${orgMode === "MANAGEMENT"
                        ? "bg-primary "
                        : ""
                        }`}
                    disabled={updateOrgMode.isPending}
                >
                    <Text
                        className={`text-xs font-bold ${orgMode === "MANAGEMENT"
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                            }`}
                    >
                        MANAGEMENT
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        if (orgMode !== "OFFICER") {
                            updateOrgMode.mutate({ mode: "OFFICER" });
                        }
                    }}
                    className={`flex-1 py-2 px-3 rounded-md items-center ${orgMode === "OFFICER"
                        ? "bg-primary "
                        : ""
                        }`}
                    disabled={updateOrgMode.isPending}
                >
                    <Text
                        className={`text-xs font-bold ${orgMode === "OFFICER"
                            ? "text-primary-foreground"
                            : "text-muted-foreground"
                            }`}
                    >
                        OFFICER
                    </Text>
                </Pressable>
            </View>
            {updateOrgMode.isPending && (
                <ActivityIndicator size="small" className="text-primary mt-2" />
            )}
        </Card>
    );
}

function ThemeToggle() {
    const { preference, setColorScheme } = useTheme();

    const options: { label: string; value: ColorScheme }[] = [
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
        { label: "System", value: "system" },
    ];

    return (
        <Card className="p-4">
            <Text className="text-xs font-bold uppercase tracking-widest mb-3">
                Appearance
            </Text>
            <View className="flex-row bg-muted rounded-lg p-1 gap-1">
                {options.map((opt) => (
                    <Pressable
                        key={opt.value}
                        onPress={() => setColorScheme(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-md items-center ${preference === opt.value
                            ? "bg-primary "
                            : ""
                            }`}
                    >
                        <Text
                            className={`text-xs font-bold ${preference === opt.value
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                                }`}
                        >
                            {opt.label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </Card>
    );
}

export default function SettingsScreen() {
    const router = useRouter();
    const { data: sessionData } = trpc.auth.getSession.useQuery();

    const handleSignOut = async () => {
        await authClient.signOut();
        router.replace("/(auth)/sign-in");
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Settings" />
            <ScrollView contentContainerClassName="p-5 gap-5">
                {/* User Info */}
                <Card className="p-4">
                    <Text className="font-semibold text-lg">
                        {sessionData?.user?.name || "User"}
                    </Text>
                    <Text variant="muted" className="text-sm">
                        {sessionData?.user?.email || ""}
                    </Text>
                </Card>

                {/* Mode Toggle */}
                <ModeToggle />

                {/* Theme Toggle */}
                <ThemeToggle />

                <Separator />

                {/* Sign Out */}
                <Button
                    variant="destructive"
                    onPress={handleSignOut}
                    className="rounded-xl"
                    size="lg"
                >
                    <Text className="text-destructive-foreground font-bold">
                        Sign Out
                    </Text>
                </Button>
            </ScrollView>
        </View>
    );
}
