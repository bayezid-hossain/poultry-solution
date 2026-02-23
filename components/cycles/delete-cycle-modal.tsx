import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Trash2 } from "lucide-react-native";
import { ActivityIndicator, Modal, View } from "react-native";
import { toast } from "sonner-native";

interface DeleteCycleModalProps {
    historyId: string;
    cycleName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export const DeleteCycleModal = ({ historyId, cycleName, open, onOpenChange, onSuccess }: DeleteCycleModalProps) => {
    const mutation = trpc.officer.cycles.deleteHistory.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            toast.success("Cycle history deleted successfully.");
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete cycle history");
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
                        <View className="w-12 h-12 rounded-full bg-destructive/10 items-center justify-center mb-4">
                            <Icon as={Trash2} size={24} className="text-destructive" />
                        </View>
                        <Text className="text-xl font-bold mb-2">Delete Cycle History</Text>
                        <Text className="text-muted-foreground mb-4 leading-5">
                            Are you sure you want to completely delete the history for "{cycleName}"?
                        </Text>

                        <View className="bg-destructive/5 border border-destructive/20 p-3 rounded-xl mb-6">
                            <Text className="text-destructive text-sm font-bold">
                                Warning: This action is permanent and cannot be undone. All related sales, logs, and tracking metrics will be permanently deleted.
                            </Text>
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
                                className="flex-1 h-12 bg-destructive active:bg-destructive/90"
                                onPress={() => mutation.mutate({ id: historyId })}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold">Delete</Text>
                                )}
                            </Button>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};
