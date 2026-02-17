import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

interface AddMortalityModalProps {
    cycleId: string;
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddMortalityModal({
    cycleId,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
}: AddMortalityModalProps) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date());
    const [error, setError] = useState<string | null>(null);

    const mutation = trpc.officer.cycles.addMortality.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            setAmount("");
            setDate(new Date());
            onSuccess?.();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        setError(null);
        mutation.mutate({
            id: cycleId,
            amount: numAmount,
            date: date,
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
                        <View>
                            <Text className="text-xl font-bold text-foreground">Add Mortality</Text>
                            <Text className="text-xs text-muted-foreground mt-1">
                                Record birds death for {farmerName}
                            </Text>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <X size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-4">
                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Number of Birds</Text>
                            <Input
                                placeholder="0"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                                className="h-12 bg-muted/30 border-border/50"
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Date of Death</Text>
                            <View className="h-12 bg-muted/30 border border-border/50 rounded-md px-3 flex-row items-center justify-between">
                                <Text className="text-sm text-foreground">
                                    {format(date, "PPPP")}
                                </Text>
                                <CalendarIcon size={16} className="text-muted-foreground" />
                            </View>
                            <Text className="text-[10px] text-muted-foreground ml-1">
                                * Default to today. Backdating supported in details.
                            </Text>
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
                                className="flex-1 h-12 bg-destructive rounded-xl shadow-none"
                                onPress={handleSubmit}
                                disabled={mutation.isPending}
                            >
                                <Text className="text-white font-bold">
                                    {mutation.isPending ? "Recording..." : "Record"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
