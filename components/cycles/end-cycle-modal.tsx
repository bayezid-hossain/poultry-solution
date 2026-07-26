import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Archive, Plus, ShoppingCart, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { FeedTypeInput } from "../farmers/feed-type-input";

interface EndCycleModalProps {
    cycle: {
        id: string;
        name: string;
        intake: number;
    };
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    onRecordSale?: () => void;
}

interface FeedRow {
    type: string;
    quantity: string;
}

const emptyFeed = (): FeedRow => ({ type: "", quantity: "" });

export function EndCycleModal({
    cycle,
    farmerName,
    open,
    onOpenChange,
    onSuccess,
    onRecordSale,
}: EndCycleModalProps) {
    const [feeds, setFeeds] = useState<FeedRow[]>([emptyFeed()]);
    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    useEffect(() => {
        if (open) {
            setFeeds([{ type: "", quantity: cycle.intake.toString() }]);
        }
    }, [open, cycle]);

    const mutation = trpc.officer.cycles.end.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            toast.error(err.message);
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
            .filter(f => (Number(f.quantity) || 0) >= 0 && f.quantity.trim() !== "")
            .map(f => ({ type: f.type.trim() || undefined, quantity: Number(f.quantity) }));

        if (validFeeds.length === 0) {
            toast.error("Please enter a valid final feed intake");
            return;
        }
        mutation.mutate({
            id: cycle.id,
            feeds: validFeeds,
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                {/* Header */}
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Archive} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Confirm End Cycle</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                Are you sure you want to end this cycle?
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                {/* Content */}
                <View className="p-6 gap-4">
                    <View className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl flex-row gap-3">
                        <Icon as={AlertTriangle} size={20} className="text-destructive shrink-0" />
                        <Text className="text-xs text-destructive flex-1 leading-relaxed">
                            This will archive <Text className="font-bold text-destructive uppercase">{farmerName}</Text>. This action cannot be undone.
                        </Text>
                    </View>

                    <View className="gap-3">
                        <View className="flex-row gap-2 px-1">
                            <Text className="flex-1 text-xs text-muted-foreground uppercase font-bold tracking-widest">Feed Type (Optional)</Text>
                            <Text className="w-24 text-xs text-muted-foreground uppercase font-bold tracking-widest">Bags</Text>
                            <View className="w-8" />
                        </View>

                        {feeds.map((feed, index) => (
                            <View key={index} className="flex-row gap-2 items-center">
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
                        <Text className="text-[10px] text-muted-foreground ml-1">
                            Enter the actual number of bags physically eaten, broken down by feed type if known.
                        </Text>
                    </View>

                    <View className="gap-3 pt-2">
                        <Button
                            className="h-14 bg-white border border-border shadow-none rounded-2xl flex-row gap-2"
                            onPress={() => {
                                onOpenChange(false);
                                onRecordSale?.();
                            }}
                        >
                            <Icon as={ShoppingCart} size={18} className="text-black" />
                            <Text className="text-black font-bold">Record Sale & End</Text>
                        </Button>

                        <Button
                            variant="destructive"
                            className="h-14 rounded-2xl shadow-none"
                            onPress={handleSubmit}
                            disabled={mutation.isPending}
                        >
                            <Text className="text-destructive-foreground font-bold">
                                {mutation.isPending ? "Ending..." : "End Without Sale"}
                            </Text>
                        </Button>

                        <Button
                            variant="ghost"
                            className="h-12 rounded-xl"
                            onPress={() => onOpenChange(false)}
                        >
                            <Text className="font-bold text-muted-foreground">Cancel</Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
