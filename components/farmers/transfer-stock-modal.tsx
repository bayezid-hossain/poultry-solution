import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, ChevronDown, Package, Search, User, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";

const transferStockSchema = z.object({
    targetFarmerId: z.string().min(1, "Target farmer is required"),
    amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
    }),
    note: z.string().optional(),
});

type TransferStockFormValues = z.infer<typeof transferStockSchema>;

interface TransferStockModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceFarmerId: string;
    sourceFarmerName: string;
    availableStock: number;
    onSuccess?: () => void;
}

export const TransferStockModal = ({ open, onOpenChange, sourceFarmerId, sourceFarmerName, availableStock, onSuccess }: TransferStockModalProps) => {
    const utils = trpc.useUtils();
    const { colorScheme } = useColorScheme();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TransferStockFormValues>({
        resolver: zodResolver(transferStockSchema) as any,
        defaultValues: {
            targetFarmerId: "",
            amount: "",
            note: "",
        },
    });

    const amountRef = useRef<TextInput>(null);
    const noteRef = useRef<TextInput>(null);

    const targetFarmerId = watch("targetFarmerId");
    const amountValue = watch("amount");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    // Fetch farmers for selection
    const farmersProcedure = isManagement ? trpc.management.farmers.getMany : trpc.officer.farmers.getMany;
    const { data: farmersData, isLoading: isLoadingFarmers } = (farmersProcedure as any).useQuery({
        orgId: (membership?.orgId ?? "") as string,
        pageSize: 100,
        sortBy: "name",
        sortOrder: "asc"
    }, {
        enabled: open && !!membership?.orgId
    });

    // Filter and Memoize available farmers
    const availableFarmers = useMemo(() => {
        const base = farmersData?.items?.filter((f: any) => f.id !== sourceFarmerId) || [];
        if (!searchTerm) return base;
        return base.filter((f: any) =>
            f.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [farmersData?.items, sourceFarmerId, searchTerm]);

    const selectedFarmer = useMemo(() => {
        return farmersData?.items?.find((f: any) => f.id === targetFarmerId);
    }, [farmersData?.items, targetFarmerId]);

    const transferMutation = isManagement ? trpc.management.stock.transferStock : trpc.officer.stock.transferStock;
    const mutation = (transferMutation as any).useMutation({
        onSuccess: async () => {
            toast.success("Stock transferred successfully");
            utils.officer.farmers.getDetails.invalidate({ farmerId: sourceFarmerId });
            utils.officer.stock.getHistory.invalidate({ farmerId: sourceFarmerId });
            utils.management.farmers.getDetails.invalidate({ farmerId: sourceFarmerId });
            utils.management.stock.getHistory.invalidate({ farmerId: sourceFarmerId });
            reset();
            setSearchTerm("");
            setIsDropdownOpen(false);
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to transfer stock");
        },
    });

    const onSubmit = (data: TransferStockFormValues) => {
        const amountNum = parseFloat(data.amount);
        if (amountNum > availableStock) {
            toast.error(`Cannot transfer more than available stock (${availableStock.toFixed(2)} bags)`);
            return;
        }

        mutation.mutate({
            sourceFarmerId,
            targetFarmerId: data.targetFarmerId,
            amount: parseFloat(data.amount),
            note: data.note,
            orgId: isManagement ? membership?.orgId : undefined
        });
    };

    const isOverLimit = amountValue && !isNaN(parseFloat(amountValue)) && parseFloat(amountValue) > availableStock;

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="px-6 pt-6 pb-4">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-2xl font-black text-foreground">Transfer Stock</Text>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-9 w-9 items-center justify-center rounded-full bg-muted/50 active:scale-90"
                        >
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    {/* From → To indicator */}
                    <View className="flex-row items-center gap-2 mt-3">
                        <View className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 flex-row items-center gap-2 flex-1">
                            <Icon as={User} size={14} className="text-blue-500" />
                            <Text className="text-xs font-bold text-blue-600 flex-1" numberOfLines={1}>{sourceFarmerName}</Text>
                        </View>
                        <Icon as={ArrowRight} size={16} className="text-muted-foreground" />
                        <View className={`border rounded-xl px-3 py-2 flex-row items-center gap-2 flex-1 ${selectedFarmer ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-muted/20 border-border/50'}`}>
                            <Icon as={User} size={14} className={selectedFarmer ? "text-emerald-500" : "text-muted-foreground"} />
                            <Text className={`text-xs font-bold flex-1 ${selectedFarmer ? 'text-emerald-600' : 'text-muted-foreground'}`} numberOfLines={1}>
                                {selectedFarmer ? selectedFarmer.name : "Select..."}
                            </Text>
                        </View>
                    </View>

                    {/* Available stock badge */}
                    <View className="flex-row items-center gap-2 mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        <Icon as={Package} size={14} className="text-amber-600" />
                        <Text className="text-xs font-bold text-amber-700">Available: {availableStock} bags</Text>
                    </View>
                </View>

                <View className="px-6 pb-6 gap-5">
                    {/* Section 1: Target Farmer */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Transfer To</Text>
                            <Text className="text-[10px] font-black text-destructive uppercase">Required *</Text>
                        </View>

                        <Pressable
                            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex-row items-center justify-between h-14 px-4 bg-card border-2 rounded-2xl ${errors.targetFarmerId ? 'border-destructive' : isDropdownOpen ? 'border-blue-500' : selectedFarmer ? 'border-emerald-500/50' : 'border-border'}`}
                        >
                            <View className="flex-row items-center gap-3 flex-1">
                                {selectedFarmer ? (
                                    <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center">
                                        <Icon as={CheckCircle2} size={16} className="text-emerald-500" />
                                    </View>
                                ) : (
                                    <View className="w-8 h-8 rounded-full bg-muted/50 items-center justify-center">
                                        <Icon as={User} size={16} className="text-muted-foreground" />
                                    </View>
                                )}
                                <Text className={`text-base flex-1 ${selectedFarmer ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`} numberOfLines={1}>
                                    {selectedFarmer ? selectedFarmer.name : "Choose target farmer..."}
                                </Text>
                            </View>
                            <Icon as={ChevronDown} size={20} className={`text-muted-foreground ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </Pressable>

                        {isDropdownOpen && (
                            <View className="border-2 border-blue-500/30 rounded-2xl overflow-hidden mt-2 bg-card">
                                {/* Search */}
                                <View className="p-3 border-b border-border/30 bg-muted/10">
                                    <View className="flex-row items-center bg-background border border-border rounded-xl px-3 h-11">
                                        <Icon as={Search} size={16} className="text-muted-foreground mr-2" />
                                        <Input
                                            placeholder="Search farmers..."
                                            value={searchTerm}
                                            onChangeText={setSearchTerm}
                                            className="flex-1 h-10 border-0 bg-transparent text-sm p-0"
                                            autoFocus
                                            returnKeyType="next"
                                            onSubmitEditing={() => amountRef.current?.focus()}
                                        />
                                    </View>
                                </View>
                                {/* Farmer list */}
                                <ScrollView
                                    nestedScrollEnabled
                                    style={{ maxHeight: 200 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {availableFarmers.length > 0 ? (
                                        availableFarmers.map((farmer: any) => {
                                            const isSelected = targetFarmerId === farmer.id;
                                            return (
                                                <Pressable
                                                    key={farmer.id}
                                                    onPress={() => {
                                                        setValue("targetFarmerId", farmer.id);
                                                        setIsDropdownOpen(false);
                                                        setSearchTerm("");
                                                    }}
                                                    className={`px-4 py-3.5 border-b border-border/20 flex-row items-center justify-between active:bg-muted/30 ${isSelected ? "bg-blue-500/5" : ""}`}
                                                >
                                                    <View className="flex-row items-center gap-3 flex-1">
                                                        <View className={`w-7 h-7 rounded-full items-center justify-center ${isSelected ? 'bg-blue-500' : 'bg-muted/50'}`}>
                                                            <Text className={`text-xs font-black ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                                                                {farmer.name?.charAt(0)?.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className={`font-bold text-sm ${isSelected ? "text-blue-600" : "text-foreground"}`} numberOfLines={1}>
                                                                {farmer.name}
                                                            </Text>
                                                            {farmer.location && (
                                                                <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>{farmer.location}</Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                    {isSelected && (
                                                        <Icon as={CheckCircle2} size={18} className="text-blue-500" />
                                                    )}
                                                </Pressable>
                                            );
                                        })
                                    ) : (
                                        <View className="p-6 items-center">
                                            <Text className="text-xs text-muted-foreground italic">{isLoadingFarmers ? "Loading farmers..." : "No farmers found"}</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        )}

                        {errors.targetFarmerId && !isDropdownOpen && (
                            <Text className="text-destructive text-xs ml-1 mt-1.5 font-medium">{errors.targetFarmerId?.message as string}</Text>
                        )}
                    </View>

                    {/* Section 2: Amount */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount (Bags)</Text>
                            <Text className={`text-[10px] font-black uppercase ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                                Max: {availableStock}
                            </Text>
                        </View>
                        <Controller
                            control={control}
                            name="amount"
                            render={({ field: { onChange, value } }) => (
                                <View className={`flex-row items-center bg-card border-2 rounded-2xl px-4 h-14 ${errors.amount || isOverLimit ? 'border-destructive' : 'border-border'}`}>
                                    <Icon as={Package} size={18} className="text-muted-foreground mr-3" />
                                    <Input
                                        ref={amountRef}
                                        placeholder="Enter amount..."
                                        value={value}
                                        onChangeText={onChange}
                                        keyboardType="numeric"
                                        className="flex-1 h-12 border-0 bg-transparent text-lg font-bold p-0"
                                        returnKeyType="next"
                                        onSubmitEditing={() => noteRef.current?.focus()}
                                    />
                                </View>
                            )}
                        />
                        {errors.amount && (
                            <Text className="text-destructive text-xs ml-1 mt-1.5 font-medium">{errors.amount?.message as string}</Text>
                        )}
                        {!errors.amount && isOverLimit && (
                            <Text className="text-destructive text-xs ml-1 mt-1.5 font-medium">Cannot exceed available stock ({availableStock} bags)</Text>
                        )}
                    </View>

                    {/* Section 3: Note */}
                    <View>
                        <View className="flex-row items-center justify-between mb-2 ml-1">
                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Note</Text>
                            <Text className="text-[10px] font-bold text-muted-foreground/50 uppercase">Optional</Text>
                        </View>
                        <Controller
                            control={control}
                            name="note"
                            render={({ field: { onChange, value } }) => (
                                <Textarea
                                    ref={noteRef as any}
                                    placeholder="Reason for transfer..."
                                    placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
                                    value={value}
                                    onChangeText={onChange}
                                    numberOfLines={2}
                                    className="bg-card border-2 border-border rounded-2xl text-sm h-20 text-foreground px-4"
                                    onSubmitEditing={handleSubmit(onSubmit)}
                                />
                            )}
                        />
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-3 pt-1 pb-4">
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl border-2 border-border/50"
                            onPress={() => onOpenChange(false)}
                        >
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button
                            className="flex-1 h-14 bg-blue-600 rounded-2xl shadow-none"
                            onPress={handleSubmit(onSubmit)}
                            disabled={mutation.isPending || !!isOverLimit}
                        >
                            <Text className="text-white font-black text-base">
                                {mutation.isPending ? "Transferring..." : "Transfer"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
};
