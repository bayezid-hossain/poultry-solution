import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Truck } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface ConfirmFeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedOrderId: string;
    onSuccess?: () => void;
}

export function ConfirmFeedOrderModal({ open, onOpenChange, feedOrderId, onSuccess }: ConfirmFeedOrderModalProps) {
    const [driverName, setDriverName] = useState("");

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
        confirmMutation.mutate({
            id: feedOrderId,
            driverName: driverName.trim() || undefined
        });
    };

    return (
        <Modal visible={open} animationType="fade" transparent onRequestClose={() => !confirmMutation.isPending && onOpenChange(false)}>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                className="flex-1 justify-center items-center bg-black/50 px-4"
            >
                <View className="bg-card w-full max-w-sm rounded-3xl overflow-hidden border border-border/50">
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-6">
                        <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-4">
                            <Icon as={CheckCircle2} size={24} className="text-primary" />
                        </View>

                        <Text className="text-xl font-bold mb-2 text-foreground">Confirm Feed Order?</Text>
                        <Text className="text-muted-foreground mb-6">
                            Confirming this order will mark it complete and automatically add the feed quantities to each farmer's main inventory.
                        </Text>

                        <View className="mb-6 gap-2">
                            <Text className="text-sm font-semibold">Driver Name <Text className="text-muted-foreground font-normal">(Optional)</Text></Text>
                            <View className="relative">
                                <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-5 h-5 justify-center items-center">
                                    <Icon as={Truck} size={16} className="text-muted-foreground" />
                                </View>
                                <Input
                                    placeholder="Enter driver name"
                                    value={driverName}
                                    onChangeText={setDriverName}
                                    className="pl-10"
                                    returnKeyType="done"
                                    onSubmitEditing={handleConfirm}
                                />
                            </View>
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
                </View>
            </KeyboardAvoidingView>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
