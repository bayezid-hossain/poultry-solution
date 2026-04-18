import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { RefreshCcw } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { toast } from "sonner-native";

interface RevertFeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedOrderId: string;
    onSuccess?: () => void;
}

export function RevertFeedOrderModal({ open, onOpenChange, feedOrderId, onSuccess }: RevertFeedOrderModalProps) {
    const revertMutation = trpc.officer.feedOrders.revert.useMutation({
        onSuccess: () => {
            toast.success("Order reverted successfully");
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleRevert = () => {
        revertMutation.mutate({ id: feedOrderId });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={(v) => !revertMutation.isPending && onOpenChange(v)}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-6 pb-10">
                <View className="w-12 h-12 rounded-full bg-orange-500/10 items-center justify-center mb-4">
                    <Icon as={RefreshCcw} size={24} className="text-orange-600" />
                </View>

                <Text className="text-xl font-bold mb-2 text-foreground">Revert Feed Order?</Text>
                <Text className="text-muted-foreground mb-6">
                    This will mark the order as Pending and <Text className="font-bold text-foreground">subtract the quantities</Text> from the farmers' stock. Use this only to correct mistakes.
                </Text>

                <View className="flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => onOpenChange(false)}
                        disabled={revertMutation.isPending}
                    >
                        <Text>Cancel</Text>
                    </Button>
                    <Button
                        className="flex-1 bg-orange-600 active:bg-orange-700"
                        onPress={handleRevert}
                        disabled={revertMutation.isPending}
                    >
                        <Text className="text-white font-bold">{revertMutation.isPending ? "Reverting..." : "Revert Order"}</Text>
                    </Button>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
