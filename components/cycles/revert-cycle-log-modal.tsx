import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { RotateCcw, X } from "lucide-react-native";
import { View } from "react-native";

interface RevertCycleLogModalProps {
    log: {
        id: string;
        value: number;
        note?: string | null;
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function RevertCycleLogModal({
    log,
    open,
    onOpenChange,
    onSuccess,
}: RevertCycleLogModalProps) {
    const mutation = trpc.officer.cycles.revertCycleLog.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
    });

    if (!log) return null;

    const handleSubmit = () => {
        mutation.mutate({
            logId: log.id,
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <View className="p-6 pb-2 flex-row justify-between items-center">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-destructive/10 items-center justify-center">
                        <Icon as={RotateCcw} size={20} className="text-destructive" />
                    </View>
                    <View>
                        <Text className="text-xl font-bold text-foreground">Revert Entry</Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                            Undoes this mortality log
                        </Text>
                    </View>
                </View>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                    <Icon as={X} size={18} className="text-muted-foreground" />
                </Button>
            </View>

            <View className="p-6 pt-2">
                <View className="bg-muted/30 p-4 rounded-2xl border border-border/50 mb-6">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-xs font-bold text-muted-foreground uppercase">Dead Birds Recorded</Text>
                        <Text className="font-mono font-bold text-foreground">{log.value}</Text>
                    </View>
                    <Text className="text-xs text-muted-foreground italic" numberOfLines={2}>
                        {log.note || "No notes provided"}
                    </Text>
                </View>

                <Text className="text-sm text-muted-foreground text-center mb-6 leading-5">
                    This will create a negative mortality entry to neutralize this record, restoring the live bird count. This cannot be undone.
                </Text>

                <View className="flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl"
                        onPress={() => onOpenChange(false)}
                    >
                        <Text className="font-bold">Cancel</Text>
                    </Button>
                    <Button
                        variant="destructive"
                        className="flex-1 h-12 rounded-xl shadow-none"
                        onPress={handleSubmit}
                        disabled={mutation.isPending}
                    >
                        <Text className="text-destructive-foreground font-bold">
                            {mutation.isPending ? "Reverting..." : "Confirm Revert"}
                        </Text>
                    </Button>
                </View>
            </View>
        </BottomSheetModal>
    );
}
