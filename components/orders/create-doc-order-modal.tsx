import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Bird, Calendar as CalendarIcon, CheckCircle2, Copy, Edit2, MapPin, Plus, Search, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, Switch, View } from "react-native";
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

interface DocItem {
    id: string; // temp id
    farmerId: string;
    farmerName: string;
    location?: string | null;
    mobile?: string | null;
    birdType: string;
    docCount: string;
    isContract: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function CreateDocOrderModal({ open, onOpenChange, orgId, onSuccess, initialData }: CreateDocOrderModalProps) {
    const insets = useSafeAreaInsets();

    // Form state
    const [orderDate, setOrderDate] = useState(new Date());
    const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
    const [branchName, setBranchName] = useState("");

    // Selected Farmers State
    const [items, setItems] = useState<DocItem[]>([]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setOrderDate(new Date(initialData.orderDate));
                setBranchName(initialData.branchName || "");
                setItems((initialData.items as any[]).map(item => ({
                    id: generateId(),
                    farmerId: item.farmerId,
                    farmerName: item.farmer?.name || "Unknown",
                    location: item.farmer?.location,
                    mobile: item.farmer?.mobile,
                    birdType: item.birdType,
                    docCount: item.docCount.toString(),
                    isContract: !!item.isContract
                })));
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
            Alert.alert("Error", error.message);
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
            Alert.alert("Error", error.message);
        }
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const generateCopyText = (items: DocItem[], oDate: Date, bName?: string) => {
        const orderDateStr = format(oDate, "dd/MM/yyyy");

        let text = `Dear sir,\nDOC order date: ${orderDateStr}\n`;
        if (bName) text += `Branch: ${bName}\n`;
        text += `\n`;

        let farmCounter = 1;
        let grandTotal = 0;
        const totalByType: Record<string, number> = {};

        items.forEach(item => {
            const qty = Number(item.docCount) || 0;
            if (qty <= 0) return;

            text += `Farm No ${farmCounter.toString().padStart(2, '0')}\n`;
            text += `${item.farmerName}\n`;
            if (item.location) text += `Location: ${item.location}\n`;
            if (item.mobile) text += `Phone: ${item.mobile}\n`;
            text += `Bird Type: ${item.birdType}\n`;
            text += `Count: ${qty} DOCs ${item.isContract ? '(Contract)' : ''}\n\n`;

            grandTotal += qty;
            totalByType[item.birdType] = (totalByType[item.birdType] || 0) + qty;
            farmCounter++;
        });

        text += `Total Requirements:\n`;
        Object.entries(totalByType).forEach(([type, qty]) => {
            text += `${type}: ${qty} DOCs\n`;
        });
        text += `\nGrand Total: ${grandTotal} DOCs`;

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
                birdType: defaultBirdType,
                docCount: "",
                isContract: false
            }
        ]);
    };

    const handleUpdateItem = (itemId: string, field: keyof DocItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, [field]: value };
        }));
    };

    const handleCreate = () => {
        if (items.length === 0) {
            Alert.alert("Validation", "Please add at least one farmer to the order.");
            return;
        }

        const formattedItems = items.map(item => ({
            farmerId: item.farmerId,
            birdType: item.birdType || "Broiler",
            docCount: Number(item.docCount) || 0,
            isContract: item.isContract
        })).filter(item => item.docCount > 0);

        if (formattedItems.length === 0) {
            Alert.alert("Validation", "Please enter at least one valid DOC count.");
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
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }}>

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
                                            <View className="flex-row gap-4">
                                                <View className="flex-1 gap-1">
                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">Bird Type</Text>
                                                    <Input
                                                        className="h-12 bg-background"
                                                        placeholder="e.g. Broiler"
                                                        value={item.birdType}
                                                        onChangeText={(val) => handleUpdateItem(item.id, 'birdType', val)}
                                                    />
                                                </View>
                                                <View className="flex-1 gap-1">
                                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest pl-1">DOC Count</Text>
                                                    <Input
                                                        className="h-12 bg-background"
                                                        placeholder="0"
                                                        keyboardType="numeric"
                                                        value={item.docCount}
                                                        onChangeText={(val) => handleUpdateItem(item.id, 'docCount', val)}
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-row items-center justify-between bg-muted/30 p-3 rounded-lg">
                                                <View>
                                                    <Text className="font-semibold text-sm">Contract Framing</Text>
                                                    <Text className="text-xs text-muted-foreground">Is this a contract order?</Text>
                                                </View>
                                                <Switch
                                                    value={item.isContract}
                                                    onValueChange={(val) => handleUpdateItem(item.id, 'isContract', val)}
                                                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                                                />
                                            </View>
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

                {/* Footer */}
                <View className="p-4 border-t border-border/50 bg-card flex-row justify-between items-center pb-8">
                    <View>
                        <Text className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Requirements</Text>
                        <Text className="text-xl font-black">{items.reduce((sum, item) => sum + (Number(item.docCount) || 0), 0)} <Text className="text-sm font-medium text-muted-foreground">DOCs</Text></Text>
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
    );
}
