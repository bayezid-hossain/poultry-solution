import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Calendar, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, ScrollView, TouchableOpacity, View } from "react-native";

interface EditOfficialDateModalProps {
    cycleId: string;
    currentDate: Date | string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditOfficialDateModal({
    cycleId,
    currentDate,
    open,
    onOpenChange,
    onSuccess,
}: EditOfficialDateModalProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            if (currentDate) {
                setSelectedDate(new Date(currentDate));
            } else {
                setSelectedDate(new Date());
            }
            setError(null);
            setShowDatePicker(false);
        }
    }, [open, currentDate]);

    const mutation = trpc.officer.cycles.updateOfficialInputDate.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        mutation.mutate({
            id: cycleId,
            officialInputDate: selectedDate,
        });
    };

    const onDateChange = (event: any, date?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
        }
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Calendar} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Official Input Date</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                Set or update the official DOC input date
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                <View className="p-6 space-y-4">
                    <View className="gap-2">
                        <Text className="text-sm font-bold text-foreground ml-1">Select Date</Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="h-12 bg-muted/30 border border-border/50 rounded-lg px-3 flex-row items-center justify-between"
                        >
                            <Text className="text-base text-foreground">
                                {format(selectedDate, "PPP")}
                            </Text>
                            <Icon as={Calendar} size={18} className="text-muted-foreground" />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                maximumDate={new Date()} // Can't be future
                            />
                        )}
                    </View>

                    {error && (
                        <View className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                        </View>
                    )}

                    <View className="flex-row gap-3 pt-2 mt-4">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl" onPress={() => onOpenChange(false)}>
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button className="flex-1 h-12 bg-primary rounded-xl shadow-none" onPress={handleSubmit} disabled={mutation.isPending}>
                            <Text className="text-primary-foreground font-bold">
                                {mutation.isPending ? "Saving..." : "Save Date"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
