import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Trash2 } from "lucide-react-native";
import { Modal, View } from "react-native";
import { toast } from "sonner-native";

interface DeleteFeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedOrderId: string;
    onSuccess?: () => void;
}

export function DeleteFeedOrderModal({ open, onOpenChange, feedOrderId, onSuccess }: DeleteFeedOrderModalProps) {
    const deleteMutation = trpc.officer.feedOrders.delete.useMutation({
        onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleDelete = () => {
        deleteMutation.mutate({ id: feedOrderId });
    };

    return (
        <Modal visible={open} animationType="fade" transparent onRequestClose={() => !deleteMutation.isPending && onOpenChange(false)}>
            <View className="flex-1 justify-center items-center bg-black/50 px-4">
                <View className="bg-card w-full max-w-sm rounded-3xl p-6 border border-border/50">
                    <View className="w-12 h-12 rounded-full bg-destructive/10 items-center justify-center mb-4">
                        <Icon as={Trash2} size={24} className="text-destructive" />
                    </View>

                    <Text className="text-xl font-bold mb-2 text-foreground">Delete Feed Order?</Text>
                    <Text className="text-muted-foreground mb-6">
                        Are you sure you want to delete this order? This action cannot be undone.
                    </Text>

                    <View className="flex-row gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onPress={() => onOpenChange(false)}
                            disabled={deleteMutation.isPending}
                        >
                            <Text>Cancel</Text>
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onPress={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            <Text>{deleteMutation.isPending ? "Deleting..." : "Delete"}</Text>
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
