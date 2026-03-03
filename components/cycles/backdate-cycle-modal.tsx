import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Rewind, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface BackdateCycleModalProps {
    cycle: {
        id: string;
        startDate: Date | string;
        endDate: Date | string;
    };
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function BackdateCycleModal({
    cycle,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
}: BackdateCycleModalProps) {
    const originalStart = new Date(cycle.startDate);
    const originalEnd = new Date(cycle.endDate);

    // Fixed cycle age in days — this never changes
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const cycleAgeDays = Math.round((originalEnd.getTime() - originalStart.getTime()) / MS_PER_DAY);

    const [days, setDays] = useState("");
    const [startDate, setStartDate] = useState(originalStart);
    const [endDate, setEndDate] = useState(originalEnd);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    // Track which control triggered the last update to avoid infinite loops
    const [updatingFrom, setUpdatingFrom] = useState<"days" | "start" | "end" | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setDays("");
            setStartDate(new Date(cycle.startDate));
            setEndDate(new Date(cycle.endDate));
            setUpdatingFrom(null);
        }
    }, [open, cycle.startDate, cycle.endDate]);

    // Sync: days input → start date shifts back, end date = start date + cycle age
    useEffect(() => {
        if (updatingFrom !== "days") return;
        const numDays = parseInt(days, 10);
        if (isNaN(numDays) || numDays < 0) {
            setStartDate(originalStart);
            setEndDate(originalEnd);
            return;
        }
        const newStart = new Date(originalStart);
        newStart.setDate(newStart.getDate() - numDays);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + cycleAgeDays);
        setStartDate(newStart);
        setEndDate(newEnd);
    }, [days, updatingFrom]);

    // Sync: start date picker → days input updates, end date = start date + cycle age
    useEffect(() => {
        if (updatingFrom !== "start") return;
        const diffMs = originalStart.getTime() - startDate.getTime();
        const diffDays = Math.round(diffMs / MS_PER_DAY);
        if (diffDays >= 0) {
            setDays(diffDays.toString());
            const newEnd = new Date(startDate);
            newEnd.setDate(newEnd.getDate() + cycleAgeDays);
            setEndDate(newEnd);
        }
    }, [startDate, updatingFrom]);

    // Sync: end date picker → start date = end date - cycle age, days input updates
    useEffect(() => {
        if (updatingFrom !== "end") return;
        const newStart = new Date(endDate);
        newStart.setDate(newStart.getDate() - cycleAgeDays);
        const diffMs = originalStart.getTime() - newStart.getTime();
        const diffDays = Math.round(diffMs / MS_PER_DAY);
        if (diffDays >= 0) {
            setDays(diffDays.toString());
            setStartDate(newStart);
        }
    }, [endDate, updatingFrom]);

    const mutation = trpc.officer.cycles.backdateCycle.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            toast.success("Cycle backdated successfully");
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const handleSubmit = () => {
        const numDays = parseInt(days, 10);
        if (isNaN(numDays) || numDays <= 0) {
            toast.error("Please enter a valid number of days");
            return;
        }
        if (numDays > 730) {
            toast.error("Maximum 730 days (2 years)");
            return;
        }
        mutation.mutate({
            historyId: cycle.id,
            days: numDays,
        });
    };

    const onStartDateChange = (_event: any, selectedDate?: Date) => {
        setShowStartPicker(Platform.OS === "ios");
        if (selectedDate) {
            setUpdatingFrom("start");
            setStartDate(selectedDate);
        }
    };

    const onEndDateChange = (_event: any, selectedDate?: Date) => {
        setShowEndPicker(Platform.OS === "ios");
        if (selectedDate) {
            setUpdatingFrom("end");
            setEndDate(selectedDate);
        }
    };

    const handleDaysChange = (text: string) => {
        setUpdatingFrom("days");
        setDays(text);
    };

    const numDays = parseInt(days, 10);
    const isValid = !isNaN(numDays) && numDays > 0 && numDays <= 730;

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
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                    <Icon as={Rewind} size={20} className="text-primary" />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-foreground">Backdate Cycle</Text>
                                    <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                                        {farmerName}
                                    </Text>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={18} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <View className="p-6 space-y-4">
                            {/* Days Input */}
                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Days to Backdate</Text>
                                <Input
                                    placeholder="e.g. 60"
                                    keyboardType="numeric"
                                    value={days}
                                    onChangeText={handleDaysChange}
                                    className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                />
                                <Text className="text-[10px] text-muted-foreground ml-1">
                                    All cycle dates (mortality, sales, etc.) will shift backward.
                                </Text>
                            </View>

                            {/* Start Date */}
                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Start Date</Text>
                                <Pressable
                                    onPress={() => setShowStartPicker(true)}
                                    className="h-12 bg-muted/30 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50"
                                >
                                    <Text className={`text-sm ${isValid ? 'text-primary font-bold' : 'text-foreground'}`}>
                                        {format(startDate, "dd MMM yyyy")}
                                    </Text>
                                    <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                                </Pressable>
                                {isValid && (
                                    <Text className="text-[10px] text-muted-foreground ml-1">
                                        was {format(originalStart, "dd MMM yyyy")}
                                    </Text>
                                )}
                            </View>

                            {showStartPicker && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display="default"
                                    onChange={onStartDateChange}
                                    maximumDate={originalStart}
                                />
                            )}

                            {/* End Date */}
                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">End Date</Text>
                                <Pressable
                                    onPress={() => setShowEndPicker(true)}
                                    className="h-12 bg-muted/30 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50"
                                >
                                    <Text className={`text-sm ${isValid ? 'text-primary font-bold' : 'text-foreground'}`}>
                                        {format(endDate, "dd MMM yyyy")}
                                    </Text>
                                    <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                                </Pressable>
                                {isValid && (
                                    <Text className="text-[10px] text-muted-foreground ml-1">
                                        was {format(originalEnd, "dd MMM yyyy")}
                                    </Text>
                                )}
                            </View>

                            {showEndPicker && (
                                <DateTimePicker
                                    value={endDate}
                                    mode="date"
                                    display="default"
                                    onChange={onEndDateChange}
                                    maximumDate={originalEnd}
                                />
                            )}

                            {/* Buttons */}
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
                                    disabled={mutation.isPending || !isValid}
                                >
                                    <Text className="text-primary-foreground font-bold">
                                        {mutation.isPending ? "Backdating..." : "Backdate"}
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
