import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { FeedTypeInput } from "./feed-type-input";

interface FeedDistributionModalProps {
    farmerId: string;
    orgId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface AllocationRow {
    type: string;
    quantity: string;
}

export function FeedDistributionModal({ farmerId, orgId, open, onOpenChange, onSuccess }: FeedDistributionModalProps) {
    const utils = trpc.useUtils();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const breakdownProcedure = isManagement ? trpc.management.stock.getStockBreakdown : trpc.officer.stock.getStockBreakdown;
    const { data: breakdown, isLoading } = (breakdownProcedure as any).useQuery(
        { farmerId, orgId },
        { enabled: open && !!farmerId }
    );

    const [allocations, setAllocations] = useState<AllocationRow[]>([{ type: "", quantity: "" }]);

    useEffect(() => {
        if (open) setAllocations([{ type: "", quantity: "" }]);
    }, [open]);

    const mutation = trpc.officer.stock.reassignUnspecifiedFeed.useMutation({
        onSuccess: () => {
            toast.success("Feed type reassigned");
            setAllocations([{ type: "", quantity: "" }]);
            utils.officer.stock.getStockBreakdown.invalidate({ farmerId });
            utils.management.stock.getStockBreakdown.invalidate({ farmerId });
            utils.officer.stock.getHistory.invalidate({ farmerId });
            utils.management.stock.getHistory.invalidate({ farmerId });
            onSuccess?.();
        },
        onError: (err: any) => toast.error(err.message || "Failed to reassign feed type"),
    });

    const reassignable = Number(breakdown?.reassignableUnspecified ?? 0);
    const allocatedTotal = allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
    const remaining = reassignable - allocatedTotal;
    const overAllocated = remaining < -0.01;
    const hasValidAllocation = allocations.some(a => a.type.trim() && (Number(a.quantity) || 0) > 0);

    const handleUpdateRow = (index: number, field: 'type' | 'quantity', value: string) => {
        setAllocations(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
    };

    const handleAddRow = () => setAllocations(prev => [...prev, { type: "", quantity: "" }]);

    const handleRemoveRow = (index: number) => {
        setAllocations(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next.length ? next : [{ type: "", quantity: "" }];
        });
    };

    const handleSave = () => {
        const validAllocations = allocations
            .filter(a => a.type.trim() && (Number(a.quantity) || 0) > 0)
            .map(a => ({ type: a.type.trim(), quantity: Number(a.quantity) }));

        if (validAllocations.length === 0 || overAllocated) return;
        mutation.mutate({ farmerId, allocations: validAllocations });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-1">
                        <Text className="text-xl font-bold text-foreground">Feed Type Breakdown</Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                            Move bags out of Unspecified into a real feed type
                        </Text>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                <View className="p-6 pt-2">
                    {isLoading ? (
                        <View className="py-16 items-center justify-center">
                            <ActivityIndicator />
                        </View>
                    ) : (
                        <>
                            {/* Current breakdown */}
                            <View className="flex-row flex-wrap gap-1.5 mb-5">
                                {(breakdown?.byType ?? []).map((t: any) => (
                                    <View key={t.feedType} className="bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border/40">
                                        <Text className="text-xs font-bold text-foreground">{t.feedType} · {t.amount.toFixed(1)}</Text>
                                    </View>
                                ))}
                                {breakdown?.unspecified !== 0 && (
                                    <View className="bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-400/40">
                                        <Text className="text-xs font-bold text-amber-600">Unspecified · {Number(breakdown?.unspecified ?? 0).toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>

                            {reassignable <= 0.01 ? (
                                <View className="py-8 items-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
                                    <Text className="text-sm text-muted-foreground text-center px-4">
                                        No unspecified restocked feed available to reassign.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                        Assign {reassignable.toFixed(1)} bags to
                                    </Text>

                                    <View className="gap-3">
                                        <View className="flex-row gap-2 px-1">
                                            <Text className="flex-1 text-xs text-muted-foreground uppercase font-bold tracking-widest">Type</Text>
                                            <Text className="w-24 text-xs text-muted-foreground uppercase font-bold tracking-widest">Bags</Text>
                                            <View className="w-8" />
                                        </View>

                                        {allocations.map((row, index) => (
                                            <View key={index} className="flex-row gap-2 items-center">
                                                <View className="flex-1">
                                                    <FeedTypeInput
                                                        value={row.type}
                                                        onChangeText={(val) => handleUpdateRow(index, 'type', val)}
                                                        orgId={orgId}
                                                        className="h-12 bg-muted/30 border-border/50"
                                                    />
                                                </View>
                                                <Input
                                                    className="w-24 h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                                    placeholder="0"
                                                    keyboardType="numeric"
                                                    value={row.quantity}
                                                    onChangeText={(val) => handleUpdateRow(index, 'quantity', val)}
                                                />
                                                {allocations.length > 1 && (
                                                    <Pressable
                                                        onPress={() => handleRemoveRow(index)}
                                                        className="w-8 h-12 items-center justify-center rounded-lg bg-destructive/10 active:bg-destructive/20"
                                                    >
                                                        <Icon as={Trash2} size={16} className="text-destructive" />
                                                    </Pressable>
                                                )}
                                            </View>
                                        ))}

                                        <Pressable onPress={handleAddRow} className="flex-row items-center gap-1.5 self-start">
                                            <Icon as={Plus} size={14} className="text-primary" />
                                            <Text className="text-xs font-bold text-primary">Add Another Type</Text>
                                        </Pressable>

                                        <Text className={`text-xs font-bold ml-1 ${overAllocated ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            {overAllocated
                                                ? `Over by ${Math.abs(remaining).toFixed(1)} bags`
                                                : `${remaining.toFixed(1)} of ${reassignable.toFixed(1)} bags left unspecified`}
                                        </Text>
                                    </View>

                                    <Button
                                        className="h-12 bg-primary rounded-xl shadow-none mt-5"
                                        onPress={handleSave}
                                        disabled={mutation.isPending || overAllocated || !hasValidAllocation}
                                    >
                                        <Text className="text-primary-foreground font-bold">
                                            {mutation.isPending ? "Saving..." : "Reassign"}
                                        </Text>
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
