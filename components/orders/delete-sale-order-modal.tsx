import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Trash2 } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { toast } from "sonner-native";

interface DeleteSaleOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleOrderId: string;
    onSuccess?: () => void;
}

export function DeleteSaleOrderModal({ open, onOpenChange, saleOrderId, onSuccess }: DeleteSaleOrderModalProps) {
    const deleteMutation = trpc.officer.saleOrders.delete.useMutation({
        onSuccess: () => {
            onSuccess?.();
            onOpenChange(false);
            toast.success("Sale order deleted successfully");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleDelete = () => {
        deleteMutation.mutate({ id: saleOrderId });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={(v) => !deleteMutation.isPending && onOpenChange(v)}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-6 pb-10">
                <View className="w-12 h-12 rounded-full bg-destructive/10 items-center justify-center mb-4">
                    <Icon as={Trash2} size={24} className="text-destructive" />
                </View>

                <Text className="text-xl font-bold mb-2 text-foreground">Delete Sale Order?</Text>
                <Text className="text-muted-foreground mb-6">
                    Are you sure you want to delete this sale order? This action cannot be undone.
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
            </ScrollView>
        </BottomSheetModal>
    );
}
