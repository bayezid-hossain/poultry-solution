import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { Bird, Calendar, ChevronDown, ChevronRight, ChevronUp, Copy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "sonner-native";

export function DocOrderCard({
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
    const isConfirmed = order.status === "CONFIRMED";
    const [isExpanded, setIsExpanded] = useState(false);

    const totalQuantity = order.items?.reduce((sum: number, item: any) => sum + Number(item.docCount || 0), 0) || 0;
    const uniqueFarmersCount = new Set(order.items?.map((item: any) => item.farmerId)).size;

    const generateCopyText = () => {
        const orderDateStr = format(new Date(order.orderDate), "dd MMMM yy");

        // Header
        let text = `Dear sir/ Boss, \n`;
        if (order.branchName) {
            text += `Doc order under ${order.branchName} branch\n`;
        }
        text += `Date: ${orderDateStr}\n\n`;

        let farmCounter = 1;
        const totalByType: Record<string, number> = {};
        let grandTotal = 0;

        order.items?.forEach((item: any) => {
            text += `Farm no: ${farmCounter.toString().padStart(2, '0')}\n`;
            if (item.isContract) {
                text += `Contact farm DOC \n`;
            }
            text += `Farm name: ${item.farmer.name}\n`;
            if (item.farmer.location) text += `Location: ${item.farmer.location}\n`;
            if (item.farmer.mobile) text += `Mobile: ${item.farmer.mobile}\n`;

            text += `Quantity: ${item.docCount} pcs\n`;
            text += `${item.birdType}\n\n`;

            // Totals
            totalByType[item.birdType] = (totalByType[item.birdType] || 0) + item.docCount;
            grandTotal += item.docCount;
            farmCounter++;
        });

        text += `Total:\n`;
        Object.entries(totalByType).forEach(([type, qty]) => {
            text += `${qty} pcs (${type})\n`;
        });

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
                                <Icon as={Bird} size={16} className={isConfirmed ? "text-primary" : "text-muted-foreground"} />
                            </View>
                            <View>
                                <Text className="font-bold text-base">DOC Order {isConfirmed && "✓"}</Text>
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
                        {order.branchName && (
                            <View className="flex-1 bg-background/50 p-2 rounded-lg border border-border/30">
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Branch</Text>
                                <View className="flex-row items-center gap-1.5">
                                    <Text className="text-xs font-semibold">{order.branchName}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <View className="flex-row items-center justify-between border-t border-border/30 pt-3">
                        <View className="flex-row items-center gap-3">
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Farmers</Text>
                                <Text className="font-black text-foreground">{uniqueFarmersCount}</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Total DOCs</Text>
                                <Text className="font-black text-foreground">{totalQuantity} <Text className="text-xs font-medium text-muted-foreground">birds</Text></Text>
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
                            <Icon as={ChevronRight} size={20} className="text-muted-foreground/30" />
                        </View>
                    </View>

                    {isExpanded && (
                        <View className="mt-3 p-3 bg-muted/40 rounded-xl border border-dashed border-border">
                            <Text className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                {generateCopyText()}
                            </Text>
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
