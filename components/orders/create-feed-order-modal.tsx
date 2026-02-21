import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Calendar as CalendarIcon, CheckCircle2, Copy, Edit2, Factory, Plus, Search, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

interface CreateFeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
    initialData?: {
        id: string;
        orderDate: Date;
        deliveryDate: Date;
        items: FeedItem[];
    } | null;
}

interface FeedItem {
    id: string; // temp id
    farmerId: string;
    farmerName: string;
    location?: string | null;
    mobile?: string | null;
    feeds: { type: string; quantity: string }[];
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function CreateFeedOrderModal({ open, onOpenChange, orgId, onSuccess, initialData }: CreateFeedOrderModalProps) {
    const insets = useSafeAreaInsets();

    // Form state
    const [orderDate, setOrderDate] = useState(new Date());
    const [deliveryDate, setDeliveryDate] = useState(new Date(new Date().setDate(new Date().getDate() + 1)));
    const [showOrderDatePicker, setShowOrderDatePicker] = useState(false);
    const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);

    // Selected Farmers State
    const [items, setItems] = useState<FeedItem[]>([]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setOrderDate(new Date(initialData.orderDate));
                setDeliveryDate(new Date(initialData.deliveryDate));

                // Group flat items from DB by farmerId
                const grouped: Record<string, FeedItem> = {};
                (initialData.items as any[]).forEach(item => {
                    if (!grouped[item.farmerId]) {
                        grouped[item.farmerId] = {
                            id: generateId(),
                            farmerId: item.farmerId,
                            farmerName: item.farmer?.name || "Unknown",
                            location: item.farmer?.location,
                            mobile: item.farmer?.mobile,
                            feeds: []
                        };
                    }
                    grouped[item.farmerId].feeds.push({
                        type: item.feedType,
                        quantity: item.quantity.toString()
                    });
                });
                setItems(Object.values(grouped));
            } else {
                setOrderDate(new Date());
                setDeliveryDate(new Date(new Date().setDate(new Date().getDate() + 1)));
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

    const createMutation = trpc.officer.feedOrders.create.useMutation({
        onSuccess: (data, variables) => {
            const text = generateCopyText(items, variables.orderDate, variables.deliveryDate);
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

    const updateMutation = trpc.officer.feedOrders.update.useMutation({
        onSuccess: (data, variables) => {
            const text = generateCopyText(items, variables.orderDate, variables.deliveryDate);
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

    const generateCopyText = (items: FeedItem[], oDate: Date, dDate: Date) => {
        const orderDateStr = format(oDate, "dd/MM/yyyy");
        const deliveryDateStr = format(dDate, "dd/MM/yyyy");

        let text = `Dear sir,\nFeed order date: ${orderDateStr}\nFeed delivery  date: ${deliveryDateStr}\n\n`;

        let farmCounter = 1;
        const totalByType: Record<string, number> = {};
        let grandTotal = 0;

        items.forEach(item => {
            const activeFeeds = item.feeds.filter(f => f.type.trim() !== "" && (Number(f.quantity) || 0) > 0);
            if (activeFeeds.length === 0) return;

            text += `Farm No ${farmCounter.toString().padStart(2, '0')}\n`;
            text += `${item.farmerName}\n`;
            if (item.location) text += `Location: ${item.location}\n`;
            if (item.mobile) text += `Phone: ${item.mobile}\n`;

            activeFeeds.forEach(feed => {
                const qty = Number(feed.quantity) || 0;
                text += `${feed.type}: ${qty} Bags\n`;
                totalByType[feed.type] = (totalByType[feed.type] || 0) + qty;
                grandTotal += qty;
            });

            text += `\n`;
            farmCounter++;
        });

        text += `Total:\n`;
        Object.entries(totalByType).forEach(([type, qty]) => {
            text += `${type}: ${qty} Bags\n`;
        });

        text += `\nGrand Total: ${grandTotal} Bags`;

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
                feeds: [{ type: "B1", quantity: "" }, { type: "B2", quantity: "" }]
            }
        ]);
    };

    const handleUpdateFeed = (itemId: string, index: number, field: 'type' | 'quantity', value: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const newFeeds = [...item.feeds];
            newFeeds[index] = { ...newFeeds[index], [field]: value };
            return { ...item, feeds: newFeeds };
        }));
    };

    const handleAddFeedRow = (itemId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                feeds: [...item.feeds, { type: "", quantity: "" }]
            };
        }));
    };

    const handleRemoveFeedRow = (itemId: string, index: number) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const newFeeds = [...item.feeds];
            newFeeds.splice(index, 1);
            return { ...item, feeds: newFeeds };
        }));
    };

    const handleCreate = () => {
        // Validation: at least one farmer, and at least one valid feed entry total
        if (items.length === 0) {
            Alert.alert("Validation", "Please add at least one farmer to the order.");
            return;
        }

        const formattedItems = items.map(item => ({
            farmerId: item.farmerId,
            feeds: item.feeds
                .filter(f => f.type.trim() !== "" && (Number(f.quantity) || 0) > 0)
                .map(feed => ({
                    type: feed.type,
                    quantity: Number(feed.quantity)
                }))
        })).filter(item => item.feeds.length > 0);

        if (formattedItems.length === 0) {
            Alert.alert("Validation", "Please enter at least one valid feed quantity for the selected farmers.");
            return;
        }

        if (initialData) {
            updateMutation.mutate({
                id: initialData.id,
                orderDate,
                deliveryDate,
                items: formattedItems
            });
        } else {
            createMutation.mutate({
                orgId,
                orderDate,
                deliveryDate,
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
                            <Icon as={initialData ? Edit2 : Factory} size={16} className="text-primary" />
                        </View>
                        <Text className="text-lg font-bold text-foreground">
                            {initialData ? "Edit Feed Order" : "New Feed Order"}
                        </Text>
                    </View>
                    <Pressable onPress={() => onOpenChange(false)} disabled={isSubmitting}>
                        <Text className="text-primary font-bold">Cancel</Text>
                    </Pressable>
                </View>

                {/* Content */}
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }}>

                    {/* Dates */}
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
                            <Text className="text-sm font-semibold">Delivery Date</Text>
                            <Pressable
                                onPress={() => setShowDeliveryDatePicker(true)}
                                className="h-12 bg-muted/50 rounded-lg flex-row items-center px-4 border border-border/50"
                            >
                                <Icon as={CalendarIcon} size={18} className="text-muted-foreground mr-2" />
                                <Text>{format(deliveryDate, "MMM dd, yyyy")}</Text>
                            </Pressable>
                            {showDeliveryDatePicker && (
                                <DateTimePicker
                                    value={deliveryDate}
                                    mode="date"
                                    display="default"
                                    onChange={(event: any, date?: Date) => {
                                        setShowDeliveryDatePicker(false);
                                        if (date) setDeliveryDate(date);
                                    }}
                                />
                            )}
                        </View>
                    </View>

                    {/* Farmers & Feeds List */}
                    <View className="gap-4">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Selected Inventories</Text>
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

                                        <View className="gap-3">
                                            <View className="flex-row gap-2 px-1">
                                                <Text className="flex-1 text-xs text-muted-foreground uppercase font-bold tracking-widest pl-2">Type</Text>
                                                <Text className="w-24 text-xs text-muted-foreground uppercase font-bold tracking-widest pl-2">Qty (Bags)</Text>
                                                <View className="w-10" />
                                            </View>

                                            {item.feeds.map((feed, index) => (
                                                <View key={index} className="flex-row gap-2 items-center">
                                                    <Input
                                                        className="flex-1 h-12 bg-background"
                                                        placeholder="e.g. B1"
                                                        value={feed.type}
                                                        onChangeText={(val) => handleUpdateFeed(item.id, index, 'type', val)}
                                                    />
                                                    <Input
                                                        className="w-24 h-12 bg-background"
                                                        placeholder="0"
                                                        keyboardType="numeric"
                                                        value={feed.quantity}
                                                        onChangeText={(val) => handleUpdateFeed(item.id, index, 'quantity', val)}
                                                    />
                                                    <Pressable
                                                        onPress={() => handleRemoveFeedRow(item.id, index)}
                                                        className="w-10 h-12 items-center justify-center rounded-lg bg-destructive/10 active:bg-destructive/20"
                                                    >
                                                        <Icon as={Trash2} size={16} className="text-destructive" />
                                                    </Pressable>
                                                </View>
                                            ))}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 border-dashed border-border"
                                                onPress={() => handleAddFeedRow(item.id)}
                                            >
                                                <Icon as={Plus} size={14} className="mr-2 text-muted-foreground" />
                                                <Text className="text-muted-foreground">Add Feed Row</Text>
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

                {/* Footer */}
                <View className="p-4 border-t border-border/50 bg-card flex-row justify-between items-center pb-8">
                    <View>
                        <Text className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Selection</Text>
                        <Text className="text-xl font-black">{items.length} <Text className="text-sm font-medium text-muted-foreground">Farmers</Text></Text>
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
