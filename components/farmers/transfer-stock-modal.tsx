import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, ChevronDown, Search, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
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

    const searchRef = useRef<TextInput>(null);
    const amountRef = useRef<TextInput>(null);
    const noteRef = useRef<TextInput>(null);

    const targetFarmerId = watch("targetFarmerId");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    // Fetch farmers for selection
    const farmersProcedure = isManagement ? trpc.management.farmers.getMany : trpc.officer.farmers.getMany;
    const { data: farmersData } = (farmersProcedure as any).useQuery({
        orgId: (membership?.orgId ?? "") as string,
        pageSize: 100, // Fetch more for searchable list
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

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                className="flex-1"
            >
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
                                <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                                    <Icon as={ArrowRightLeft} size={20} className="text-blue-500" />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-foreground">Transfer Stock</Text>
                                    <Text className="text-xs text-muted-foreground mt-0.5">
                                        From {sourceFarmerName}
                                    </Text>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={18} className="text-muted-foreground" />
                            </Button>
                        </View>

                        <View className="p-6 space-y-4">
                            {/* Target Farmer Searchable Dropdown */}
                            <View className="space-y-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Select Target Farmer</Text>

                                <TouchableOpacity
                                    onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex-row items-center justify-between h-12 px-4 bg-muted/30 border border-border/50 rounded-xl ${isDropdownOpen ? 'border-blue-500/50' : ''}`}
                                >
                                    <Text className={`text-sm ${selectedFarmer ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                        {selectedFarmer ? selectedFarmer.name : "Choose farmer..."}
                                    </Text>
                                    <Icon as={ChevronDown} size={18} className={`text-muted-foreground ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </TouchableOpacity>

                                {isDropdownOpen && (
                                    <View className="border border-border/50 rounded-2xl overflow-hidden mt-1 bg-muted/20 max-h-60">
                                        <View className="p-2 border-b border-border/10">
                                            <View className="relative">
                                                <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                                                    <Icon as={Search} size={14} className="text-muted-foreground" />
                                                </View>
                                                <Input
                                                    ref={searchRef}
                                                    placeholder="Search..."
                                                    value={searchTerm}
                                                    onChangeText={setSearchTerm}
                                                    className="pl-9 h-10 bg-card/50 border-0 text-sm"
                                                    autoFocus
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => amountRef.current?.focus()}
                                                />
                                            </View>
                                        </View>
                                        <ScrollView
                                            nestedScrollEnabled
                                            className="max-h-48"
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {availableFarmers.length > 0 ? (
                                                availableFarmers.map((farmer: any) => (
                                                    <TouchableOpacity
                                                        key={farmer.id}
                                                        onPress={() => {
                                                            setValue("targetFarmerId", farmer.id);
                                                            setIsDropdownOpen(false);
                                                            setSearchTerm("");
                                                        }}
                                                        className={`p-3 border-b border-border/50 flex-row items-center justify-between ${targetFarmerId === farmer.id ? "bg-blue-500/10" : "bg-transparent"}`}
                                                    >
                                                        <Text className={`font-medium text-sm ${targetFarmerId === farmer.id ? "text-blue-500" : "text-foreground"}`}>
                                                            {farmer.name}
                                                        </Text>
                                                        {targetFarmerId === farmer.id && (
                                                            <Icon as={ArrowRightLeft} size={14} className="text-blue-500" />
                                                        )}
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View className="p-4 items-center">
                                                    <Text className="text-xs text-muted-foreground italic">No farmers found</Text>
                                                </View>
                                            )}
                                        </ScrollView>
                                    </View>
                                )}

                                {errors.targetFarmerId && !isDropdownOpen && (
                                    <Text className="text-destructive text-xs ml-1 font-medium">{errors.targetFarmerId?.message as string}</Text>
                                )}
                            </View>

                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Amount (Bags)</Text>
                                <Controller
                                    control={control}
                                    name="amount"
                                    render={({ field: { onChange, value } }) => (
                                        <Input
                                            ref={amountRef}
                                            placeholder="0"
                                            value={value}
                                            onChangeText={onChange}
                                            keyboardType="numeric"
                                            className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                            returnKeyType="next"
                                            onSubmitEditing={() => noteRef.current?.focus()}
                                        />
                                    )}
                                />
                                {errors.amount && (
                                    <Text className="text-destructive text-xs ml-1 font-medium">{errors.amount?.message as string}</Text>
                                )}
                            </View>

                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Note (Optional)</Text>
                                <Controller
                                    control={control}
                                    name="note"
                                    render={({ field: { onChange, value } }) => (
                                        <Textarea
                                            ref={noteRef as any}
                                            placeholder="Reason for transfer..."
                                            placeholderTextColor={colorScheme === "dark" ? "#FFFFFF" : "#000000"}
                                            value={value}
                                            onChangeText={onChange}
                                            numberOfLines={2}
                                            className="bg-muted/30 border-border/50 text-sm h-20 text-foreground"
                                            onSubmitEditing={handleSubmit(onSubmit)}
                                        />
                                    )}
                                />
                            </View>

                            <View className="flex-row gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 h-12 rounded-xl border-border/50"
                                    onPress={() => onOpenChange(false)}
                                >
                                    <Text className="font-bold">Cancel</Text>
                                </Button>
                                <Button
                                    className="flex-1 h-12 bg-blue-600 rounded-xl shadow-none"
                                    onPress={handleSubmit(onSubmit)}
                                    disabled={mutation.isPending}
                                >
                                    <Text className="text-white font-bold">
                                        {mutation.isPending ? "Pending..." : "Transfer"}
                                    </Text>
                                </Button>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};
