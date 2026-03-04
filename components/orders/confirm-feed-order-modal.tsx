import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Truck } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { toast } from "sonner-native";

interface ConfirmFeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedOrderId: string;
    onSuccess?: () => void;
}

export function ConfirmFeedOrderModal({ open, onOpenChange, feedOrderId, onSuccess }: ConfirmFeedOrderModalProps) {
    const [driverName, setDriverName] = useState("");
    const [driverNameError, setDriverNameError] = useState(false);

    const confirmMutation = trpc.officer.feedOrders.confirm.useMutation({
        onSuccess: () => {
            toast.success("Order Confirmed & Stock Updated!");
            setDriverName("");
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleConfirm = () => {
        if (!driverName.trim()) {
            setDriverNameError(true);
            toast.error("Driver name is required.");
            return;
        }
        setDriverNameError(false);
        confirmMutation.mutate({
            id: feedOrderId,
            driverName: driverName.trim()
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={(v) => !confirmMutation.isPending && onOpenChange(v)}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-6 pb-10">
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-4">
                    <Icon as={CheckCircle2} size={24} className="text-primary" />
                </View>

                <Text className="text-xl font-bold mb-2 text-foreground">Confirm Feed Order?</Text>
                <Text className="text-muted-foreground mb-6">
                    Confirming this order will mark it complete and automatically add the feed quantities to each farmer's main inventory.
                </Text>

                <View className="mb-6 gap-2">
                    <View className="flex-row items-center justify-between mb-2 ml-1">
                        <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Driver Name / Reference</Text>
                        <Text className="text-[10px] font-black text-destructive uppercase">Required *</Text>
                    </View>
                    <View className={`flex-row items-center bg-card border rounded-2xl px-4 h-14 flex-1 ${driverNameError ? 'border-destructive' : 'border-border'}`}>
                        <Icon as={Truck} size={18} className="text-muted-foreground mr-3" />
                        <Input
                            placeholder="Enter driver name"
                            value={driverName}
                            onChangeText={(text) => { setDriverName(text); if (text.trim()) setDriverNameError(false); }}
                            className="flex-1"
                            returnKeyType="done"
                            onSubmitEditing={handleConfirm}
                        />
                    </View>
                    {driverNameError && (
                        <Text className="text-destructive text-xs ml-1 mt-1 font-medium">Driver name is required</Text>
                    )}
                </View>

                <View className="flex-row gap-3 mt-4">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onPress={() => onOpenChange(false)}
                        disabled={confirmMutation.isPending}
                    >
                        <Text>Cancel</Text>
                    </Button>
                    <Button
                        className="flex-1"
                        onPress={handleConfirm}
                        disabled={confirmMutation.isPending}
                    >
                        <Text>{confirmMutation.isPending ? "Confirming..." : "Confirm Delivery"}</Text>
                    </Button>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
