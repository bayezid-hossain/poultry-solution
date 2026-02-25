import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Users } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

export const ManagementMembersList = ({ orgId }: { orgId: string }) => {
    const { data: members, isLoading } = trpc.management.members.list.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    if (isLoading) {
        return (
            <View className="py-12 items-center justify-center">
                <BirdyLoader size={48} color={"#10b981"} />
                <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                    Retrieving Members...
                </Text>
            </View>
        );
    }

    if (!members || members.length === 0) {
        return (
            <View className="py-8 items-center justify-center border border-border/50 border-dashed rounded-3xl bg-muted/30 mt-4">
                <Icon as={Users} size={32} color="#9ca3af" className="mb-2 opacity-50" />
                <Text className="text-muted-foreground italic text-sm">No members found.</Text>
            </View>
        );
    }

    return (
        <Card className="rounded-[2rem] border border-border/50 bg-card shadow-sm overflow-hidden p-1 mt-4">
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center border-b border-border/50">
                <View className="h-8 w-8 rounded-lg bg-blue-500/10 items-center justify-center mr-3">
                    <Icon as={Users} size={16} color="#3b82f6" />
                </View>
                <Text className="font-black uppercase tracking-widest text-foreground">Organization Members</Text>
            </View>

            {/* List */}
            <View className="p-2">
                {members.map((member: any, index: number) => {
                    const isLast = index === members.length - 1;
                    const isActive = member.status === "ACTIVE";
                    const isPending = member.status === "PENDING";

                    return (
                        <View
                            key={member.id}
                            className={`flex-row items-center justify-between p-3 ${!isLast ? "border-b border-border/50" : ""}`}
                        >
                            <View className="flex-1 mr-3">
                                <Text className="font-bold text-foreground text-sm" numberOfLines={1}>{member.name}</Text>
                                <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{member.email}</Text>
                            </View>

                            <View className="items-end gap-1">
                                <View className={`px-2 py-0.5 rounded-sm ${isActive ? 'bg-primary/10' : isPending ? 'bg-amber-500/10' : 'bg-muted'}`}>
                                    <Text className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-primary' : isPending ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                        {member.status}
                                    </Text>
                                </View>
                                <Text className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    {member.role}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </Card>
    );
};
