import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Calendar as CalendarIcon, CheckCircle2, Copy, MapPin, Plus, Search, ShoppingBag, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { AppModal } from "../ui/app-modal";

interface CreateSaleOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}

interface SaleBatch {
    id: string; // temp id
    totalWeight: string;
    totalDoc: string;
    avgWeight: string;
    age: string;
}

interface SaleItem {
    id: string; // temp id
    farmerId: string;
    farmerName: string;
    location?: string | null;
    mobile?: string | null;
    batches: SaleBatch[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function CreateSaleOrderModal({ open, onOpenChange, orgId, onSuccess }: CreateSaleOrderModalProps) {
    const insets = useSafeAreaInsets();

    const [orderDate, setOrderDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [branchName, setBranchName] = useState("");
    const [items, setItems] = useState<SaleItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setOrderDate(new Date());
            setBranchName("");
            setItems([]);
        }
    }, [open]);

    const { data: searchResults, isFetching: isSearching } = trpc.officer.farmers.listWithStock.useQuery(
        { orgId, page: 1, pageSize: 20, search: searchQuery },
        { enabled: isSearchOpen }
    );

    const createMutation = trpc.officer.saleOrders.create.useMutation({
        onSuccess: () => {
            const text = generateCopyText();
            Clipboard.setStringAsync(text);
            toast.success("Sale Order Created & Copied to Clipboard!");
            setItems([]);
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const isSubmitting = createMutation.isPending;

    const generateCopyText = () => {
        const dateStr = format(orderDate, "dd.MM.yy");
        let text = `Date:  ${dateStr}\n`;
        text += `Broiler Sale Plan for ${branchName || "___"} Branch\n\n`;

        let farmCounter = 1;
        let grandTotalWeight = 0;
        let grandTotalDoc = 0;

        items.forEach(item => {
            item.batches.forEach(batch => {
                const weight = Number(batch.totalWeight) || 0;
                const doc = Number(batch.totalDoc) || 0;
                if (doc <= 0 && weight <= 0) return;

                text += `${farmCounter}. ${item.farmerName} \n`;
                if (item.location) text += `Location: ${item.location} \n`;
                text += `Total: ${weight} kg.\n`;
                text += `Total: ${doc} PCs \n`;
                if (batch.avgWeight) text += `Avg: ${batch.avgWeight} (+-) kg \n`;
                if (Number(batch.age) > 0) text += `Age: ${batch.age} days\n`;
                if (item.mobile) {
                    let formattedMobile = item.mobile;
                    if (formattedMobile.startsWith("0")) {
                        formattedMobile = "+880 " + formattedMobile.substring(1);
                    }
                    text += `Mobile:  ${formattedMobile}\n`;
                }
                text += `\n`;

                grandTotalWeight += weight;
                grandTotalDoc += doc;
                farmCounter++;
            });
        });

        text += `\nTotal: ${grandTotalWeight} kg  \n`;
        text += `Total Kg : ${grandTotalDoc} PCs \n`;
        text += `\nThanks`;

        return text;
    };

    const handleToggleFarmer = (farmer: any) => {
        if (items.some(i => i.farmerId === farmer.id)) {
            setItems(prev => prev.filter(i => i.farmerId !== farmer.id));
            return;
        }
        setItems(prev => [
            ...prev,
            {
                id: generateId(),
                farmerId: farmer.id,
                farmerName: farmer.name,
                location: farmer.location,
                mobile: farmer.mobile,
                batches: [{
                    id: generateId(),
                    totalWeight: "",
                    totalDoc: "",
                    avgWeight: "",
                    age: "",
                }]
            }
        ]);
    };

    const handleUpdateBatch = (itemId: string, batchId: string, field: keyof SaleBatch, value: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;

            return {
                ...item,
                batches: item.batches.map(batch => {
                    if (batch.id !== batchId) return batch;

                    const updated = { ...batch, [field]: value };

                    // Clean numeric values for calculations
                    const doc = Number(updated.totalDoc) || 0;
                    const weight = Number(updated.totalWeight) || 0;
                    const avg = Number(updated.avgWeight) || 0;

                    if (field === 'avgWeight') {
                        if (doc > 0 && value !== '') {
                            updated.totalWeight = (Number(value) * doc).toFixed(2).replace(/\.00$/, '');
                        }
                    } else if (field === 'totalWeight') {
                        if (doc > 0 && value !== '') {
                            updated.avgWeight = (Number(value) / doc).toFixed(3).replace(/\.?0+$/, '');
                        }
                    } else if (field === 'totalDoc') {
                        if (value !== '') {
                            // Always prioritize calculating totalWeight based on avgWeight when DOC changes
                            if (updated.avgWeight !== '') {
                                updated.totalWeight = (avg * Number(value)).toFixed(2).replace(/\.00$/, '');
                            } else if (updated.totalWeight !== '') {
                                updated.avgWeight = (weight / Number(value)).toFixed(3).replace(/\.?0+$/, '');
                            }
                        }
                    }

                    return updated;
                })
            };
        }));
    };

