import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Briefcase, LogOut, Moon, Smartphone, Sun, User, UserCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

type ColorScheme = "light" | "dark" | "system";

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { preference, setColorScheme } = useTheme();
    const { data: sessionData } = trpc.auth.getSession.useQuery();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

    const [pendingMode, setPendingMode] = useState<"MANAGEMENT" | "OFFICER" | null>(null);

    const isManager = orgStatus?.role === "OWNER" || orgStatus?.role === "MANAGER";
    const orgMode = orgStatus?.activeMode || "OFFICER";

    const updateOrgMode = trpc.auth.updateOrgMode.useMutation({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [["auth", "getMyMembership"]] });
            setPendingMode(null);
        },
        onError: () => {
            setPendingMode(null);
        }
    });

    const handleSignOut = async () => {
        await authClient.signOut();
        queryClient.clear();
    };

    const handleModeChange = (mode: "MANAGEMENT" | "OFFICER") => {
        if (orgMode !== mode) {
            setPendingMode(mode);
            updateOrgMode.mutate({ mode });
        }
    };

    if (updateOrgMode.isPending && pendingMode) {
        return (
            <LoadingState
                fullPage
                title={`Switching to ${pendingMode}`}
                description="Updating your workspace perspective..."
            />
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Settings" />

            <ScrollView contentContainerClassName="p-4 pb-20 gap-6">

                {/* 1. Profile Section */}
                <View className="items-center py-6">
                    <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-4 border-background  mb-4">
                        <Icon as={User} size={40} className="text-primary" />
                    </View>
                    <Text className="text-2xl font-black text-foreground uppercase tracking-tight">
                        {sessionData?.user?.name || "User Account"}
                    </Text>
                    <Text className="text-sm text-muted-foreground font-medium mt-1">
                        {sessionData?.user?.email || "No email provided"}
                    </Text>
                </View>

                {/* 2. Workspace Mode */}
                {isManager && (
                    <View gap-3>
                        <View className="flex-row items-center gap-2 px-1 mb-1">
                            <Icon as={Briefcase} size={16} className="text-muted-foreground" />
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Workspace Perspective</Text>
                        </View>
                        <Card className="border-border/40 overflow-hidden">
                            <View className="flex-row bg-muted/50 p-1.5 gap-1.5">
                                <Pressable
                                    onPress={() => handleModeChange("MANAGEMENT")}
                                    className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 ${orgMode === "MANAGEMENT" ? "bg-background " : ""}`}
                                >
                                    <Icon as={Briefcase} size={14} className={orgMode === "MANAGEMENT" ? "text-primary" : "text-muted-foreground"} />
                                    <Text className={`text-xs font-bold uppercase tracking-widest ${orgMode === "MANAGEMENT" ? "text-foreground" : "text-muted-foreground"}`}>
                                        Management
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => handleModeChange("OFFICER")}
                                    className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 ${orgMode === "OFFICER" ? "bg-background " : ""}`}
                                >
                                    <Icon as={UserCheck} size={14} className={orgMode === "OFFICER" ? "text-primary" : "text-muted-foreground"} />
                                    <Text className={`text-xs font-bold uppercase tracking-widest ${orgMode === "OFFICER" ? "text-foreground" : "text-muted-foreground"}`}>
                                        Officer
                                    </Text>
                                </Pressable>
                            </View>
                        </Card>
                    </View>
                )}

                {/* 3. Appearance */}
                <View gap-3>
                    <View className="flex-row items-center gap-2 px-1 mb-1">
                        <Icon as={Sun} size={16} className="text-muted-foreground" />
                        <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">App Appearance</Text>
                    </View>
                    <Card className="border-border/40 overflow-hidden">
                        <View className="flex-row bg-muted/50 p-1.5 gap-1.5">
                            {[
                                { val: 'light', icon: Sun, label: 'Light' },
                                { val: 'dark', icon: Moon, label: 'Dark' },
                                { val: 'system', icon: Smartphone, label: 'System' }
                            ].map((opt) => (
                                <Pressable
                                    key={opt.val}
                                    onPress={() => setColorScheme(opt.val as any)}
                                    className={`flex-1 py-3 rounded-xl items-center justify-center gap-1.5 ${preference === opt.val ? "bg-background " : ""}`}
                                >
                                    <Icon as={opt.icon} size={14} className={preference === opt.val ? "text-primary" : "text-muted-foreground"} />
                                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${preference === opt.val ? "text-foreground" : "text-muted-foreground"}`}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Card>
                </View>

                {/* 4. Support & About */}
                <View gap-3>
                    <View className="flex-row items-center gap-2 px-1 mb-1">
                        <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Organization Details</Text>
                    </View>
                    <Card className="border-border/40 overflow-hidden">
                        <View className="p-4 flex-row items-center justify-between active:bg-muted/50">
                            <View className="flex-row items-center gap-3">
                                <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                                    <Text className="text-primary font-bold">{orgStatus?.orgName?.charAt(0) || "O"}</Text>
                                </View>
                                <View>
                                    <Text className="font-bold text-foreground">{orgStatus?.orgName || "Not in an organization"}</Text>
                                    <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{orgStatus?.role || "GUEST"}</Text>
                                </View>
                            </View>
                        </View>
                    </Card>
                </View>

                <Separator className="opacity-20" />

                {/* 5. Sign Out */}
                <Button
                    variant="destructive"
                    onPress={handleSignOut}
                    className="h-14 rounded-2xl flex-row items-center justify-center gap-3"
                    style={{ backgroundColor: '#ef4444' }}
                >
                    <Icon as={LogOut} size={18} className="text-white" />
                    <Text className="text-white font-bold tracking-widest uppercase">
                        Sign Out
                    </Text>
                </Button>

                <View className="items-center mt-4">
                    <Text className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.4em] opacity-40">
                        Poultry Solution v1.0.0
                    </Text>
                </View>

            </ScrollView>
        </View>
    );
}
