import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Landmark, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

interface SecurityMoneyModalProps {
    farmer: {
        id: string;
        name: string;
        securityMoney: string | number;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function SecurityMoneyModal({
    farmer,
    open,
    onOpenChange,
    onSuccess,
}: SecurityMoneyModalProps) {
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setAmount(farmer.securityMoney.toString());
            setReason("");
            setError(null);
        }
    }, [open, farmer.securityMoney]);

    const mutation = trpc.officer.farmers.updateSecurityMoney.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            setError("Please enter a valid amount");
            return;
        }
        setError(null);
        mutation.mutate({
            id: farmer.id,
            amount: numAmount,
            reason: reason || "Standard update",
        });
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <Pressable
                className="flex-1 bg-black/60 items-center justify-center p-4"
                onPress={() => onOpenChange(false)}
            >
                <Pressable
                    className="w-full max-w-sm bg-card rounded-3xl overflow-hidden"
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <View className="p-6 pb-2 flex-row justify-between items-center">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                                <Icon as={Landmark} size={20} className="text-blue-500" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">Security Money</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Update deposit for {farmer.name}
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-4">
                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Total Amount (BTD)</Text>
                            <Input
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Adjustment Reason</Text>
                            <Input
                                placeholder="Initial deposit, addition..."
                                value={reason}
                                onChangeText={setReason}
                                className="h-12 bg-muted/30 border-border/50"
                            />
                        </View>

                        {error && (
                            <View className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                                <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                            </View>
                        )}

                        <View className="flex-row gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl"
                                onPress={() => onOpenChange(false)}
                            >
                                <Text className="font-bold">Cancel</Text>
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-blue-500 rounded-xl shadow-none"
                                onPress={handleSubmit}
                                disabled={mutation.isPending}
                            >
                                <Text className="text-white font-bold">
                                    {mutation.isPending ? "Updating..." : "Update"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
