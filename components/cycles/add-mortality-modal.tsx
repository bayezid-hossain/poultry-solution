import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Platform, Pressable, TextInput, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface AddMortalityModalProps {
    cycleId: string;
    farmerName: string;
    open: boolean;
    startDate: Date | null;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddMortalityModal({
    cycleId,
    farmerName,
    open,
    startDate,
    onOpenChange,
    onSuccess,
}: AddMortalityModalProps) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const amountRef = useRef<TextInput>(null);

    const mutation = trpc.officer.cycles.addMortality.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            setAmount("");
            setDate(new Date());
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const handleSubmit = () => {
        const numAmount = parseInt(amount, 10);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (date && startDate) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (d < s) {
                toast.error("Date cannot be before cycle start");
                return;
            }
        }

        mutation.mutate({
            id: cycleId,
            amount: numAmount,
            date: date,
        });
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >

            <View className="flex-1">
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
                                <Icon as={X} size={18} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <View className="p-6 space-y-4">
                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Number of Birds</Text>
                                <Input
                                    ref={amountRef}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                    className="h-12 bg-muted/30 border-border/50"
                                    returnKeyType="next"
                                    onSubmitEditing={handleSubmit}
                                />
                            </View>

                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Date of Death</Text>
                                <Pressable
                                    onPress={() => setShowDatePicker(true)}
                                    className="h-12 bg-muted/30 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50"
                                >
                                    <Text className="text-sm text-foreground">
                                        {format(date, "PPPP")}
                                    </Text>
                                    <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                                </Pressable>
                                <Text className="text-[10px] text-muted-foreground ml-1">
                                    * Default to today. Backdating supported in details.
                                </Text>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                    minimumDate={startDate ? new Date(startDate) : undefined}
                                />
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
            </View>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
