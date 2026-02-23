import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Archive, ShoppingCart, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface EndCycleModalProps {
    cycle: {
        id: string;
        name: string;
        intake: number;
    };
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    onRecordSale?: () => void;
}

export function EndCycleModal({
    cycle,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
    onRecordSale,
}: EndCycleModalProps) {
    const [intake, setIntake] = useState("");

    const intakeRef = useRef<TextInput>(null);

    useEffect(() => {
        if (open) {
            setIntake(cycle.intake.toString());
        }
    }, [open, cycle]);

    const mutation = trpc.officer.cycles.end.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    const handleSubmit = () => {
        const numIntake = parseFloat(intake);
        if (isNaN(numIntake) || numIntake < 0) {
            toast.error("Please enter a valid final feed intake");
            return;
        }
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
                            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                <Icon as={Archive} size={20} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">Confirm End Cycle</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Are you sure you want to end this cycle?
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    {/* Content */}
                    <View className="p-6 space-y-4">
                        <View className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex-row gap-3">
                            <Icon as={AlertTriangle} size={20} className="text-destructive shrink-0" />
                            <Text className="text-xs text-destructive flex-1 leading-relaxed">
                                This will archive <Text className="font-bold text-destructive uppercase">{farmerName}</Text>. This action cannot be undone.
                            </Text>
                        </View>

                        <View className="gap-2">
                            <Text className="text-sm font-bold text-foreground ml-1">Physical Stock Intake (Bags)</Text>
                            <Input
                                ref={intakeRef}
                                placeholder="0"
                                keyboardType="numeric"
                                value={intake}
                                onChangeText={setIntake}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                returnKeyType="next"
                                onSubmitEditing={handleSubmit}
                            />
                            <Text className="text-[10px] text-muted-foreground ml-1">
                                Enter the actual number of bags physically eaten.
                            </Text>
                        </View>



                        <View className="gap-3 pt-2">
                            <Button
                                className="h-14 bg-white border border-border shadow-none rounded-2xl flex-row gap-2"
                                onPress={() => {
                                    onOpenChange(false);
                                    onRecordSale?.();
                                }}
                            >
                                <Icon as={ShoppingCart} size={18} className="text-black" />
                                <Text className="text-black font-bold">Record Sale & End</Text>
                            </Button>

                            <Button
                                variant="destructive"
                                className="h-14 rounded-2xl shadow-none"
                                onPress={handleSubmit}
                                disabled={mutation.isPending}
                            >
                                <Text className="text-destructive-foreground font-bold">
                                    {mutation.isPending ? "Ending..." : "End Without Sale"}
                                </Text>
                            </Button>

                            <Button
                                variant="ghost"
                                className="h-12 rounded-xl"
                                onPress={() => onOpenChange(false)}
                            >
                                <Text className="font-bold text-muted-foreground">Cancel</Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
