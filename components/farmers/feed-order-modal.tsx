/// <reference types="nativewind/types" />
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Calendar, Check, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, TextInput, View } from "react-native";
import { toast } from "sonner-native";

interface FeedItem {
    id: string; // temp id
    farmerId: string;
    farmerName: string;
    feeds: { type: string; quantity: string }[];
}

interface FeedOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
}

export function FeedOrderModal({ open, onOpenChange, orgId }: FeedOrderModalProps) {
    const [selectedFarmers, setSelectedFarmers] = useState<FeedItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const searchRef = useRef<TextInput>(null);

    const { data: farmers, isLoading: isLoadingFarmers } = trpc.officer.farmers.listWithStock.useQuery({
        orgId,
        page: 1,
        pageSize: 100,
        search: searchQuery
    }, { enabled: isSearchOpen });

    const handleToggleFarmer = (farmer: any) => {
        if (selectedFarmers.some(f => f.farmerId === farmer.id)) {
            setSelectedFarmers(prev => prev.filter(f => f.farmerId !== farmer.id));
        } else {
            setSelectedFarmers(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                farmerId: farmer.id,
                farmerName: farmer.name,
                feeds: [{ type: "B1", quantity: "0" }, { type: "B2", quantity: "0" }]
            }]);
        }
    };

    const handleUpdateFeed = (itemId: string, index: number, field: 'type' | 'quantity', value: string) => {
        setSelectedFarmers(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            const newFeeds = [...item.feeds];
            newFeeds[index] = { ...newFeeds[index], [field]: value };
            return { ...item, feeds: newFeeds };
        }));
    };

    const handleAddFeedRow = (itemId: string) => {
        setSelectedFarmers(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, feeds: [...item.feeds, { type: "", quantity: "0" }] };
        }));
    };

    const handleRemoveFeedRow = (itemId: string, index: number) => {
        setSelectedFarmers(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, feeds: item.feeds.filter((_, i) => i !== index) };
        }));
    };

    const handleGenerateOrder = async () => {
        if (selectedFarmers.length === 0) {
            toast.error("Please select at least one farmer.");
            return;
        }

        const orderDate = format(new Date(), "dd/MM/yyyy");
        const deliveryDate = format(new Date(Date.now() + 86400000), "dd/MM/yyyy");

        let text = `Dear sir,\nFeed order date: ${orderDate}\nFeed delivery date: ${deliveryDate}\n\n`;

        let farmCounter = 1;
        const totalByType: Record<string, number> = {};
        let grandTotal = 0;

        selectedFarmers.forEach(item => {
            const activeFeeds = item.feeds.filter(f => f.type.trim() !== "" && Number(f.quantity) > 0);
            if (activeFeeds.length === 0) return;

            text += `Farm No ${farmCounter.toString().padStart(2, '0')}\n`;
            text += `${item.farmerName}\n`;

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

        try {
            await Share.share({ message: text });
            toast.success("Order shared!");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to share order.");
        }
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => onOpenChange(false)}
        >
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-background w-full h-[90%] rounded-t-3xl overflow-hidden border-t border-border/50 shadow-2xl">
                    {/* Header */}
                    <View className="p-6 border-b border-border/50 flex-row justify-between items-center bg-muted/20">
                        <View className="flex-row items-center gap-3">
                            <View className="p-2 bg-orange-500/10 rounded-lg">
                                <Icon as={ShoppingCart} size={20} className="text-orange-500" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground font-black uppercase">Feed Order</Text>
                                <Text className="text-xs text-muted-foreground">Create order for dealer</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted/50 active:bg-muted"
                        >
                            <Icon as={X} size={20} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    <View className="flex-1">
                        <ScrollView className="flex-1 p-6">
                            {/* Date Section */}
                            <View className="flex-row gap-3 mb-6">
                                <View className="flex-1 bg-muted/30 p-3 rounded-2xl border border-border/50">
                                    <Text className="text-[10px] text-muted-foreground uppercase font-black mb-1">Order Date</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Icon as={Calendar} size={14} className="text-primary" />
                                        <Text className="text-foreground font-bold">{format(new Date(), "dd/MM/yyyy")}</Text>
                                    </View>
                                </View>
                                <View className="flex-1 bg-muted/30 p-3 rounded-2xl border border-border/50">
                                    <Text className="text-[10px] text-muted-foreground uppercase font-black mb-1">Deliv. Date</Text>
                                    <View className="flex-row items-center gap-2">
                                        <Icon as={Calendar} size={14} className="text-primary" />
                                        <Text className="text-foreground font-bold">{format(new Date(Date.now() + 86400000), "dd/MM/yyyy")}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Farmer Selector */}
                            <Pressable
                                onPress={() => setIsSearchOpen(!isSearchOpen)}
                                className="bg-muted/30 h-14 px-4 rounded-2xl border border-border/50 flex-row items-center justify-between mb-6"
                            >
                                <View className="flex-row items-center gap-3">
                                    <Icon as={Search} size={18} className="text-muted-foreground" />
                                    <Text className="text-muted-foreground">
                                        {selectedFarmers.length > 0 ? `${selectedFarmers.length} Farmers Selected` : "Search & Select Farmers"}
                                    </Text>
                                </View>
                                <Icon as={Plus} size={18} className="text-primary" />
                            </Pressable>

                            {isSearchOpen && (
                                <View className="bg-muted/20 rounded-2xl border border-border/50 p-2 mb-6">
                                    <Input
                                        ref={searchRef}
                                        placeholder="Search by name..."
                                        className="h-12 px-4 bg-background/50 rounded-xl mb-2"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        returnKeyType="next"
                                    />
                                    <View className="max-h-48">
                                        <ScrollView nestedScrollEnabled>
                                            {isLoadingFarmers ? (
                                                <ActivityIndicator className="py-4" />
                                            ) : (
                                                farmers?.items.map((f: any) => (
                                                    <Pressable
                                                        key={f.id}
                                                        onPress={() => handleToggleFarmer(f)}
                                                        className={`p-3 rounded-xl flex-row items-center justify-between ${selectedFarmers.some(s => s.farmerId === f.id) ? 'bg-primary/10' : ''}`}
                                                    >
                                                        <Text className={`font-bold ${selectedFarmers.some(s => s.farmerId === f.id) ? 'text-primary' : 'text-foreground'}`}>{f.name}</Text>
                                                        {selectedFarmers.some(s => s.farmerId === f.id) && <Icon as={Check} size={16} className="text-primary" />}
                                                    </Pressable>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                            {/* Order Items */}
                            <View className="space-y-4 pb-8">
                                {selectedFarmers.map((item) => (
                                    <View key={item.id} className="bg-card border border-border/50 rounded-2xl p-4">
                                        <View className="flex-row justify-between items-center mb-4 border-b border-border/20 pb-2">
                                            <Text className="font-black text-foreground uppercase tracking-tight">{item.farmerName}</Text>
                                            <Pressable onPress={() => handleToggleFarmer({ id: item.farmerId })}>
                                                <Icon as={Trash2} size={18} className="text-destructive/50" />
                                            </Pressable>
                                        </View>

                                        <View className="space-y-3">
                                            {item.feeds.map((feed, idx) => (
                                                <View key={idx} className="flex-row items-center gap-3">
                                                    <Input
                                                        placeholder="Type (e.g. B1)"
                                                        className="flex-1 bg-muted/30 h-10 px-3 rounded-lg border border-border/30 text-xs"
                                                        value={feed.type}
                                                        onChangeText={(v) => handleUpdateFeed(item.id, idx, 'type', v)}
                                                        returnKeyType="next"
                                                    />
                                                    <Input
                                                        placeholder="Qty"
                                                        keyboardType="numeric"
                                                        className="w-20 bg-muted/30 h-10 px-3 rounded-lg border border-border/30 text-xs text-right"
                                                        value={feed.quantity}
                                                        onChangeText={(v) => handleUpdateFeed(item.id, idx, 'quantity', v)}
                                                        returnKeyType="next"
                                                    />
                                                    <Text className="text-[10px] text-muted-foreground uppercase font-black w-8">Bags</Text>
                                                    {idx >= 2 && (
                                                        <Pressable onPress={() => handleRemoveFeedRow(item.id, idx)}>
                                                            <Icon as={Trash2} size={14} className="text-destructive/50" />
                                                        </Pressable>
                                                    )}
                                                </View>
                                            ))}
                                            <Pressable
                                                onPress={() => handleAddFeedRow(item.id)}
                                                className="flex-row items-center gap-2 py-2"
                                            >
                                                <Icon as={Plus} size={14} className="text-primary" />
                                                <Text className="text-[10px] font-bold text-primary uppercase">Add Feed Type</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        <View className="p-6 border-t border-border/50 bg-muted/20">
                            <Button
                                onPress={handleGenerateOrder}
                                disabled={selectedFarmers.length === 0}
                                className="h-16 rounded-2xl bg-orange-500 active:opacity-90 flex-row items-center justify-center gap-3"
                            >
                                <Icon as={ShoppingCart} size={20} className="text-white" />
                                <Text className="text-white font-black text-base uppercase tracking-widest">Share Order</Text>
                            </Button>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
