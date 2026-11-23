/// <reference types="nativewind/types" />
import { PricePoliciesContent } from "@/components/prices/price-policies-content";
import { ScreenHeader } from "@/components/screen-header";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Check, ChevronDown, Users, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

type OfficerOption = { id: string; name: string; role: string };

export default function PricePoliciesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";

    const canManage =
        membership?.role === "OWNER" || membership?.role === "MANAGER";

    // Local to this screen on purpose: the app-wide selected officer filter is not touched.
    // null = the organization default.
    const [officerId, setOfficerId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    const { data: officers } = trpc.management.officers.getAll.useQuery(
        { orgId },
        { enabled: !!orgId && canManage }
    );
    const officerList = (officers ?? []) as OfficerOption[];
    const selectedName = officerId
        ? officerList.find((o) => o.id === officerId)?.name ?? "Officer"
        : "Org default";

    if (!canManage) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Price Policies" />
                <View className="flex-1 items-center justify-center px-8">
                    <Text className="text-muted-foreground text-center">
                        Only managers and owners can view price policies.
                    </Text>
                </View>
            </View>
        );
    }

    const choose = (id: string | null) => {
        setOfficerId(id);
        setPickerOpen(false);
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Price Policies" leftElement={undefined} />

            <View className="px-4 pt-3 flex-row items-center">
                <Pressable
                    onPress={() => setPickerOpen(true)}
                    className="flex-row items-center gap-2 bg-muted/40 border border-border/50 px-4 py-2.5 rounded-full active:bg-muted/60"
                >
                    <Icon as={Users} size={14} className="text-primary" />
                    <Text className="text-xs font-black text-foreground/80 tracking-tight" numberOfLines={1}>
                        {selectedName}
                    </Text>
                    <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
                </Pressable>
            </View>

            <PricePoliciesContent scope={{ kind: "officer", officerId }} />

            <BottomSheetModal open={pickerOpen} onOpenChange={setPickerOpen}>
                <View className="px-6 py-4 pb-10">
                    <View className="flex-row items-center justify-between mb-4">
                        <View>
                            <Text className="text-2xl font-black text-foreground tracking-tight">Applies to</Text>
                            <Text className="text-xs text-muted-foreground font-medium">Choose whose prices to view and edit</Text>
                        </View>
                        <Pressable
                            onPress={() => setPickerOpen(false)}
                            className="w-10 h-10 rounded-full bg-muted/50 items-center justify-center active:bg-muted"
                        >
                            <Icon as={X} size={20} className="text-muted-foreground" />
                        </Pressable>
                    </View>
                    <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                        <View className="gap-3">
                            {[{ id: null as string | null, name: "Org default", role: "Used when an officer has no prices" }, ...officerList].map((o) => {
                                const isActive = officerId === o.id;
                                return (
                                    <Pressable
                                        key={o.id ?? "default"}
                                        onPress={() => choose(o.id)}
                                        className={`flex-row items-center justify-between p-4 rounded-2xl border active:opacity-80 ${isActive ? "bg-primary/10 border-primary/20" : "bg-muted/20 border-border/30"}`}
                                    >
                                        <View className="flex-1">
                                            <Text className={`text-base font-black ${isActive ? "text-primary" : "text-foreground"}`}>{o.name}</Text>
                                            <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-0.5">{o.role}</Text>
                                        </View>
                                        {isActive && <Icon as={Check} size={18} className="text-primary" />}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </BottomSheetModal>
        </View>
    );
}
