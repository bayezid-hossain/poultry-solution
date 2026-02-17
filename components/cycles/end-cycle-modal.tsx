import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Archive, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";

interface EndCycleModalProps {
    cycle: {
        id: string;
        name: string;
        intake: number;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EndCycleModal({
    cycle,
    open,
    onOpenChange,
    onSuccess,
}: EndCycleModalProps) {
    const [intake, setIntake] = useState(cycle.intake.toString());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setIntake(cycle.intake.toString());
            setError(null);
        }
    }, [open, cycle]);

    const mutation = trpc.officer.cycles.end.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numIntake = parseFloat(intake);
        if (isNaN(numIntake) || numIntake < 0) {
            setError("Please enter a valid final feed intake");
            return;
        }
        setError(null);
        mutation.mutate({
            id: cycle.id,
            intake: numIntake,
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
                            <View className="w-10 h-10 rounded-full bg-amber-500/10 items-center justify-center">
                                <Icon as={Archive} size={20} className="text-amber-500" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">End Cycle</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Archive batch "{cycle.name}"
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    {/* Content */}
                    <View className="p-6 space-y-4">
                        <View className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex-row gap-3">
                            <Icon as={AlertTriangle} size={20} className="text-amber-500 shrink-0" />
                            <Text className="text-xs text-amber-700 dark:text-amber-400 flex-1 leading-relaxed">
                                Ending this cycle will move it to history. Please confirm the final total feed consumption below.
                            </Text>
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Final Feed Intake (Bags)</Text>
                            <Input
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={intake}
                                onChangeText={setIntake}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
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
                                className="flex-1 h-12 bg-amber-500 rounded-xl shadow-none"
                                onPress={handleSubmit}
                                disabled={mutation.isPending}
                            >
                                <Text className="text-white font-bold">
                                    {mutation.isPending ? "Ending..." : "End & Archive"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
