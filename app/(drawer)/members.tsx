/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Check, Clock, Shield, ShieldOff, User, UserCheck, UserMinus, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

export default function MembersScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";

    const { data: members, isLoading, refetch } = trpc.management.members.list.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const approveMutation = trpc.management.members.approve.useMutation({ onSuccess: () => refetch() });
    const updateRoleMutation = trpc.management.members.updateRole.useMutation({ onSuccess: () => refetch() });
    const updateAccessMutation = trpc.management.members.updateAccess.useMutation({ onSuccess: () => refetch() });
    const updateStatusMutation = trpc.management.members.updateStatus.useMutation({ onSuccess: () => refetch() });
    const removeMutation = trpc.management.members.remove.useMutation({ onSuccess: () => refetch() });

    const [expandedMember, setExpandedMember] = useState<string | null>(null);

    const handleApprove = (memberId: string) => {
        approveMutation.mutate({ orgId, memberId });
    };

    const handleUpdateRole = (memberId: string, role: "MANAGER" | "OFFICER") => {
        updateRoleMutation.mutate({ orgId, memberId, role });
    };

    const handleUpdateAccess = (memberId: string, accessLevel: "VIEW" | "EDIT") => {
        updateAccessMutation.mutate({ orgId, memberId, accessLevel });
    };

    const handleToggleStatus = (memberId: string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        Alert.alert(
            `${newStatus === "INACTIVE" ? "Deactivate" : "Reactivate"} Member`,
            `Are you sure you want to ${newStatus === "INACTIVE" ? "deactivate" : "reactivate"} this member?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => updateStatusMutation.mutate({ orgId, memberId, status: newStatus }) },
            ]
        );
    };

    const handleRemove = (memberId: string, name: string) => {
        Alert.alert(
            "Remove Member",
            `Permanently remove ${name} from the organization?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => removeMutation.mutate({ orgId, memberId }) },
            ]
        );
    };

    const anyPending = approveMutation.isPending || updateRoleMutation.isPending ||
        updateAccessMutation.isPending || updateStatusMutation.isPending || removeMutation.isPending;

    const pendingMembers = members?.filter((m: any) => m.status !== "ACTIVE") ?? [];
    const activeMembers = members?.filter((m: any) => m.status === "ACTIVE") ?? [];

    const roleColors: Record<string, { border: string; bg: string; text: string }> = {
        OWNER: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-600" },
        MANAGER: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-600" },
        OFFICER: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-600" },
    };

    const accessColors: Record<string, { border: string; bg: string; text: string }> = {
        EDIT: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-600" },
        VIEW: { border: "border-zinc-500/40", bg: "bg-zinc-500/10", text: "text-zinc-500" },
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Members" />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color={"#10b981"} />
                    <Text className="mt-4 text-muted-foreground font-medium">Loading members...</Text>
                </View>
            ) : (
                <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">

                    {/* Pending Approvals */}
                    {pendingMembers.length > 0 && (
                        <View className="mb-6">
                            <View className="flex-row items-center gap-2 mb-3 px-1">
                                <View className="w-8 h-8 rounded-full bg-amber-500/10 items-center justify-center">
                                    <Icon as={Clock} size={16} className="text-amber-500" />
                                </View>
                                <Text className="text-lg font-bold text-foreground">Pending Approval</Text>
                                <Badge variant="outline" className="ml-auto border-amber-500/30 h-6 px-2.5">
                                    <Text className="text-[10px] text-amber-600 font-bold">{pendingMembers.length}</Text>
                                </Badge>
                            </View>

                            {pendingMembers.map((m: any) => (
                                <Card key={m.id} className="mb-3 border-amber-500/30 border overflow-hidden bg-amber-500/5">
                                    <CardContent className="p-4">
                                        <View className="flex-row items-center gap-3 mb-3">
                                            <View className="w-10 h-10 rounded-full bg-amber-500/10 items-center justify-center">
                                                <Icon as={User} size={20} className="text-amber-500" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-foreground">{m.name}</Text>
                                                <Text className="text-xs text-muted-foreground">{m.email}</Text>
                                            </View>
                                            <Badge variant="outline" className="h-4 px-1.5 border-amber-500/40 bg-amber-500/10">
                                                <Text className="text-[8px] text-amber-600 font-bold uppercase">{m.status}</Text>
                                            </Badge>
                                        </View>
                                        <View className="flex-row gap-2">
                                            <Button
                                                className="flex-1 h-10 rounded-xl bg-emerald-500 flex-row items-center justify-center gap-2"
                                                onPress={() => handleApprove(m.id)}
                                                disabled={anyPending}
                                            >
                                                <Icon as={Check} size={16} className="text-white" />
                                                <Text className="text-white font-bold text-xs">Approve</Text>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-none w-10 h-10 rounded-xl p-0 border-destructive/20 bg-destructive/5"
                                                onPress={() => handleRemove(m.id, m.name)}
                                                disabled={anyPending}
                                            >
                                                <Icon as={X} size={16} className="text-destructive" />
                                            </Button>
                                        </View>
                                    </CardContent>
                                </Card>
                            ))}
                        </View>
                    )}

                    {/* Active Members */}
                    <View className="flex-row items-center gap-2 mb-3 px-1">
                        <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Shield} size={16} className="text-primary" />
                        </View>
                        <Text className="text-lg font-bold text-foreground">Active Members</Text>
                        <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                            <Text className="text-[10px] text-primary font-bold">{activeMembers.length}</Text>
                        </Badge>
                    </View>

                    {activeMembers.length > 0 ? (
                        activeMembers.map((m: any) => {
                            const rc = roleColors[m.role] || roleColors.OFFICER;
                            const ac = accessColors[m.accessLevel] || accessColors.VIEW;
                            const isExpanded = expandedMember === m.id;

                            return (
                                <Card key={m.id} className="mb-3 border-border/50 overflow-hidden">
                                    <Pressable
                                        onPress={() => setExpandedMember(isExpanded ? null : m.id)}
                                        className="active:bg-muted/50"
                                    >
                                        <CardContent className="p-4 flex-row items-center gap-3">
                                            <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                                                <Icon as={User} size={20} className="text-muted-foreground" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-foreground">{m.name}</Text>
                                                <Text className="text-xs text-muted-foreground">{m.email}</Text>
                                            </View>
                                            <View className="items-end gap-1">
                                                <Badge variant="outline" className={`h-4 px-1.5 ${rc.border} ${rc.bg}`}>
                                                    <Text className={`text-[8px] font-bold uppercase ${rc.text}`}>{m.role}</Text>
                                                </Badge>
                                                <Badge variant="outline" className={`h-4 px-1.5 ${ac.border} ${ac.bg}`}>
                                                    <Text className={`text-[8px] font-bold uppercase ${ac.text}`}>{m.accessLevel}</Text>
                                                </Badge>
                                            </View>
                                        </CardContent>
                                    </Pressable>

                                    {isExpanded && (
                                        <View className="px-4 pb-4 border-t border-border/50 pt-3">
                                            {/* Role Selector */}
                                            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Role</Text>
                                            <View className="flex-row gap-2 mb-4">
                                                {(["OFFICER", "MANAGER"] as const).map(role => (
                                                    <Button
                                                        key={role}
                                                        variant={m.role === role ? "default" : "outline"}
                                                        size="sm"
                                                        className={`flex-1 h-9 rounded-lg ${m.role === role ? "" : "border-border/50"}`}
                                                        onPress={() => handleUpdateRole(m.id, role)}
                                                        disabled={anyPending || m.role === "OWNER"}
                                                    >
                                                        <Text className={`text-xs font-bold ${m.role === role ? "text-primary-foreground" : "text-foreground"}`}>
                                                            {role}
                                                        </Text>
                                                    </Button>
                                                ))}
                                            </View>

                                            {/* Access Level */}
                                            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Access</Text>
                                            <View className="flex-row gap-2 mb-4">
                                                {(["VIEW", "EDIT"] as const).map(level => (
                                                    <Button
                                                        key={level}
                                                        variant={m.accessLevel === level ? "default" : "outline"}
                                                        size="sm"
                                                        className={`flex-1 h-9 rounded-lg ${m.accessLevel === level ? "" : "border-border/50"}`}
                                                        onPress={() => handleUpdateAccess(m.id, level)}
                                                        disabled={anyPending}
                                                    >
                                                        <Text className={`text-xs font-bold ${m.accessLevel === level ? "text-primary-foreground" : "text-foreground"}`}>
                                                            {level}
                                                        </Text>
                                                    </Button>
                                                ))}
                                            </View>

                                            {/* Actions */}
                                            <View className="flex-row gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 h-9 rounded-lg border-amber-500/20 bg-amber-500/5 flex-row items-center justify-center gap-2"
                                                    onPress={() => handleToggleStatus(m.id, m.status)}
                                                    disabled={anyPending}
                                                >
                                                    <Icon as={m.status === "ACTIVE" ? ShieldOff : UserCheck} size={14} className="text-amber-600" />
                                                    <Text className="text-amber-600 text-xs font-bold">
                                                        {m.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                                    </Text>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-none w-9 h-9 p-0 rounded-lg border-destructive/20 bg-destructive/5"
                                                    onPress={() => handleRemove(m.id, m.name)}
                                                    disabled={anyPending}
                                                >
                                                    <Icon as={UserMinus} size={14} className="text-destructive" />
                                                </Button>
                                            </View>
                                        </View>
                                    )}
                                </Card>
                            );
                        })
                    ) : (
                        <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                            <CardContent className="flex-1 items-center justify-center">
                                <Text className="text-muted-foreground text-sm">No active members</Text>
                            </CardContent>
                        </Card>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