    const handleAddBatch = (itemId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                batches: [
                    ...item.batches,
                    {
                        id: generateId(),
                        totalWeight: "",
                        totalDoc: "",
                        avgWeight: "",
                        age: "",
                    }
                ]
            };
        }));
    };

    const handleRemoveBatch = (itemId: string, batchId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                batches: item.batches.filter(b => b.id !== batchId)
            };
        }));
    };

    const handleSubmit = () => {
        if (!branchName.trim()) {
            toast.error("Please enter a Branch Name.");
            return;
        }

        if (items.length === 0) {
            toast.error("Please add at least one farmer.");
            return;
        }

        // Validate that EVERY field in EVERY batch is filled
        for (const item of items) {
            if (item.batches.length === 0) {
                toast.error(`Please add at least one sale batch for ${item.farmerName}.`);
                return;
            }
            for (const batch of item.batches) {
                const doc = Number(batch.totalDoc) || 0;
                const weight = Number(batch.totalWeight) || 0;
                const avg = Number(batch.avgWeight) || 0;
                const age = Number(batch.age) || 0;

                if (doc <= 0 || weight <= 0 || avg <= 0 || age <= 0) {
                    toast.error(`All fields (Avg Weight, DOC, Total Weight, Age) are required for ${item.farmerName}.`);
                    return;
                }
            }
        }

        const validItems = items.flatMap(item =>
            item.batches.map(batch => ({
                farmerId: item.farmerId,
                totalWeight: Number(batch.totalWeight),
                totalDoc: Number(batch.totalDoc),
                avgWeight: Number(batch.avgWeight),
                age: Number(batch.age),
            }))
        );

        createMutation.mutate({
            orgId,
            orderDate,
            branchName: branchName.trim(),
            items: validItems
        });
    };

    // Search screen
    if (isSearchOpen) {
        return (
            <AppModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setIsSearchOpen(false)}>

                <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
                    <View className="px-4 py-4 border-b border-border/50 flex-row gap-2 items-center">
                        <View className="flex-1 relative justify-center">
                            <View className="absolute left-3 z-10 w-5 h-5 justify-center items-center">
                                <Icon as={Search} size={18} className="text-muted-foreground" />
                            </View>
                            <Input
                                placeholder="Search farmers..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                className="pl-10 h-10"
                            />
                        </View>
                        <Pressable onPress={() => setIsSearchOpen(false)}>
                            <Text className="text-primary font-bold">Done</Text>
                        </Pressable>
                    </View>

                    {isSearching && !searchResults ? (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-muted-foreground">Searching...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={searchResults?.items || []}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = items.some(i => i.farmerId === item.id);
                                return (
                                    <Pressable
                                        onPress={() => handleToggleFarmer(item)}
                                        className="p-4 border-b border-border/50 flex-row justify-between items-center active:bg-accent"
                                    >
                                        <View>
                                            <Text className="font-bold text-base">{item.name}</Text>
                                            {item.location && <Text className="text-xs text-muted-foreground">{item.location}</Text>}
                                        </View>
                                        <View className={`w-6 h-6 rounded-full border ${isSelected ? 'bg-primary border-primary items-center justify-center' : 'border-muted-foreground'}`}>
                                            {isSelected && <Icon as={CheckCircle2} size={16} className="text-white" />}
                                        </View>
                                    </Pressable>
                                );
                            }}
                            ListEmptyComponent={
                                <View className="p-8 items-center">
                                    <Text className="text-muted-foreground">No farmers found.</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </AppModal>
        );
    }

    return (
        <AppModal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => !isSubmitting && onOpenChange(false)}>

            <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
                {/* Header */}
                <View className="px-4 py-4 border-b border-border/50 flex-row justify-between items-center bg-card">
                    <View className="flex-row items-center gap-2">
                        <View className="bg-primary/20 w-8 h-8 rounded-full items-center justify-center">
                            <Icon as={ShoppingBag} size={16} className="text-primary" />
                        </View>
                        <Text className="text-lg font-bold text-foreground">New Sale Order</Text>
                    </View>
                    <Pressable onPress={() => onOpenChange(false)} disabled={isSubmitting}>
                        <Text className="text-primary font-bold">Cancel</Text>
                    </Pressable>
                </View>

                {/* Content */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

                        {/* Date & Branch */}
                        <View className="flex-row gap-4">
                            <View className="flex-1 gap-2">
                                <Text className="text-sm font-semibold">Order Date</Text>
                                <Pressable
                                    onPress={() => setShowDatePicker(true)}
                                    className="h-12 bg-muted/50 rounded-lg flex-row items-center px-4 border border-border/50"
                                >
                                    <Icon as={CalendarIcon} size={18} className="text-muted-foreground mr-2" />
                                    <Text>{format(orderDate, "MMM dd, yyyy")}</Text>
                                </Pressable>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={orderDate}
                                        mode="date"
                                        display="default"
                                        onChange={(event: any, date?: Date) => {
                                            setShowDatePicker(false);
                                            if (date) setOrderDate(date);
                                        }}
                                    />
                                )}
                            </View>
                            <View className="flex-1 gap-2">
                                <Text className="text-sm font-semibold">Branch Name</Text>
                                <View className="h-12 bg-muted/50 rounded-lg flex-row items-center px-4 border border-border/50">
                                    <Icon as={MapPin} size={18} className="text-muted-foreground mr-2" />
                                    <Input
                                        className="flex-1 h-full border-0 bg-transparent px-0"
                                        placeholder="Branch name"
                                        value={branchName}
                                        onChangeText={setBranchName}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Farmers List */}
                        <View className="gap-4">
                            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selected Farmers</Text>

                            {items.length === 0 ? (
                                <View className="bg-muted/30 p-8 rounded-2xl items-center border border-dashed border-border/50">
                                    <Text className="text-muted-foreground mb-4 text-center">No farmers selected yet.</Text>
                                    <Button variant="outline" onPress={() => setIsSearchOpen(true)}>
                                        <Icon as={Plus} size={16} className="mr-2" />
                                        <Text>Add Farmers</Text>
                                    </Button>
                                </View>
                            ) : (
                                <View className="gap-6">
                                    {items.map((item) => (
                                        <View key={item.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden p-4">
                                            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-border/50">
                                                <Text className="font-bold text-lg text-primary">{item.farmerName}</Text>
                                                <Pressable onPress={() => handleToggleFarmer({ id: item.farmerId })} className="p-2">
                                                    <Icon as={Trash2} size={18} className="text-destructive" />
                                                </Pressable>
                                            </View>

                                            <View className="gap-4">
                                                {item.batches.map((batch, index) => (
                                                    <View key={batch.id} className="relative z-0 border border-border/50 rounded-lg p-3 bg-muted/10">
                                                        {item.batches.length > 1 && (
                                                            <View className="flex-row justify-between items-center mb-3">
                                                                <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sale {index + 1}</Text>
                                                                <Pressable onPress={() => handleRemoveBatch(item.id, batch.id)} className="p-1">
                                                                    <Icon as={Trash2} size={14} className="text-destructive/80" />
                                                                </Pressable>
                                                            </View>
                                                        )}
                                                        <View className="gap-3">
                                                            <View className="flex-row gap-3">
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">Avg Weight (kg)</Text>
                                                                    <Input
                                                                        className="h-12 bg-background"
                                                                        placeholder="e.g 1.8"
                                                                        keyboardType="numeric"
                                                                        value={batch.avgWeight}
                                                                        onChangeText={(val) => handleUpdateBatch(item.id, batch.id, 'avgWeight', val)}
                                                                    />
                                                                </View>
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">DOC (PCs)</Text>
                                                                    <Input
                                                                        className="h-12 bg-background"
                                                                        placeholder="0"
                                                                        keyboardType="numeric"
                                                                        value={batch.totalDoc}
                                                                        onChangeText={(val) => handleUpdateBatch(item.id, batch.id, 'totalDoc', val)}
                                                                    />
                                                                </View>
                                                            </View>
                                                            <View className="flex-row gap-3">
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">Total Wt. (kg)</Text>
                                                                    <Input
                                                                        className="h-12 bg-background"
                                                                        placeholder="0"
                                                                        keyboardType="numeric"
                                                                        value={batch.totalWeight}
                                                                        onChangeText={(val) => handleUpdateBatch(item.id, batch.id, 'totalWeight', val)}
                                                                    />
                                                                </View>
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">Age (days)</Text>
                                                                    <Input
                                                                        className="h-12 bg-background"
                                                                        placeholder="0"
                                                                        keyboardType="numeric"
                                                                        value={batch.age}
                                                                        onChangeText={(val) => handleUpdateBatch(item.id, batch.id, 'age', val)}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}

                                                <Button variant="outline" className="h-10 border-dashed" onPress={() => handleAddBatch(item.id)}>
                                                    <Icon as={Plus} size={14} className="mr-2" />
                                                    <Text className="text-xs">Add Sale Batch</Text>
                                                </Button>
                                            </View>
                                        </View>
                                    ))}

                                    <Button variant="secondary" className="border border-border h-12" onPress={() => setIsSearchOpen(true)}>
                                        <Icon as={Plus} size={16} className="mr-2" />
                                        <Text>Add Another Farmer</Text>
                                    </Button>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* Footer */}
                <View className="p-4 border-t border-border/50 bg-card flex-row justify-between items-center pb-8">
                    <View>
                        <Text className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total</Text>
                        <Text className="text-xl font-black">{items.length} <Text className="text-sm font-medium text-muted-foreground">Farmers</Text></Text>
                        <Text className="text-sm font-bold text-primary">
                            {items.reduce((sum, item) => sum + item.batches.reduce((bSum, b) => bSum + (Number(b.totalWeight) || 0), 0), 0).toFixed(2).replace(/\.00$/, '')} kg
                        </Text>
                    </View>
                    <Button
                        onPress={handleSubmit}
                        disabled={isSubmitting || items.length === 0}
                        className="w-48 h-12"
                    >
                        {isSubmitting ? (
                            <Text>Saving...</Text>
                        ) : (
                            <>
                                <Icon as={Copy} size={18} className="mr-2 text-primary-foreground" />
                                <Text>Save & Copy</Text>
                            </>
                        )}
                    </Button>
                </View>
            </View>
        </AppModal>
    );
}
