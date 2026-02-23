import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";
import { Calendar as CalendarIcon, CheckCircle2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast, Toaster } from "sonner-native";

interface ConfirmDocOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any;
    onSuccess?: () => void;
}

export function ConfirmDocOrderModal({ open, onOpenChange, order, onSuccess }: ConfirmDocOrderModalProps) {
    const insets = useSafeAreaInsets();

    // Map of docItemId -> Date
    const [cycleDates, setCycleDates] = useState<Record<string, Date>>({});

    // For date picker
    const [activePickerId, setActivePickerId] = useState<string | null>(null);

    useEffect(() => {
        if (open && order) {
            const initialDates: Record<string, Date> = {};
            order.items?.forEach((item: any) => {
                initialDates[item.id] = new Date(order.orderDate);
            });
            setCycleDates(initialDates);
            setActivePickerId(null);
        }
    }, [open, order]);

    const confirmMutation = trpc.officer.docOrders.confirm.useMutation({
        onSuccess: () => {
            toast.success("Order Confirmed! Cycles Generated.");
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleConfirm = () => {
        const formattedDates: Record<string, string> = {};
        Object.keys(cycleDates).forEach(id => {
            formattedDates[id] = cycleDates[id].toISOString();
        });

        confirmMutation.mutate({
            id: order.id,
            cycleDates: formattedDates
        });
    };

    if (!order) return null;

    return (
        <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => !confirmMutation.isPending && onOpenChange(false)}>

            <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
                {/* Header */}
                <View className="px-4 py-4 border-b border-border/50 flex-row justify-between items-center bg-card">
                    <View className="flex-row items-center gap-2">
                        <View className="bg-primary/20 w-8 h-8 rounded-full items-center justify-center">
                            <Icon as={CheckCircle2} size={16} className="text-primary" />
                        </View>
                        <Text className="text-lg font-bold text-foreground">Confirm DOC Order</Text>
                    </View>
                    <Pressable onPress={() => onOpenChange(false)} disabled={confirmMutation.isPending}>
                        <Text className="text-primary font-bold">Cancel</Text>
                    </Pressable>
                </View>

                {/* Content */}
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }}>
                    <View className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-2">
                        <Text className="text-sm text-foreground">
                            Confirming this order will automatically generate <Text className="font-bold">new active cycles</Text> for the listed farmers. Please confirm or adjust the placement dates below.
                        </Text>
                    </View>

                    <View className="gap-4">
                        <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Placement Dates</Text>

                        {order.items?.map((item: any) => (
                            <View key={item.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden p-4 flex-row justify-between items-center gap-4">
                                <View className="flex-1">
                                    <Text className="font-bold text-base text-primary mb-1">{item.farmer?.name || "Unknown Farmer"}</Text>
                                    <Text className="text-xs text-muted-foreground">{item.docCount} {item.birdType}</Text>
                                </View>

                                <View className="flex-1">
                                    <Pressable
                                        onPress={() => setActivePickerId(item.id)}
                                        className="h-10 bg-muted/50 rounded-lg flex-row items-center justify-between px-3 border border-border/50 w-full"
                                    >
                                        <Text className="text-sm font-semibold">{format(cycleDates[item.id] || new Date(), "MMM dd, yyyy")}</Text>
                                        <Icon as={CalendarIcon} size={14} className="text-muted-foreground" />
                                    </Pressable>
                                    {activePickerId === item.id && (
                                        <DateTimePicker
                                            value={cycleDates[item.id] || new Date()}
                                            mode="date"
                                            display="default"
                                            onChange={(event: any, date?: Date) => {
                                                setActivePickerId(null);
                                                if (date) {
                                                    setCycleDates(prev => ({ ...prev, [item.id]: date }));
                                                }
                                            }}
                                        />
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Footer */}
                <View className="p-4 border-t border-border/50 bg-card">
                    <Button
                        onPress={handleConfirm}
                        disabled={confirmMutation.isPending}
                        className="w-full h-12"
                    >
                        <Text>{confirmMutation.isPending ? "Generating Cycles..." : "Confirm & Create Cycles"}</Text>
                    </Button>
                </View>
            </View>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
