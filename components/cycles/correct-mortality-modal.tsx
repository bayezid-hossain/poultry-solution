import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Pencil, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface CorrectMortalityModalProps {
    cycleId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CorrectMortalityModal({
    cycleId,
    open,
    onOpenChange,
    onSuccess,
}: CorrectMortalityModalProps) {
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [editDate, setEditDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const { data: cycleData, isLoading, refetch: refetchDetails } = trpc.officer.cycles.getDetails.useQuery(
        { id: cycleId },
        { enabled: open }
    );

    const mortalityLogs = cycleData?.logs?.filter((l: any) => l.type === "MORTALITY") || [];
    const startDate = cycleData?.data?.startDate ? new Date(cycleData.data.startDate) : null;

    const updateMutation = trpc.officer.cycles.updateMortalityLog.useMutation({
        onSuccess: () => {
            toast.success("Log updated");
            setEditingLogId(null);
            refetchDetails();
            onSuccess?.();
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteMutation = trpc.officer.cycles.revertCycleLog.useMutation({
        onSuccess: () => {
            toast.success("Log reverted");
            refetchDetails();
            onSuccess?.();
        },
        onError: (err: any) => toast.error(err.message),
    });

    const handleEdit = (log: any) => {
        setEditingLogId(log.id);
        setEditAmount(log.valueChange.toString());
        setEditDate(new Date(log.createdAt));
    };

    const handleSave = () => {
        if (!editingLogId) return;
        const amount = parseInt(editAmount);

        if (editDate && startDate) {
            const d = new Date(editDate);
            d.setHours(0, 0, 0, 0);
            const s = new Date(startDate);
            s.setHours(0, 0, 0, 0);
            if (d < s) {
                toast.error("Date cannot be before cycle start");
                return;
            }
        }

        if (isNaN(amount) || amount < 0) {
            toast.error("Invalid amount");
            return;
        }

        updateMutation.mutate({
            logId: editingLogId,
            newAmount: amount,
            newDate: editDate,
            reason: "Modified via Mobile Modal",
        });
    };

    const handleDelete = (logId: string) => {
        deleteMutation.mutate({ logId });
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
                                <Text className="text-xl font-bold text-foreground">Mortality History</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Manage individual mortality records
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    <View className="p-6 pt-2">
                        {isLoading ? (
                            <View className="py-10 items-center">
                                <ActivityIndicator color="hsl(var(--primary))" />
                            </View>
                        ) : mortalityLogs.length === 0 ? (
                            <Text className="text-center text-muted-foreground py-10">No mortality logs found.</Text>
                        ) : (
                            <ScrollView className="max-h-80">
                                <View className="space-y-3 gap-y-3">
                                    {mortalityLogs.map((log: any) => {
                                        const isEditing = editingLogId === log.id;
                                        const isReverted = !!log.isReverted;

                                        return (
                                            <View
                                                key={log.id}
                                                className={cn(
                                                    "p-3 border border-border/50 rounded-2xl relative overflow-hidden",
                                                    isReverted ? "bg-muted/10 opacity-60" : "bg-muted/30"
                                                )}
                                            >
                                                {isReverted && (
                                                    <View className="absolute top-0 right-0 bg-muted px-2 py-0.5 rounded-bl-lg">
                                                        <Text className="text-[8px] font-bold text-muted-foreground uppercase">Reverted</Text>
                                                    </View>
                                                )}

                                                <View className="flex-row justify-between items-center mb-2">
                                                    <View>
                                                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Date Recorded</Text>
                                                        {isEditing ? (
                                                            <Pressable
                                                                onPress={() => setShowDatePicker(true)}
                                                                className="flex-row items-center gap-1 mt-1"
                                                            >
                                                                <Text className="text-sm font-bold text-primary underline">
                                                                    {format(editDate, "dd MMM yyyy")}
                                                                </Text>
                                                            </Pressable>
                                                        ) : (
                                                            <Text className={cn("text-sm font-bold text-foreground", isReverted && "line-through")}>
                                                                {format(new Date(log.createdAt), "dd MMM yyyy")}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View className="items-end">
                                                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                            {((log.valueChange ?? 0) < 0) ? "Adjustment" : "Birds"}
                                                        </Text>
                                                        {isEditing ? (
                                                            <Input
                                                                value={editAmount}
                                                                onChangeText={setEditAmount}
                                                                keyboardType="numeric"
                                                                className="h-8 w-16 bg-background text-center font-bold p-0"
                                                            />
                                                        ) : (
                                                            <Text className={cn(
                                                                "text-sm font-bold",
                                                                isReverted ? "text-muted-foreground line-through opacity-50" :
                                                                    ((log.valueChange ?? 0) < 0) ? "text-amber-600" : "text-destructive"
                                                            )}>
                                                                {log.valueChange}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>

                                                <View className="flex-row justify-end gap-2 pt-1 border-t border-border/20">
                                                    {isEditing ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg"
                                                                onPress={() => setEditingLogId(null)}
                                                            >
                                                                <Text className="text-xs font-bold text-muted-foreground">Cancel</Text>
                                                            </Button>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="h-8 px-4 rounded-lg bg-primary"
                                                                onPress={handleSave}
                                                                disabled={updateMutation.isPending}
                                                            >
                                                                <Text className="text-xs font-bold text-primary-foreground">
                                                                    {updateMutation.isPending ? "..." : "Save"}
                                                                </Text>
                                                            </Button>
                                                        </>
                                                    ) : (!isReverted && (log.valueChange || 0) > 0) ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg"
                                                                onPress={() => handleDelete(log.id)}
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                <Icon as={Trash2} size={14} className="text-destructive" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-3 rounded-lg border-border/50"
                                                                onPress={() => handleEdit(log)}
                                                            >
                                                                <Icon as={Pencil} size={12} className="mr-1 text-muted-foreground" />
                                                                <Text className="text-xs font-bold text-muted-foreground">Edit</Text>
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <View className="h-8 flex-row items-center">
                                                            <Text className="text-[10px] text-muted-foreground italic">
                                                                {isReverted ? "Log reverted" : "Correction entry"}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}

                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-xl mt-6 border-border/50"
                            onPress={() => onOpenChange(false)}
                        >
                            <Text className="font-bold">Close</Text>
                        </Button>
                    </View>
                </Pressable>
            </Pressable>

            {showDatePicker && (
                <DateTimePicker
                    value={editDate}
                    mode="date"
                    display="default"
                    onChange={(event: any, selectedDate?: Date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) setEditDate(selectedDate);
                    }}
                    maximumDate={new Date()}
                />
            )}
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
