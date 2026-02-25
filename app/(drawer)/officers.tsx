/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { ChevronRight, Shield, User } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

export default function OfficersScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";

    const { data: officers, isLoading } = trpc.management.officers.getAll.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    const roleColors: Record<string, { border: string; bg: string; text: string }> = {
        OWNER: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-600" },
        MANAGER: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-600" },
        OFFICER: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-600" },
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Officers" />

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <BirdyLoader size={48} color={"#10b981"} />
                    <Text className="mt-4 text-muted-foreground font-medium">Loading officers...</Text>
                </View>
            ) : (
                <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
                    {/* Header */}
                    <View className="flex-row items-center gap-3 mb-6">
                        <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center">
                            <Icon as={Shield} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Team Members</Text>
                            <Text className="text-xs text-muted-foreground">
                                {officers?.length ?? 0} active officer{(officers?.length ?? 0) !== 1 ? "s" : ""}
                            </Text>
                        </View>
                    </View>

                    {officers && officers.length > 0 ? (
                        officers.map((officer: any) => {
                            const rc = roleColors[officer.role] || roleColors.OFFICER;
                            return (
                                <Card key={officer.id} className="mb-3 border-border/50 overflow-hidden">
                                    <Pressable
                                        onPress={() => router.push(`/officer/${officer.id}` as any)}
                                        className="active:bg-muted/50"
                                    >
                                        <CardContent className="p-4 flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-3 flex-1">
                                                <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                                                    <Icon as={User} size={20} className="text-muted-foreground" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-bold text-foreground">{officer.name}</Text>
                                                    <Badge variant="outline" className={`self-start mt-1 h-4 px-1.5 ${rc.border} ${rc.bg}`}>
                                                        <Text className={`text-[8px] font-bold uppercase ${rc.text}`}>{officer.role}</Text>
                                                    </Badge>
                                                </View>
                                            </View>
                                            <Icon as={ChevronRight} size={18} className="text-muted-foreground/40" />
                                        </CardContent>
                                    </Pressable>
                                </Card>
                            );
                        })
                    ) : (
                        <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                            <CardContent className="flex-1 items-center justify-center">
                                <Text className="text-muted-foreground text-sm">No officers found</Text>
                            </CardContent>
                        </Card>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
