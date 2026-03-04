import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { triggerManualCheck } from "@/components/updater/version-checker";
import { useStorage } from "@/context/storage-context";
import { useTheme } from "@/context/theme-context";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from "expo-router";
import { Briefcase, Copy, LogOut, MapPin, Moon, Phone, RefreshCw, Smartphone, Sun, User, UserCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";

type ColorScheme = "light" | "dark" | "system";

export default function SettingsScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { preference, setColorScheme } = useTheme();
    const storage = useStorage();
    const { data: sessionData, refetch: refetchSession } = trpc.auth.getSession.useQuery();
    const { data: orgStatus } = trpc.auth.getMyMembership.useQuery();

    const [pendingMode, setPendingMode] = useState<"MANAGEMENT" | "OFFICER" | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState("");
    const [editBranchName, setEditBranchName] = useState("");
    const [editMobile, setEditMobile] = useState("");

    useEffect(() => {
        if (sessionData?.user && !isEditingProfile) {
            setEditName(sessionData.user.name || "");
            setEditBranchName(sessionData.user.branchName || "");
            setEditMobile(sessionData.user.mobile || "");
        }
    }, [sessionData?.user, isEditingProfile]);

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

    const updateProfile = trpc.auth.updateProfile.useMutation({
        onSuccess: async () => {
            await refetchSession();
            setIsEditingProfile(false);
            toast.success("Profile Updated", { description: "Your information has been saved successfully." });
        }
    });

    const copyToClipboard = async (text: string, label: string) => {
        if (!text) return;
        await Clipboard.setStringAsync(text);
        toast.success(`${label} Copied`, { description: text });
    };

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

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 pb-20 gap-6">

                {/* 1. Profile Section */}
                <View className="items-center py-6 mt-2">
                    <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-4 border-background  mb-4 relative">
                        <Icon as={User} size={40} className="text-primary" />
                    </View>

                    {!isEditingProfile ? (
                        <>
                            <Text className="text-2xl font-black text-foreground uppercase tracking-tight text-center">
                                {sessionData?.user?.name || "User Account"}
                            </Text>
                            <Text className="text-sm text-muted-foreground font-medium mt-1 text-center">
                                {sessionData?.user?.email || "No email provided"}
                            </Text>

                            <View className="w-full mt-6 bg-muted/40 rounded-3xl p-5 border border-border/40">
                                {sessionData?.user?.branchName && (
                                    <View className="flex-row items-center justify-between py-3 border-b border-border/40">
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                                                <Icon as={MapPin} size={14} className="text-primary" />
                                            </View>
                                            <View>
                                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Branch</Text>
                                                <Text className="text-sm font-bold text-foreground">{sessionData.user.branchName}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {sessionData?.user?.mobile && (
                                    <Pressable
                                        className="flex-row items-center justify-between py-3 active:opacity-70"
                                        onPress={() => copyToClipboard(sessionData.user.mobile!, "Phone Number")}
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                                                <Icon as={Phone} size={14} className="text-primary" />
                                            </View>
                                            <View>
                                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Mobile</Text>
                                                <Text className="text-sm font-bold text-foreground">{sessionData.user.mobile}</Text>
                                            </View>
                                        </View>
                                        <View className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                                            <Icon as={Copy} size={14} className="text-muted-foreground" />
                                        </View>
                                    </Pressable>
                                )}

                                {!sessionData?.user?.branchName && !sessionData?.user?.mobile && (
                                    <Text className="text-xs text-center text-muted-foreground italic py-2">No additional details provided</Text>
                                )}
                            </View>

                            <Button
                                variant="outline"
                                className="mt-6 h-12 w-full rounded-2xl border-primary/20 bg-primary/5"
                                onPress={() => setIsEditingProfile(true)}
                            >
                                <Text className="text-sm font-bold uppercase tracking-wider text-primary">Edit Profile</Text>
                            </Button>
                        </>
                    ) : (
                        <View className="w-full mt-4 gap-4 px-2">
                            <View className="gap-y-2">
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</Text>
                                <TextInput
                                    className="bg-muted/50 border border-border/50 text-foreground px-4 h-12 rounded-xl text-sm font-medium"
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Enter your full name"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View className="gap-y-2">
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Branch Name</Text>
                                <TextInput
                                    className="bg-muted/50 border border-border/50 text-foreground px-4 h-12 rounded-xl text-sm font-medium"
                                    value={editBranchName}
                                    onChangeText={setEditBranchName}
                                    placeholder="e.g., Dhaka North"
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>
                            <View className="gap-y-2">
                                <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Mobile Number</Text>
                                <TextInput
                                    className="bg-muted/50 border border-border/50 text-foreground px-4 h-12 rounded-xl text-sm font-medium"
                                    value={editMobile}
                                    onChangeText={setEditMobile}
                                    placeholder="e.g., 01700000000"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View className="flex-row gap-3 mt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl"
                                    onPress={() => setIsEditingProfile(false)}
                                    disabled={updateProfile.isPending}
                                >
                                    <Text className="text-xs font-bold uppercase tracking-wider">Cancel</Text>
                                </Button>
                                <Button
                                    className="flex-1 h-12 rounded-xl"
                                    disabled={!editName.trim() || updateProfile.isPending}
                                    onPress={() => updateProfile.mutate({
                                        name: editName.trim(),
                                        branchName: editBranchName.trim(),
                                        mobile: editMobile.trim()
                                    })}
                                >
                                    <Text className="text-xs font-bold uppercase tracking-wider text-white">
                                        {updateProfile.isPending ? "Saving..." : "Save Changes"}
                                    </Text>
                                </Button>
                            </View>
                        </View>
                    )}
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

                {/* 4. Storage & Downloads (Android only for now) */}
                {Platform.OS === "android" && (
                    <View gap-3>
                        <View className="flex-row items-center gap-2 px-1 mb-1">
                            <Icon as={Smartphone} size={16} className="text-muted-foreground" />
                            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Storage & Downloads</Text>
                        </View>
                        <Card className="border-border/40 p-4">
                            <View className="flex-row items-center justify-between mb-3">
                                <View className="flex-1 mr-4">
                                    <Text className="font-bold text-foreground">Download Folder</Text>
                                    <Text variant="muted" className="text-[10px] font-medium leading-4 mt-1">
                                        {storage.directoryUri ? "Reports will be saved to your selected directory automatically." : "Configure a fixed folder for all your generated reports."}
                                    </Text>
                                </View>
                                <Button
                                    variant={storage.directoryUri ? "outline" : "default"}
                                    className="h-9 px-4 rounded-xl"
                                    onPress={() => storage.directoryUri ? storage.resetDownloadFolder() : storage.setupDownloadFolder()}
                                >
                                    <Text className="text-[10px] font-bold uppercase tracking-wider">
                                        {storage.directoryUri ? "Reset" : "Set Folder"}
                                    </Text>
                                </Button>
                            </View>
                            {storage.directoryUri && (
                                <View className="bg-muted/50 p-3 rounded-xl border border-border/20">
                                    <Text className="text-[9px] font-mono text-muted-foreground break-all" numberOfLines={2}>
                                        {decodeURIComponent(storage.directoryUri)}
                                    </Text>
                                </View>
                            )}
                        </Card>
                    </View>
                )}

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

                {/* 5. App Update */}
                <View gap-3>
                    <View className="flex-row items-center gap-2 px-1 mb-1">
                        <Icon as={RefreshCw} size={16} className="text-muted-foreground" />
                        <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">App Update</Text>
                    </View>
                    <Card className="border-border/40 p-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 mr-4">
                                <Text className="font-bold text-foreground">Check for Updates</Text>
                                <Text variant="muted" className="text-[10px] font-medium leading-4 mt-1">
                                    Current Version: v{Constants.expoConfig?.version || '1.0.0'}
                                </Text>
                            </View>
                            <Button
                                variant="outline"
                                className="h-9 px-4 rounded-xl flex-row items-center gap-2"
                                onPress={() => triggerManualCheck()}
                            >
                                <Icon as={RefreshCw} size={12} className="text-foreground" />
                                <Text className="text-[10px] font-bold uppercase tracking-wider">
                                    Check
                                </Text>
                            </Button>
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
                        Poultry Solution v{Constants.expoConfig?.version || '1.0.0'}
                    </Text>
                </View>

            </ScrollView>
        </View>
    );
}
