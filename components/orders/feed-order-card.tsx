import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { useRouter } from "expo-router";
import { Calendar, ChevronDown, ChevronUp, Copy, Factory, Truck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "sonner-native";

export function FeedOrderCard({
    order,
    onPress,
    onEdit,
    onDelete,
    onConfirm
}: {
    order: any,
    onPress?: () => void,
    onEdit?: () => void,
    onDelete?: () => void,
    onConfirm?: () => void
}) {
    const router = useRouter();
    const isConfirmed = order.status === "CONFIRMED";
    const [isExpanded, setIsExpanded] = useState(false);

    const totalBags = order.items?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;
    const uniqueFarmersCount = new Set(order.items?.map((item: any) => item.farmerId)).size;

    const generateCopyText = () => {
        const orderDateStr = format(new Date(order.orderDate), "dd/MM/yyyy");
        const deliveryDateStr = format(new Date(order.deliveryDate), "dd/MM/yyyy");

        let text = `Dear sir,\nFeed order date: ${orderDateStr}\nFeed delivery date: ${deliveryDateStr}\n\n`;

        const farmerMap = new Map<string, any[]>();
        order.items?.forEach((item: any) => {
            const groupKey = item.groupId || item.farmerId;
            if (!farmerMap.has(groupKey)) {
                farmerMap.set(groupKey, []);
            }
            farmerMap.get(groupKey)?.push(item);
        });

        let farmCounter = 1;
        const totalByType: Record<string, number> = {};
        let grandTotal = 0;

        farmerMap.forEach((items, groupKey) => {
            const firstItem = items[0];
            const farmer = firstItem.farmer;
            const activeItems = items.filter(i => i.quantity > 0);
            if (activeItems.length === 0) return;

            text += `Farm No ${farmCounter.toString().padStart(2, '0')}\n`;
            text += `${farmer.name}\n`;

            const location = firstItem.locationOverride ?? farmer.location;
            const mobile = firstItem.mobileOverride ?? farmer.mobile;

            if (location) text += `Location: ${location}\n`;
            if (mobile) text += `Phone: ${mobile}\n`;

            activeItems.sort((a, b) => a.feedType.localeCompare(b.feedType)).forEach(item => {
                text += `${item.feedType}: ${item.quantity} Bags\n`;
                totalByType[item.feedType] = (totalByType[item.feedType] || 0) + item.quantity;
                grandTotal += item.quantity;
            });

            text += `\n`;
            farmCounter++;
        });

        text += `Total:\n`;
        Object.entries(totalByType)
            .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
            .forEach(([type, qty]) => {
                text += `${type}: ${qty} Bags\n`;
            });

        text += `\nGrand Total: ${grandTotal} Bags`;
        return text;
    };

    const handleCopy = () => {
        const text = generateCopyText();
        Clipboard.setStringAsync(text);
        toast.success("Order copied to clipboard!");
    };

    return (
        <Pressable onPress={onPress}>
            <Card className={`overflow-hidden border ${isConfirmed ? 'border-primary/20 bg-primary/5' : 'border-border/50 bg-card'} mb-3`}>
                <View className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-row items-center gap-2">
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${isConfirmed ? 'bg-primary/20' : 'bg-muted'}`}>
                                <Icon as={Factory} size={16} className={isConfirmed ? "text-primary" : "text-muted-foreground"} />
                            </View>
                            <View>
                                <Text className="font-bold text-base">Feed Order {isConfirmed && "✓"}</Text>
                                <Text className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8).toUpperCase()}</Text>
                            </View>
                        </View>
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={handleCopy}
                                className="w-8 h-8 rounded-lg bg-primary items-center justify-center active:bg-primary/80"
                            >
                                <Icon as={Copy} size={14} className="text-primary-foreground" />
                            </Pressable>
                            <View className={`px-2 py-1 rounded-full ${isConfirmed ? 'bg-primary/20' : 'bg-muted'}`}>
                                <Text className={`text-[10px] font-bold uppercase tracking-wider ${isConfirmed ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {order.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row gap-4 mb-3">
                        <View className="flex-1 bg-background/50 p-2 rounded-lg border border-border/30">
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Order Date</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Calendar} size={12} className="text-primary" />
                                <Text className="text-xs font-semibold">{format(new Date(order.orderDate), "MMM dd, yyyy")}</Text>
                            </View>
                        </View>
                        <View className="flex-1 bg-background/50 p-2 rounded-lg border border-border/30">
                            <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Delivery</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Truck} size={12} className={isConfirmed ? "text-primary" : "text-muted-foreground"} />
                                <Text className="text-xs font-semibold">{format(new Date(order.deliveryDate), "MMM dd, yyyy")}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between border-t border-border/30 pt-3">
                        <View className="flex-row items-center gap-3">
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Farmers</Text>
                                <Text className="font-black text-foreground">{uniqueFarmersCount}</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Bags</Text>
                                <Text className="font-black text-foreground">{totalBags} <Text className="text-xs font-medium text-muted-foreground">bags</Text></Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Pressable
                                onPress={() => setIsExpanded(!isExpanded)}
                                className="flex-row items-center gap-1 px-2 py-1"
                            >
                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {isExpanded ? "Hide Draft" : "View Draft"}
                                </Text>
                                <Icon as={isExpanded ? ChevronUp : ChevronDown} size={14} className="text-muted-foreground/50" />
                            </Pressable>

                        </View>
                    </View>

                    {isExpanded && (
                        <View className="mt-3 p-3 bg-muted/40 rounded-xl border border-dashed border-border gap-y-3">
                            <View className="flex-row flex-wrap gap-2">
                                {Array.from(new Set(order.items?.map((i: any) => i.farmerId))).map((fId: any) => {
                                    const farmer = order.items.find((i: any) => i.farmerId === fId)?.farmer;
                                    if (!farmer) return null;
                                    return (
                                        <Pressable
                                            key={fId}
                                            onPress={() => router.push({ pathname: "/farmer/[id]", params: { id: fId } } as any)}
                                            className="bg-primary/5 px-2 py-1 rounded border border-primary/10 active:opacity-70 active:bg-primary/10"
                                        >
                                            <Text className="text-[10px] font-bold text-primary uppercase">{farmer.name}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            <Text className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                {generateCopyText()}
                            </Text>
                        </View>
                    )}

                    {isConfirmed && order.driverName && (
                        <View className="mt-3 flex-row items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
                            <Icon as={Truck} size={14} className="text-primary" />
                            <Text className="text-xs font-bold text-primary">Driver: {order.driverName}</Text>
                        </View>
                    )}

                    {!isConfirmed && (
                        <View className="flex-row items-center justify-end gap-2 border-t border-border/30 pt-3 mt-3">
                            <Pressable onPress={onDelete} className="px-4 py-2 rounded-lg bg-destructive/10 active:bg-destructive/20 border border-destructive/20">
                                <Text className="text-destructive font-bold text-xs">Delete</Text>
                            </Pressable>
                            <Pressable onPress={onEdit} className="px-4 py-2 rounded-lg bg-muted active:bg-accent border border-border/50">
                                <Text className="text-foreground font-bold text-xs">Edit</Text>
                            </Pressable>
                            <Pressable onPress={onConfirm} className="px-4 py-2 rounded-lg bg-primary active:bg-primary/90">
                                <Text className="text-primary-foreground font-bold text-xs">Confirm</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </Card>
        </Pressable>
    );
}
