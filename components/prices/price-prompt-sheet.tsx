import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

// Lives for the app process, so "Later" hides the reminder until the next app launch.
let dismissedThisLaunch = false;

export function PricePromptSheet() {
    const router = useRouter();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isOfficer = membership?.status === "ACTIVE" && membership.activeMode === "OFFICER";
    const status = trpc.officer.pricePolicies.status.useQuery(
        { orgId: membership?.orgId ?? "" },
        { enabled: isOfficer && !!membership?.orgId },
    );
    const [dismissed, setDismissed] = useState(dismissedThisLaunch);

    const open = isOfficer && status.data?.hasOwnPolicy === false && !dismissed;
    const later = () => {
        dismissedThisLaunch = true;
        setDismissed(true);
    };

    return (
        <BottomSheetModal open={open} onOpenChange={(o) => { if (!o) later(); }}>
            <View className="p-6 gap-4">
                <Text className="text-xl font-bold text-foreground">Set your prices</Text>
                <Text className="text-sm text-muted-foreground">
                    You have not set your own DOC, feed and selling prices yet, so your profit numbers use the organization defaults.
                </Text>
                <Button
                    className="h-12 rounded-xl"
                    onPress={() => {
                        later();
                        router.push(`/(drawer)/my-prices?add=${Date.now()}` as any);
                    }}
                >
                    <Text className="font-bold">Set prices</Text>
                </Button>
                <Button variant="outline" className="h-12 rounded-xl" onPress={later}>
                    <Text className="font-bold">Later</Text>
                </Button>
            </View>
        </BottomSheetModal>
    );
}
