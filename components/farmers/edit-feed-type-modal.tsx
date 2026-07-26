import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Plus, Tag, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { FeedTypeInput } from "./feed-type-input";

const SPLITTABLE_TYPES = ["STOCK_ADDED", "STOCK_DEDUCTED", "TRANSFER_IN", "TRANSFER_OUT"];

interface SplitRow {
    type: string;
    quantity: string;
}

interface EditFeedTypeModalProps {
    log: {
        id: string;
        feedType?: string | null;
        type?: string;
        amount?: string | number;
    } | null;
    orgId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditFeedTypeModal({ log, orgId, open, onOpenChange, onSuccess }: EditFeedTypeModalProps) {
    const [splits, setSplits] = useState<SplitRow[]>([{ type: "", quantity: "" }]);

    const originalTotal = Math.abs(Number(log?.amount ?? 0));
    const canSplit = !!log?.type && SPLITTABLE_TYPES.includes(log.type);

    useEffect(() => {
        if (open && log) {
            setSplits([{ type: log.feedType || "", quantity: String(Math.abs(Number(log.amount ?? 0))) }]);
        }
    }, [open, log]);

    const mutation = trpc.officer.stock.splitLogFeedType.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            toast.success("Feed type updated");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update feed type");
        },
    });

    if (!log) return null;

    const handleUpdateSplit = (index: number, field: 'type' | 'quantity', value: string) => {
        setSplits(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    };

    const handleAddRow = () => setSplits(prev => [...prev, { type: "", quantity: "" }]);

    const handleRemoveRow = (index: number) => {
        setSplits(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next.length ? next : [{ type: "", quantity: "" }];
        });
    };

    const splitTotal = splits.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const isMultiSplit = splits.length > 1;
    const totalMismatch = isMultiSplit && Math.abs(splitTotal - originalTotal) > 0.01;

    const handleSubmit = () => {
        if (totalMismatch) return;
        mutation.mutate({
            logId: log.id,
            splits: splits.map(s => ({ type: s.type.trim() || undefined, quantity: Number(s.quantity) || 0 })),
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Tag} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Edit Feed Type</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                {canSplit ? `Total: ${originalTotal} bags` : "Label which feed variety this entry involved"}
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                <View className="p-6 pt-2">
                    <View className="gap-3 mb-4">
                        {canSplit && (
                            <View className="flex-row gap-2 px-1">
                                <Text className="flex-1 text-xs text-muted-foreground uppercase font-bold tracking-widest">Type</Text>
                                <Text className="w-24 text-xs text-muted-foreground uppercase font-bold tracking-widest">Bags</Text>
                                <View className="w-8" />
                            </View>
                        )}

                        {splits.map((split, index) => (
                            <View key={index} className="flex-row gap-2 items-start">
                                <View className="flex-1">
                                    <FeedTypeInput
                                        value={split.type}
                                        onChangeText={(val) => handleUpdateSplit(index, 'type', val)}
                                        orgId={orgId}
                                        className="h-12 bg-muted/30 border-border/50"
                                    />
                                </View>
                                {canSplit && (
                                    <>
                                        <Input
                                            className="w-24 h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={split.quantity}
                                            onChangeText={(val) => handleUpdateSplit(index, 'quantity', val)}
                                        />
                                        {splits.length > 1 && (
                                            <Pressable
                                                onPress={() => handleRemoveRow(index)}
                                                className="w-8 h-12 items-center justify-center rounded-lg bg-destructive/10 active:bg-destructive/20"
                                            >
                                                <Icon as={Trash2} size={16} className="text-destructive" />
                                            </Pressable>
                                        )}
                                    </>
                                )}
                            </View>
                        ))}

                        {canSplit && (
                            <Pressable onPress={handleAddRow} className="flex-row items-center gap-1.5 self-start">
                                <Icon as={Plus} size={14} className="text-primary" />
                                <Text className="text-xs font-bold text-primary">Split Into Another Type</Text>
                            </Pressable>
                        )}

                        {totalMismatch && (
                            <Text className="text-xs font-bold text-destructive ml-1">
                                Split total ({splitTotal}) must equal {originalTotal} bags
                            </Text>
                        )}
                    </View>

                    <View className="flex-row gap-3">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl" onPress={() => onOpenChange(false)}>
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button className="flex-1 h-12 bg-primary rounded-xl shadow-none" onPress={handleSubmit} disabled={mutation.isPending || totalMismatch}>
                            <Text className="text-primary-foreground font-bold">
                                {mutation.isPending ? "Saving..." : "Save"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
