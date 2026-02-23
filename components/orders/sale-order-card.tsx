import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import * as Clipboard from 'expo-clipboard';
import { useRouter } from "expo-router";
import { Calendar, ChevronDown, ChevronUp, Copy, ShoppingBag } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { toast } from "sonner-native";

export function SaleOrderCard({
    order,
    onPress,
}: {
    order: any,
    onPress?: () => void,
}) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    const totalWeight = order.items?.reduce((s: number, i: any) => s + (i.totalWeight || 0), 0) || 0;
    const totalDoc = order.items?.reduce((s: number, i: any) => s + (i.totalDoc || 0), 0) || 0;
    const farmersCount = order.items?.length || 0;

    const generateCopyText = () => {
        const orderDateStr = format(new Date(order.orderDate), "dd.MM.yy");
        let text = `Date:  ${orderDateStr}\n`;
        text += `Broiler Sale Plan for ${order.branchName || "___"} Branch\n\n`;

        let farmCounter = 1;
        let grandTotalWeight = 0;
        let grandTotalDoc = 0;

        order.items?.forEach((item: any) => {
            const weight = Number(item.totalWeight) || 0;
            const doc = Number(item.totalDoc) || 0;
            if (doc <= 0 && weight <= 0) return;

            text += `${farmCounter}. ${item.farmer.name} \n`;
            if (item.farmer.location) text += `Location: ${item.farmer.location} \n`;
            text += `Total: ${weight} kg.\n`;
            text += `Total: ${doc} PCs \n`;
            if (item.avgWeight) text += `Avg: ${item.avgWeight}kg \n`;
            if (Number(item.age) > 0) text += `Age: ${item.age} days\n`;
            if (item.farmer.mobile) {
                let formattedMobile = item.farmer.mobile;
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

        text += `\nTotal: ${grandTotalWeight} kg  \n`;
        text += `Total Kg : ${grandTotalDoc} PCs \n`;
        text += `\nThanks`;

        return text;
    };

    const handleCopy = () => {
        const text = generateCopyText();
        Clipboard.setStringAsync(text);
        toast.success("Sale order copied to clipboard!");
    };

    return (
        <Pressable onPress={onPress}>
            <Card className="overflow-hidden border border-border/50 bg-card mb-3">
                <View className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 rounded-full items-center justify-center bg-muted">
                                <Icon as={ShoppingBag} size={16} className="text-muted-foreground" />
                            </View>
                            <View>
                                <Text className="font-bold text-base">Sale Order</Text>
                                <Text className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8).toUpperCase()}</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={handleCopy}
                            className="w-8 h-8 rounded-lg bg-primary items-center justify-center active:bg-primary/80"
                        >
                            <Icon as={Copy} size={14} className="text-primary-foreground" />
                        </Pressable>
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
                                <Text className="text-xs font-semibold">{order.branchName}</Text>
                            </View>
                        )}
                    </View>

                    <View className="flex-row items-center justify-between border-t border-border/30 pt-3">
                        <View className="flex-row items-center gap-3">
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Farmers</Text>
                                <Text className="font-black text-foreground">{farmersCount}</Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Weight</Text>
                                <Text className="font-black text-foreground">{totalWeight} <Text className="text-xs font-medium text-muted-foreground">kg</Text></Text>
                            </View>
                            <View>
                                <Text className="text-[10px] text-muted-foreground uppercase tracking-wide">Total DOC</Text>
                                <Text className="font-black text-foreground">{totalDoc} <Text className="text-xs font-medium text-muted-foreground">pcs</Text></Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Pressable
                                onPress={() => setIsExpanded(!isExpanded)}
                                className="flex-row items-center gap-1 px-2 py-1"
                            >
                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {isExpanded ? "Hide Message" : "View Message"}
                                </Text>
                                <Icon as={isExpanded ? ChevronUp : ChevronDown} size={14} className="text-muted-foreground/50" />
                            </Pressable>
                        </View>
                    </View>

                    {isExpanded && (
                        <View className="mt-3 p-3 bg-muted/40 rounded-xl border border-dashed border-border gap-y-3">
                            <View className="flex-row flex-wrap gap-2">
                                {order.items?.map((item: any, idx: number) => (
                                    <Pressable
                                        key={idx}
                                        onPress={() => router.push({ pathname: "/farmer/[id]", params: { id: item.farmer.id } } as any)}
                                        className="bg-primary/5 px-2 py-1 rounded border border-primary/10 active:opacity-70 active:bg-primary/10"
                                    >
                                        <Text className="text-[10px] font-bold text-primary uppercase">{item.farmer.name}</Text>
                                    </Pressable>
                                ))}
                            </View>
                            <Text className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                {generateCopyText()}
                            </Text>
                        </View>
                    )}
                </View>
            </Card>
        </Pressable>
    );
}
