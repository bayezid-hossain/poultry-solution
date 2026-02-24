import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { AlertCircle, ArrowRightLeft, Bird, RotateCcw, Trash2, Wheat, Wrench } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";

interface FarmerCardProps {
    farmer: {
        id: string;
        name: string;
        location?: string | null;
        mobile?: string | null;
        activeCyclesCount: number;
        pastCyclesCount: number;
        mainStock: number;
        totalConsumed?: number;
        activeBirdsCount: number;
        createdAt?: string | Date;
    };
    activeConsumption?: number;
    onPress?: () => void;
    onRestock?: () => void;
    onTransfer?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    onRestore?: () => void;
}

export function FarmerCard({
    farmer,
    onPress,
    onRestock,
    onTransfer,
    onDelete,
    onEdit,
    onRestore,
    activeConsumption
}: FarmerCardProps) {
    const router = useRouter();
    const mainStock = Number(farmer.mainStock ?? 0);
    const totalConsumed = activeConsumption ?? Number(farmer.totalConsumed ?? 0);
    const availableStock = mainStock - totalConsumed;
    const remaining = availableStock; // 'remaining' now refers to availableStock
    const isLow = remaining < 3;

    return (
        <Pressable onPress={onPress}>
            <Card className='mb-1 overflow-hidden border-border/50 bg-card p-1'>
                <CardContent className='p-1'>
                    {/* Header Area */}
                    <View className='flex-row justify-between items-center mb-1'>
                        <View className='flex-row items-center gap-2 flex-1'>
                            <Pressable
                                className="flex-1 active:opacity-70"
                                onPress={(e) => {
                                    e.stopPropagation();
                                    router.push({ pathname: "/farmer/[id]", params: { id: farmer.id } } as any);
                                }}
                            >
                                <Text className='font-black text-lg text-foreground uppercase tracking-tight active:text-primary' numberOfLines={2}>
                                    {farmer.name}
                                </Text>
                            </Pressable>
                            {(!farmer.location || !farmer.mobile) && (
                                <Pressable
                                    onPress={() => Alert.alert("Missing Info", "This farmer is missing location or mobile number.")}
                                    className="p-1"
                                >
                                    <Icon as={AlertCircle} size={16} className="text-destructive" />
                                </Pressable>
                            )}
                            <View className="flex-row items-center gap-2 ml-1">
                                <Pressable
                                    onPress={onEdit}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Wrench} size={18} className="text-foreground" />
                                </Pressable>
                                <Pressable
                                    onPress={onDelete}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Trash2} size={18} className="text-foreground" />
                                </Pressable>
                                <Badge variant='outline' className={`${farmer.activeCyclesCount > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/50 border-border"} h-6 px-2 rounded-md`}>
                                    <Text className={`${farmer.activeCyclesCount > 0 ? "text-emerald-500" : "text-muted-foreground"} text-[10px] font-bold uppercase`}>
                                        {farmer.activeCyclesCount > 0 ? "Active" : "Idle"}
                                    </Text>
                                </Badge>
                            </View>
                        </View>

                        <View className='flex-row items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50'>
                            <Icon as={Bird} size={16} className="text-primary" />
                            <Text className='text-foreground font-bold text-sm'>
                                {farmer.activeCyclesCount} / {farmer.pastCyclesCount}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View className="flex-row gap-2 mb-3">
                        {/* Stock Card */}
                        <View className="flex-1 bg-muted/30 border border-border p-2.5 rounded-xl h-20 justify-between">
                            <Text className="text-muted-foreground text-[9px] font-black uppercase tracking-widest">Stock</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Wheat} size={16} className="text-red-400" />
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-xl font-black text-red-500">{availableStock.toFixed(1)}</Text>
                                    <Text className="text-[10px] text-muted-foreground/60 font-bold lowercase">b</Text>
                                </View>
                            </View>
                        </View>

                        {/* Used Card */}
                        <View className="flex-1 bg-orange-500/5 border border-orange-500/10 p-2.5 rounded-xl h-20 justify-between">
                            <Text className="text-orange-500/60 text-[9px] font-black uppercase tracking-widest">Used</Text>
                            <View className="flex-row items-center">
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-xl font-black text-orange-500">{totalConsumed.toFixed(1)}</Text>
                                    <Text className="text-[10px] text-orange-500/40 font-bold lowercase">b</Text>
                                </View>
                            </View>
                        </View>

                        {/* Total Card */}
                        <View className="flex-1 bg-primary p-2.5 rounded-xl h-20 justify-between shadow-sm shadow-primary/20">
                            <Text className="text-primary-foreground/60 text-[9px] font-black uppercase tracking-widest text-right">Total</Text>
                            <View className="flex-row items-baseline justify-end gap-1">
                                <Text className="text-xl font-black text-primary-foreground">{mainStock.toFixed(1)}</Text>
                                <Text className="text-[10px] text-primary-foreground/40 font-bold lowercase">b</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    {onRestore ? (
                        <Pressable
                            onPress={onRestore}
                            className="flex-row items-center justify-center gap-2 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl active:bg-emerald-500/20 mb-3"
                        >
                            <Icon as={RotateCcw} size={16} className="text-emerald-600" />
                            <Text className="text-emerald-600 font-bold text-sm">Restore Farmer</Text>
                        </Pressable>
                    ) : (
                        <View className="flex-row gap-2 mb-3">
                            <Pressable
                                onPress={onTransfer}
                                className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-muted/40 border border-border rounded-xl active:bg-muted"
                            >
                                <Icon as={ArrowRightLeft} size={16} className="text-muted-foreground" />
                                <Text className="text-foreground font-bold text-sm">Transfer</Text>
                            </Pressable>
                            <Pressable
                                onPress={onRestock}
                                className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-muted/40 border border-border rounded-xl active:bg-muted"
                            >
                                <Icon as={Wheat} size={16} className="text-muted-foreground" />
                                <Text className="text-foreground font-bold text-sm">Restock</Text>
                            </Pressable>
                        </View>
                    )}
                </CardContent>
            </Card>
        </Pressable >
    );
}
