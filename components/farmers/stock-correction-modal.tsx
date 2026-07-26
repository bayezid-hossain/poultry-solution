import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, PackageMinus, PackageX, X } from "lucide-react-native";
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

    const totalStock = typeOptions.reduce((s, t) => s + t.amount, 0);

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
        setError(null);
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

    const isOverLimit = !!selectedOption && !!amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > selectedOption.amount;
    const canSubmit = !mutation.isPending && !!selectedOption && !!amount && parseFloat(amount) > 0 && !isOverLimit;

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-6 pt-6 pb-4">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3 flex-1">
                            <View className="w-11 h-11 rounded-2xl bg-orange-500/10 items-center justify-center">
                                <Icon as={PackageMinus} size={20} className="text-orange-500" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xl font-black text-foreground">Fix Feed Stock</Text>
                                <Text className="text-xs font-medium text-muted-foreground mt-0.5" numberOfLines={1}>
                                    Remove misrecorded bags for {farmerName}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-muted/50 active:scale-90"
                        >
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    {!isBreakdownLoading && totalStock > 0 && (
                        <View className="flex-row items-center gap-2 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 self-start">
                            <Icon as={AlertCircle} size={14} className="text-amber-600" />
                            <Text className="text-xs font-bold text-amber-700">Total in stock: {totalStock.toFixed(1)} bags</Text>
                        </View>
                    )}
                </View>

                <View className="px-6 pb-6 gap-5">
                    {/* Section 1: Feed Type */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <View className="flex-row items-center gap-2">
                                <View className={`w-5 h-5 rounded-full items-center justify-center ${selectedOption ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                                    {selectedOption ? (
                                        <Icon as={CheckCircle2} size={12} className="text-white" />
                                    ) : (
                                        <Text className="text-[10px] font-black text-white">1</Text>
                                    )}
                                </View>
                                <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    {selectedOption ? "Feed Type" : "Choose a Feed Type to Remove From"}
                                </Text>
                            </View>
                            {typeOptions.length > 0 && !selectedOption && (
                                <Text className="text-[10px] font-black text-orange-500 uppercase">Tap One ↓</Text>
                            )}
                        </View>

                        {isBreakdownLoading ? (
                            <View className="py-10 items-center justify-center bg-card border-2 border-border/50 rounded-2xl">
                                <ActivityIndicator />
                            </View>
                        ) : typeOptions.length === 0 ? (
                            <View className="py-8 items-center gap-2 bg-muted/10 rounded-2xl border-2 border-dashed border-border/40">
                                <Icon as={PackageX} size={22} className="text-muted-foreground/60" />
                                <Text className="text-sm text-muted-foreground text-center px-4 font-medium">
                                    No stock available to remove.
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-2">
                                {typeOptions.map(t => {
                                    const isSelected = selectedType === t.key;
                                    const isUnspecified = t.key === UNSPECIFIED;
                                    return (
                                        <Pressable
                                            key={t.key}
                                            onPress={() => handleSelectType(t.key)}
                                            className={`flex-row items-center justify-between px-4 py-3.5 rounded-2xl border-2 ${isSelected
                                                ? 'bg-orange-500/10 border-orange-500'
                                                : 'bg-card border-border'
                                                }`}
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View className={`w-8 h-8 rounded-full items-center justify-center ${isSelected
                                                    ? 'bg-orange-500'
                                                    : isUnspecified ? 'bg-amber-500/15' : 'bg-muted/60'
                                                    }`}>
                                                    {isSelected ? (
                                                        <Icon as={CheckCircle2} size={16} className="text-white" />
                                                    ) : (
                                                        <Text className={`text-xs font-black ${isUnspecified ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                            {t.label.charAt(0).toUpperCase()}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text className={`text-sm font-bold ${isSelected ? 'text-orange-600' : isUnspecified ? 'text-amber-600' : 'text-foreground'}`}>
                                                    {t.label}
                                                </Text>
                                            </View>
                                            <Text className={`text-sm font-black ${isSelected ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                                {t.amount.toFixed(1)} bags
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Section 2: Amount */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <View className="flex-row items-center gap-2">
                                <View className={`w-5 h-5 rounded-full items-center justify-center ${selectedOption ? 'bg-orange-500' : 'bg-muted'}`}>
                                    <Text className={`text-[10px] font-black ${selectedOption ? 'text-white' : 'text-muted-foreground'}`}>2</Text>
                                </View>
                                <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bags to Remove</Text>
                            </View>
                            {selectedOption && (
                                <Text className={`text-[10px] font-black uppercase ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    Max: {selectedOption.amount.toFixed(1)}
                                </Text>
                            )}
                        </View>
                        {selectedOption ? (
                            <View className={`flex-row items-center bg-card border-2 rounded-2xl px-4 h-14 ${isOverLimit ? 'border-destructive' : 'border-border'}`}>
                                <Icon as={PackageMinus} size={18} className="text-muted-foreground mr-3" />
                                <TextInput
                                    ref={amountRef}
                                    placeholder="Enter amount..."
                                    placeholderTextColor="rgba(128,128,128,0.5)"
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={handleAmountChange}
                                    autoFocus
                                    className="flex-1 h-12 text-lg font-bold text-foreground"
                                    returnKeyType="next"
                                    onSubmitEditing={() => noteRef.current?.focus()}
                                />
                            </View>
                        ) : (
                            <View className="flex-row items-center gap-2 bg-muted/10 border-2 border-dashed border-border/40 rounded-2xl px-4 h-14">
                                <Icon as={AlertCircle} size={16} className="text-muted-foreground/60" />
                                <Text className="text-muted-foreground text-sm font-medium">
                                    {typeOptions.length > 0 ? "Select a feed type above first" : "No stock to remove"}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Section 3: Reason */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reason</Text>
                            <Text className="text-[10px] font-bold text-muted-foreground/50 uppercase">Optional</Text>
                        </View>
                        <View className="bg-card border-2 border-border rounded-2xl px-4 h-14 justify-center">
                            <TextInput
                                ref={noteRef}
                                placeholder="e.g. Spillage, weighing error..."
                                placeholderTextColor="rgba(128,128,128,0.5)"
                                value={note}
                                onChangeText={setNote}
                                className="text-sm font-medium text-foreground"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>
                    </View>

                    {error && (
                        <View className="bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                            <Text className="text-destructive text-xs text-center font-bold">{error}</Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View className="flex-row gap-3 pt-1">
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl border-2 border-border/50"
                            onPress={() => onOpenChange(false)}
                        >
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button
                            className="flex-1 h-14 bg-orange-500 rounded-2xl shadow-none"
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                        >
                            <Text className="text-white font-black text-base">
                                {mutation.isPending ? "Removing..." : "Remove Feed"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
