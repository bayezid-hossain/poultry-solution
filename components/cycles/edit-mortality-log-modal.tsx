import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";

interface EditMortalityLogModalProps {
    log: {
        id: string;
        value: number;
        note?: string | null;
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditMortalityLogModal({
    log,
    open,
    onOpenChange,
    onSuccess,
}: EditMortalityLogModalProps) {
    const [amount, setAmount] = useState(log?.value.toString() || ""); // Changed based on instruction, but using optional chaining for safety
    const [reason, setReason] = useState(log?.note || ""); // Changed based on instruction, but using optional chaining for safety
    const [error, setError] = useState<string | null>(null);

    const amountRef = useRef<TextInput>(null);
    const reasonRef = useRef<TextInput>(null);

    useEffect(() => {
        if (open && log) {
            setAmount(log.value.toString());
            setReason(log.note || "");
            setError(null);
        }
    }, [open, log]);

    const mutation = trpc.officer.cycles.editMortalityLog.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setAmount("");
            setReason("");
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    if (!log) return null;

    const handleSubmit = () => {
        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid mortality amount (>0)");
            return;
        }
        setError(null);
        mutation.mutate({
            logId: log.id,
            newAmount: numAmount,
            reason: reason.trim() || undefined,
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
                    <View className="p-6 pb-2 flex-row justify-between items-center">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                <Icon as={X} size={20} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">Edit Mortality</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Correct this specific log entry
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    <View className="p-6 space-y-4">
                        <View className="gap-2">
                            <View className="flex-row justify-between items-center ml-1">
                                <Text className="text-sm font-bold text-foreground">Dead Birds</Text>
                                <Text className="text-[10px] text-muted-foreground">Original: {log.value}</Text>
                            </View>
                            <Input
                                ref={amountRef}
                                placeholder="0"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                returnKeyType="next"
                                onSubmitEditing={() => reasonRef.current?.focus()}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Correction Note</Text>
                            <Input
                                ref={reasonRef}
                                placeholder="Note for correction..."
                                value={reason}
                                onChangeText={setReason}
                                className="h-12 bg-muted/30 border-border/50"
                                returnKeyType="next"
                                onSubmitEditing={handleSubmit}
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
                                className="flex-1 h-12 bg-primary rounded-xl shadow-none"
                                onPress={handleSubmit}
                                disabled={mutation.isPending}
                            >
                                <Text className="text-primary-foreground font-bold">
                                    {mutation.isPending ? "Saving..." : "Save Changes"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
