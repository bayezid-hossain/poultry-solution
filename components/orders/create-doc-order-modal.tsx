import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Bird, Calendar as CalendarIcon, CheckCircle2, ChevronDown, Copy, Edit2, MapPin, Plus, Search, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

interface CreateDocOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
    initialData?: {
        id: string;
        orderDate: Date;
        branchName?: string | null;
        items: DocItem[];
    } | null;
}

interface DocBatch {
    id: string; // temp id for batch
    birdType: string;
    docCount: string;
    isContract: boolean;
}

interface DocItem {
    id: string; // temp id
    farmerId: string;
    farmerName: string;
    location?: string | null;
    mobile?: string | null;
    batches: DocBatch[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function CreateDocOrderModal({ open, onOpenChange, orgId, onSuccess, initialData }: CreateDocOrderModalProps) {
    const insets = useSafeAreaInsets();

    // Form state
    const [orderDate, setOrderDate] = useState(new Date());
    const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
    const [branchName, setBranchName] = useState("");
    const [isContract, setIsContract] = useState(false);

    // Selected Farmers State
    const [items, setItems] = useState<DocItem[]>([]);

    // Bird type picker state
    const [birdTypePickerItemId, setBirdTypePickerItemId] = useState<{ itemId: string, batchId: string } | null>(null);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setOrderDate(new Date(initialData.orderDate));
                setBranchName(initialData.branchName || "");
                setItems((initialData.items as any[]).reduce((acc: DocItem[], item: any) => {
                    const existing = acc.find(i => i.farmerId === item.farmerId);
                    if (existing) {
                        existing.batches.push({
                            id: item.id || generateId(),
                            birdType: item.birdType,
                            docCount: item.docCount.toString(),
                            isContract: !!item.isContract
                        });
                    } else {
                        acc.push({
                            id: generateId(),
                            farmerId: item.farmerId,
                            farmerName: item.farmer?.name || "Unknown",
                            location: item.farmer?.location,
                            mobile: item.farmer?.mobile,
                            batches: [{
                                id: item.id || generateId(),
                                birdType: item.birdType,
                                docCount: item.docCount.toString(),
                                isContract: !!item.isContract
                            }]
                        });
                    }
                    return acc;
                }, []));
            } else {
                setOrderDate(new Date());
                setBranchName("");
                setItems([]);
            }
        }
    }, [open, initialData]);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const { data: searchResults, isFetching: isSearching } = trpc.officer.farmers.listWithStock.useQuery(
        {
            orgId,
            page: 1,
            pageSize: 20,
            search: searchQuery
        },
        { enabled: isSearchOpen }
    );

    const { data: birdTypes } = trpc.officer.docOrders.getBirdTypes.useQuery();

    const createMutation = trpc.officer.docOrders.create.useMutation({
        onSuccess: (data, variables) => {
            const text = generateCopyText(items, variables.orderDate, variables.branchName || undefined);
            Clipboard.setStringAsync(text);
            toast.success("Order Created & Copied to Clipboard!");

            setItems([]);
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const updateMutation = trpc.officer.docOrders.update.useMutation({
        onSuccess: (data, variables) => {
            const text = generateCopyText(items, variables.orderDate, variables.branchName || undefined);
            Clipboard.setStringAsync(text);
            toast.success("Order Updated & Copied to Clipboard!");

            setItems([]);
            onSuccess?.();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const generateCopyText = (items: DocItem[], oDate: Date, bName?: string) => {
        const orderDateStr = format(oDate, "dd MMMM yy");
        let text = `Dear sir/ Boss, \n`;
        if (bName && bName.trim() !== "") {
            text += `Doc order under ${bName} branch\n `;
        }
        text += `Date: ${orderDateStr}\n\n`;

        let farmCounter = 1;
        const totalByType: Record<string, number> = {};
        let grandTotal = 0;

        items.forEach(item => {
            item.batches.forEach(batch => {
                const qty = Number(batch.docCount) || 0;
                if (!batch.birdType || qty <= 0) return;

                text += `Farm no: ${farmCounter.toString().padStart(2, '0')}\n`;
                if (batch.isContract) {
                    text += `Contract farm DOC \n`;
                }
                text += `Farm name: ${item.farmerName || 'Unknown Farmer'}\n`;
                if (item.location) text += `Location: ${item.location}\n`;
                if (item.mobile) text += `Mobile: ${item.mobile}\n`;

                text += `Quantity: ${qty} pcs\n`;
                text += `${batch.birdType || 'Unknown Type'}\n\n`;

                totalByType[batch.birdType] = (totalByType[batch.birdType] || 0) + qty;
                grandTotal += qty;
                farmCounter++;
            });
        });

        text += `Total:\n`;
        Object.entries(totalByType).forEach(([type, qty]) => {
            text += `${qty} pcs (${type})\n`;
        });

        return text;
    };

    const handleToggleFarmer = (farmer: any) => {
        if (items.some(i => i.farmerId === farmer.id)) {
            setItems(prev => prev.filter(i => i.farmerId !== farmer.id));
            return;
        }

        const defaultBirdType = birdTypes?.[0]?.name || "Broiler";

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
                    birdType: defaultBirdType,
                    docCount: "",
                    isContract: isContract
                }]
            }
        ]);
    };

    const handleUpdateBatch = (itemId: string, batchId: string, field: keyof DocBatch, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                batches: item.batches.map(batch =>
                    batch.id === batchId ? { ...batch, [field]: value } : batch
                )
            };
        }));
    };

    const handleAddBatch = (itemId: string) => {
        const defaultBirdType = birdTypes?.[0]?.name || "Broiler";
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                batches: [
                    ...item.batches,
                    {
                        id: generateId(),
                        birdType: defaultBirdType,
                        docCount: "",
                        isContract: isContract
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

    const handleCreate = () => {
        if (items.length === 0) {
            toast.error("Please add at least one farmer to the order.");
            return;
        }

        const formattedItems: any[] = [];
        items.forEach(item => {
            item.batches.forEach(batch => {
                const docCount = Number(batch.docCount) || 0;
                if (docCount > 0) {
                    formattedItems.push({
                        farmerId: item.farmerId,
                        birdType: batch.birdType || "Broiler",
                        docCount: docCount,
                        isContract: batch.isContract
                    });
                }
            });
        });

        if (formattedItems.length === 0) {
            toast.error("Please enter at least one valid DOC count.");
            return;
        }

        if (initialData) {
            updateMutation.mutate({
                id: initialData.id,
                orderDate,
                branchName: branchName.trim() || undefined,
                items: formattedItems
            });
        } else {
            createMutation.mutate({
                orgId,
                orderDate,
                branchName: branchName.trim() || undefined,
                items: formattedItems
            });
        }
    };

    if (isSearchOpen) {
        return (
            <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setIsSearchOpen(false)}>
                <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
                    <View className="px-4 py-4 border-b border-border/50 flex-row gap-2 items-center">
                        <View className="flex-1 relative justify-center">
                            <View className="absolute left-3 z-10 w-5 h-5 justify-center items-center">
                                <Icon as={Search} size={18} className="text-muted-foreground" />
                            </View>
                            <Input
                                placeholder="Search inventory to add..."
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
            </Modal>
        );
    }

    return (
        <>
            <Modal visible={open} animationType="slide" presentationStyle="formSheet" onRequestClose={() => !isSubmitting && onOpenChange(false)}>
                <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
                    {/* Header */}
                    <View className="px-4 py-4 border-b border-border/50 flex-row justify-between items-center bg-card">
                        <View className="flex-row items-center gap-2">
                            <View className="bg-primary/20 w-8 h-8 rounded-full items-center justify-center">
                                <Icon as={initialData ? Edit2 : Bird} size={16} className="text-primary" />
                            </View>
                            <Text className="text-lg font-bold text-foreground">
                                {initialData ? "Edit DOC Order" : "New DOC Order"}
                            </Text>
                        </View>
                        <Pressable onPress={() => onOpenChange(false)} disabled={isSubmitting}>
                            <Text className="text-primary font-bold">Cancel</Text>
                        </Pressable>
                    </View>

                    {/* Content */}
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                        <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

                            {/* Metadata */}
                            <View className="flex-row gap-4">
                                <View className="flex-1 gap-2">
                                    <Text className="text-sm font-semibold">Order Date</Text>
                                    <Pressable
                                        onPress={() => setShowOrderDatePicker(true)}
                                        className="h-12 bg-muted/50 rounded-lg flex-row items-center px-4 border border-border/50"
                                    >
                                        <Icon as={CalendarIcon} size={18} className="text-muted-foreground mr-2" />
                                        <Text>{format(orderDate, "MMM dd, yyyy")}</Text>
                                    </Pressable>
                                    {showOrderDatePicker && (
                                        <DateTimePicker
                                            value={orderDate}
                                            mode="date"
                                            display="default"
                                            onChange={(event: any, date?: Date) => {
                                                setShowOrderDatePicker(false);
                                                if (date) setOrderDate(date);
                                            }}
                                        />
                                    )}
                                </View>
                                <View className="flex-1 gap-2">
                                    <Text className="text-sm font-semibold">Branch (Optional)</Text>
                                    <View className="h-12 bg-muted/50 rounded-lg flex-row items-center px-4 border border-border/50">
                                        <Icon as={MapPin} size={18} className="text-muted-foreground mr-2" />
                                        <Input
                                            className="flex-1 h-full border-0 bg-transparent px-0"
                                            placeholder="Enter branch name"
                                            value={branchName}
                                            onChangeText={setBranchName}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Global Contract Toggle */}
                            <View className="flex-row items-center justify-between bg-muted/30 p-4 rounded-2xl border border-border/50">
                                <View>
                                    <Text className="font-semibold text-sm">Contract Farming</Text>
                                    <Text className="text-xs text-muted-foreground">Apply to all farmers in this order</Text>
                                </View>
                                <Switch
                                    value={isContract}
                                    onValueChange={setIsContract}
                                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                                />
                            </View>

                            {/* Farmers List */}
                            <View className="gap-4">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selected Farmers</Text>
                                </View>

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
                                                    {item.batches.map((batch, batchIndex) => (
                                                        <View key={batch.id} className="relative z-0">
                                                            {item.batches.length > 1 && (
                                                                <View className="flex-row justify-between items-center mb-2">
                                                                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Batch {batchIndex + 1}</Text>
                                                                    <Pressable onPress={() => handleRemoveBatch(item.id, batch.id)} className="p-1">
                                                                        <Icon as={Trash2} size={14} className="text-destructive/80" />
                                                                    </Pressable>
                                                                </View>
                                                            )}
                                                            <View className="flex-row gap-4">
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">Bird Type</Text>
                                                                    <Pressable
                                                                        onPress={() => setBirdTypePickerItemId({ itemId: item.id, batchId: batch.id })}
                                                                        className="h-12 bg-background border border-border rounded-lg flex-row items-center px-4 justify-between"
                                                                    >
                                                                        <Text className={batch.birdType ? "text-foreground font-medium" : "text-muted-foreground"}>
                                                                            {batch.birdType || "Select type"}
                                                                        </Text>
                                                                        <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
                                                                    </Pressable>
                                                                </View>
                                                                <View className="flex-1 gap-1">
                                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">DOC Count</Text>
                                                                    <Input
                                                                        className="h-12 bg-background"
                                                                        placeholder="0"
                                                                        keyboardType="numeric"
                                                                        value={batch.docCount}
                                                                        onChangeText={(val) => handleUpdateBatch(item.id, batch.id, 'docCount', val)}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    ))}

                                                    <Button variant="outline" className="h-10 border-dashed" onPress={() => handleAddBatch(item.id)}>
                                                        <Icon as={Plus} size={14} className="mr-2" />
                                                        <Text className="text-xs">Add Batch</Text>
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
                            <Text className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Requirements</Text>
                            <Text className="text-xl font-black">
                                {items.reduce((sum, item) => sum + item.batches.reduce((bSum, b) => bSum + (Number(b.docCount) || 0), 0), 0)}
                                <Text className="text-sm font-medium text-muted-foreground"> DOCs</Text>
                            </Text>
                        </View>
                        <Button
                            onPress={handleCreate}
                            disabled={isSubmitting || items.length === 0}
                            className="w-48 h-12"
                        >
                            {isSubmitting ? (
                                <Text>{isSubmitting ? "Saving..." : "Save & Copy"}</Text>
                            ) : (
                                <>
                                    <Icon as={Copy} size={18} className="mr-2 text-primary-foreground" />
                                    <Text>{initialData ? "Update & Copy" : "Save & Copy"}</Text>
                                </>
                            )}
                        </Button>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={!!birdTypePickerItemId}
                animationType="fade"
                onRequestClose={() => setBirdTypePickerItemId(null)}
            >
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setBirdTypePickerItemId(null)}>
                    <Pressable className="bg-card rounded-t-3xl pb-8 overflow-hidden border-t border-border/50" onPress={(e) => e.stopPropagation()}>
                        <View className="items-center py-4">
                            <View className="w-12 h-1.5 bg-muted rounded-full" />
                        </View>
                        <View className="px-6 pb-2">
                            <Text className="text-lg font-black text-foreground mb-4">Select Bird Type</Text>
                            {birdTypes?.map((bt: any) => (
                                <Pressable
                                    key={bt.id || bt.name}
                                    className="flex-row items-center py-3.5 border-b border-border/30 active:bg-muted/50"
                                    onPress={() => {
                                        if (birdTypePickerItemId) {
                                            handleUpdateBatch(birdTypePickerItemId.itemId, birdTypePickerItemId.batchId, 'birdType', bt.name);
                                        }
                                        setBirdTypePickerItemId(null);
                                    }}
                                >
                                    <Icon as={Bird} size={18} className="text-primary mr-3" />
                                    <Text className="text-base font-medium text-foreground">{bt.name}</Text>
                                </Pressable>
                            ))}
                            {(!birdTypes || birdTypes.length === 0) && (
                                <Text className="text-muted-foreground py-4 text-center">No bird types found</Text>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

