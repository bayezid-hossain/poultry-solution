import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Info, RotateCcw } from "lucide-react-native";
import { Modal, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface ReopenCycleModalProps {
    historyId: string;
    cycleName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export const ReopenCycleModal = ({ historyId, cycleName, open, onOpenChange, onSuccess }: ReopenCycleModalProps) => {
    const mutation = trpc.officer.cycles.reopenCycle.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            toast.success("Cycle reopened successfully.");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to reopen cycle");
        }
    });

    return (
        <Modal
            visible={open}
            animationType="fade"
            transparent={true}
            onRequestClose={() => onOpenChange(false)}
        >

            <View className="flex-1 justify-center items-center bg-black/50 px-4">
                <View className="bg-background w-full max-w-sm rounded-2xl overflow-hidden shadow-xl">
                    <View className="p-6">
                        <View className="w-12 h-12 rounded-full bg-amber-500/10 items-center justify-center mb-4">
                            <Icon as={RotateCcw} size={24} className="text-amber-600" />
                        </View>
                        <Text className="text-xl font-bold mb-2">Reopen Cycle</Text>
                        <Text className="text-muted-foreground mb-4 leading-5">
                            Are you sure you want to reopen "{cycleName}"?
                        </Text>

                        <View className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-6">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Icon as={Info} size={16} className="text-amber-600" />
                                <Text className="font-bold text-amber-600">Important Notes:</Text>
                            </View>
                            <Text className="text-amber-700/80 text-sm mb-1">• This will restore the cycle to "Active" status.</Text>
                            <Text className="text-amber-700/80 text-sm mb-1">• The feed consumption recorded at end of cycle will be added back to the farmer's main stock.</Text>
                            <Text className="text-amber-700/80 text-sm">• Audit logs will track this reopening.</Text>
                        </View>

                        <View className="flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-12"
                                onPress={() => onOpenChange(false)}
                            >
                                <Text className="font-bold">Cancel</Text>
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-amber-600 active:bg-amber-700"
                                onPress={() => mutation.mutate({ historyId })}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? (
                                    <BirdyLoader size={48} color={"#ffffff"} />
                                ) : (
                                    <Text className="text-white font-bold">Reopen</Text>
                                )}
                            </Button>
                        </View>
                    </View>
                </View>
            </View>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
};
