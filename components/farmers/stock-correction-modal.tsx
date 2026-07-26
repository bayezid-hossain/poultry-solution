import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Check, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";

interface StockCorrectionModalProps {
    farmerId: string;
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const UNSPECIFIED = "__UNSPECIFIED__";

export function StockCorrectionModal({
    farmerId,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
}: StockCorrectionModalProps) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const amountRef = useRef<TextInput>(null);
    const noteRef = useRef<TextInput>(null);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const breakdownProcedure = isManagement ? trpc.management.stock.getStockBreakdown : trpc.officer.stock.getStockBreakdown;
    const { data: breakdown, isLoading: isBreakdownLoading } = (breakdownProcedure as any).useQuery(
        { farmerId, orgId: membership?.orgId },
        { enabled: open && !!farmerId }
    );

    const typeOptions = [
        ...((breakdown?.byType ?? []) as { feedType: string; amount: number }[])
            .filter(t => t.amount > 0.001)
            .map(t => ({ key: t.feedType, label: t.feedType, amount: t.amount })),
        ...(Number(breakdown?.unspecified ?? 0) > 0.001
            ? [{ key: UNSPECIFIED, label: "Unspecified", amount: Number(breakdown!.unspecified) }]
            : []),
    ];

    useEffect(() => {
        if (open) {
            setAmount("");
            setNote("");
            setSelectedType(null);
            setError(null);
        }
    }, [open]);

    useEffect(() => {
        // Auto-pick when there's only one type to remove from
        if (open && !selectedType && typeOptions.length === 1) {
            setSelectedType(typeOptions[0].key);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, selectedType, typeOptions.length]);

    const selectedOption = typeOptions.find(t => t.key === selectedType);
    const maxAmount = selectedOption?.amount ?? 0;

    const handleAmountChange = (val: string) => {
        if (!/^\d*\.?\d*$/.test(val)) return;
        const num = parseFloat(val);
        if (!isNaN(num) && selectedOption && num > maxAmount) {
            setAmount(String(maxAmount));
            return;
        }
        setAmount(val);
    };

    const handleSelectType = (key: string) => {
        setSelectedType(key);
        const option = typeOptions.find(t => t.key === key);
        const num = parseFloat(amount);
        if (option && !isNaN(num) && num > option.amount) {
            setAmount(String(option.amount));
        }
    };

    const deductStockProcedure = isManagement ? trpc.management.stock.deductStock : trpc.officer.stock.deductStock;
    const mutation = (deductStockProcedure as any).useMutation({
        onSuccess: () => {
            onOpenChange(false);
            setAmount("");
            setNote("");
            setSelectedType(null);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (!selectedOption) {
            setError("Please select a feed type to remove from");
            return;
        }
        if (numAmount > selectedOption.amount) {
            setError(`Cannot exceed available stock (${selectedOption.amount.toFixed(2)} bags)`);
            return;
        }
        setError(null);
        mutation.mutate({
            farmerId,
            amount: numAmount,
            note: note || "Manual Correction",
            feedType: selectedType === UNSPECIFIED ? undefined : selectedType || undefined,
            orgId: isManagement ? membership?.orgId : undefined
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                {/* Header */}
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-orange-500/10 items-center justify-center">
                            <Icon as={AlertCircle} size={20} className="text-orange-500" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Stock Correction</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                Deduct bags for {farmerName}
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                {/* Form */}
                <View className="p-6 space-y-4">
                    <View className="gap-2">
                        <Text className="text-sm font-bold text-foreground ml-1">Remove From</Text>
                        {isBreakdownLoading ? (
                            <View className="py-6 items-center justify-center">
                                <ActivityIndicator />
                            </View>
                        ) : typeOptions.length === 0 ? (
                            <View className="py-6 items-center bg-muted/10 rounded-2xl border border-dashed border-border/40">
                                <Text className="text-sm text-muted-foreground text-center px-4">
                                    No stock available to remove.
                                </Text>
                            </View>
                        ) : (
                            <View className="flex-row flex-wrap gap-2">
                                {typeOptions.map(t => {
                                    const isSelected = selectedType === t.key;
                                    return (
                                        <Pressable
                                            key={t.key}
                                            onPress={() => handleSelectType(t.key)}
                                            className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${isSelected
                                                ? 'bg-orange-500/15 border-orange-500'
                                                : t.key === UNSPECIFIED
                                                    ? 'bg-amber-500/10 border-amber-400/40'
                                                    : 'bg-muted/50 border-border/40'
                                                }`}
                                        >
                                            {isSelected && <Icon as={Check} size={12} className="text-orange-600" />}
                                            <Text className={`text-xs font-bold ${isSelected ? 'text-orange-600' : t.key === UNSPECIFIED ? 'text-amber-600' : 'text-foreground'}`}>
                                                {t.label} · {t.amount.toFixed(1)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    <View className="gap-2">
                        <View className="flex-row items-center justify-between ml-1">
                            <Text className="text-sm font-bold text-foreground">Bags to Remove</Text>
                            {selectedOption && (
                                <Text className="text-[10px] font-black text-muted-foreground uppercase">Max: {selectedOption.amount.toFixed(1)}</Text>
                            )}
                        </View>
                        <Input
                            ref={amountRef}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={handleAmountChange}
                            editable={!!selectedOption}
                            className={`h-12 bg-muted/30 border-border/50 text-lg font-mono ${!selectedOption ? 'opacity-50' : ''}`}
                            returnKeyType="next"
                            onSubmitEditing={() => noteRef.current?.focus()}
                        />
                    </View>

                    <View className="gap-2">
                        <Text className="text-sm font-bold text-foreground ml-1">Reason (Optional)</Text>
                        <Input
                            ref={noteRef}
                            placeholder="e.g. Spillage, error..."
                            value={note}
                            onChangeText={setNote}
                            className="h-12 bg-muted/30 border-border/50"
                            returnKeyType="next"
                            onSubmitEditing={handleSubmit}
                        />
                    </View>

                    {error && (
                        <View className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                            <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                        </View>
                    )}

                    <View className="flex-row gap-3 pt-2">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl" onPress={() => onOpenChange(false)}>
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button
                            className="flex-1 h-12 bg-orange-500 rounded-xl shadow-none"
                            onPress={handleSubmit}
                            disabled={mutation.isPending || !selectedOption || !amount || parseFloat(amount) <= 0}
                        >
                            <Text className="text-white font-bold">
                                {mutation.isPending ? "Correcting..." : "Correct"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
