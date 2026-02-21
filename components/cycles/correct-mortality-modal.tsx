import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Pencil, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";

interface CorrectMortalityModalProps {
    cycleId: string;
    currentMortality: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CorrectMortalityModal({
    cycleId,
    currentMortality,
    open,
    onOpenChange,
    onSuccess,
}: CorrectMortalityModalProps) {
    const [mortality, setMortality] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);

    const mortalityRef = useRef<TextInput>(null);
    const reasonRef = useRef<TextInput>(null);

    useEffect(() => {
        if (open) {
            setMortality(currentMortality.toString());
            setReason("");
            setError(null);
        }
    }, [open, currentMortality]);

    const mutation = trpc.officer.cycles.correctMortality.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            setMortality("");
            setReason("");
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numMortality = parseInt(mortality, 10);
        if (isNaN(numMortality) || numMortality < 0) {
            setError("Please enter a valid mortality number (>=0)");
            return;
        }
        if (!reason || reason.trim().length < 3) {
            setError("Please provide a reason (min 3 characters)");
            return;
        }
        setError(null);
        mutation.mutate({
            cycleId,
            newTotalMortality: numMortality,
            reason: reason.trim(),
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
                                <Icon as={Pencil} size={20} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">Correct Mortality</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Update total dead birds
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
                                <Text className="text-sm font-bold text-foreground">Total Mortality</Text>
                                <Text className="text-[10px] text-muted-foreground">Current: {currentMortality}</Text>
                            </View>
                            <Input
                                ref={mortalityRef}
                                placeholder="0"
                                keyboardType="numeric"
                                value={mortality}
                                onChangeText={setMortality}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                returnKeyType="next"
                                onSubmitEditing={() => reasonRef.current?.focus()}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Reason for Correction</Text>
                            <Input
                                ref={reasonRef}
                                placeholder="Reason for correction..."
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
                                    {mutation.isPending ? "Saving..." : "Save Correction"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
