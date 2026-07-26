import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Wheat, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { FeedTypeInput } from "./feed-type-input";

interface RestockModalProps {
    farmerId: string;
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface FeedRow {
    type: string;
    quantity: string;
}

const emptyFeed = (): FeedRow => ({ type: "", quantity: "" });

export function RestockModal({
    farmerId,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
}: RestockModalProps) {
    const [feeds, setFeeds] = useState<FeedRow[]>([emptyFeed()]);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);

    const noteRef = useRef<TextInput>(null);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const addStockProcedure = isManagement ? trpc.management.stock.addStock : trpc.officer.stock.addStock;
    const mutation = (addStockProcedure as any).useMutation({
        onSuccess: () => {
            onOpenChange(false);
            setFeeds([emptyFeed()]);
            setNote("");
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleUpdateFeed = (index: number, field: 'type' | 'quantity', value: string) => {
        setFeeds(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
    };

    const handleAddFeedRow = () => setFeeds(prev => [...prev, emptyFeed()]);

    const handleRemoveFeedRow = (index: number) => {
        setFeeds(prev => {
            const next = [...prev];
            next.splice(index, 1);
            return next.length ? next : [emptyFeed()];
        });
    };

    const totalBags = feeds.reduce((sum, f) => sum + (Number(f.quantity) || 0), 0);

    const handleSubmit = () => {
        const validFeeds = feeds
            .filter(f => (Number(f.quantity) || 0) > 0)
            .map(f => ({ type: f.type.trim() || undefined, quantity: Number(f.quantity) }));

        if (validFeeds.length === 0) {
            setError("Please enter at least one valid quantity");
            return;
        }
        setError(null);
        mutation.mutate({
            farmerId,
            feeds: validFeeds,
            note: note || "Manual Restock",
            orgId: isManagement ? membership?.orgId : undefined
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                {/* Header */}
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Wheat} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Restock Feed</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                Add bags for {farmerName}
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                {/* Form */}
                <View className="p-6 gap-4">
                    <View className="gap-3">
                        <View className="flex-row gap-2 px-1">
                            <Text className="flex-1 text-xs text-muted-foreground uppercase font-bold tracking-widest">Feed Type (Optional)</Text>
                            <Text className="w-24 text-xs text-muted-foreground uppercase font-bold tracking-widest">Bags</Text>
                            <View className="w-8" />
                        </View>

                        {feeds.map((feed, index) => (
                            <View key={index} className="flex-row gap-2 items-start">
                                <View className="flex-1">
                                    <FeedTypeInput
                                        value={feed.type}
                                        onChangeText={(val) => handleUpdateFeed(index, 'type', val)}
                                        orgId={membership?.orgId}
                                        className="h-12 bg-muted/30 border-border/50"
                                    />
                                </View>
                                <Input
                                    className="w-24 h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={feed.quantity}
                                    onChangeText={(val) => handleUpdateFeed(index, 'quantity', val)}
                                />
                                {feeds.length > 1 && (
                                    <Pressable
                                        onPress={() => handleRemoveFeedRow(index)}
                                        className="w-8 h-12 items-center justify-center rounded-lg bg-destructive/10 active:bg-destructive/20"
                                    >
                                        <Icon as={Trash2} size={16} className="text-destructive" />
                                    </Pressable>
                                )}
                            </View>
                        ))}

                        <Pressable onPress={handleAddFeedRow} className="flex-row items-center gap-1.5 self-start">
                            <Icon as={Plus} size={14} className="text-primary" />
                            <Text className="text-xs font-bold text-primary">Add Feed Type</Text>
                        </Pressable>

                        {feeds.length > 1 && (
                            <Text className="text-xs font-bold text-muted-foreground ml-1">Total: {totalBags} bags</Text>
                        )}
                    </View>

                    <View className="gap-2">
                        <Text className="text-sm font-bold text-foreground ml-1">Note (Optional)</Text>
                        <Input
                            ref={noteRef}
                            placeholder="Manual restock..."
                            value={note}
                            onChangeText={setNote}
                            className="h-12 bg-muted/30 border-border/50"
                            returnKeyType="done"
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
                        <Button className="flex-1 h-12 bg-primary rounded-xl shadow-none" onPress={handleSubmit} disabled={mutation.isPending}>
                            <Text className="text-primary-foreground font-bold">
                                {mutation.isPending ? "Restocking..." : "Restock"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
