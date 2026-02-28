import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import {
    AlertCircle,
    ArrowRightLeft,
    Bird,
    RotateCcw,
    Trash2,
    Wheat,
    Wrench,
} from "lucide-react-native";
import { Alert, Pressable, TouchableOpacity, View } from "react-native";

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
        problematicFeed?: string | number | null;
        lastCycleEndDate?: string | Date | null;
    };
    activeConsumption?: number;
    onRestock?: () => void;
    onTransfer?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    onRestore?: () => void;
}

export function FarmerCard({
    farmer,
    onRestock,
    onTransfer,
    onDelete,
    onEdit,
    onRestore,
    activeConsumption,
}: FarmerCardProps) {
    const router = useRouter();

    const mainStock = Number(farmer.mainStock ?? 0);
    const totalConsumed =
        activeConsumption ?? Number(farmer.totalConsumed ?? 0);
    const availableStock = mainStock - totalConsumed;
    const isLow = availableStock < 3;

    const handleNavigate = () => {
        router.push(`/farmer/${farmer.id}` as any);
    };

    const idleDays =
        farmer.activeCyclesCount === 0 && farmer.lastCycleEndDate
            ? (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const end = new Date(farmer.lastCycleEndDate);
                end.setHours(0, 0, 0, 0);
                return Math.max(0, Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)));
            })()
            : null;

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={handleNavigate}>
            <Card className="mb-2 overflow-hidden border-border/50 bg-card p-1">
                <CardContent className="p-2">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center justify-between flex-1 pr-2">
                            <View className="max-w-[48%]">
                                <Text
                                    className="font-black text-lg text-foreground uppercase tracking-tight"
                                    numberOfLines={4}
                                >
                                    {farmer.name}
                                </Text>
                            </View>

                            <View className="flex-row flex-wrap justify-center items-center gap-2 max-w-[50%]">
                                {(!farmer.location || !farmer.mobile) && (
                                    <Pressable
                                        onPress={() =>
                                            Alert.alert(
                                                "Missing Info",
                                                "This farmer is missing location or mobile number."
                                            )
                                        }
                                        className="p-1"
                                    >
                                        <Icon
                                            as={AlertCircle}
                                            size={16}
                                            className="text-destructive"
                                        />
                                    </Pressable>
                                )}

                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onEdit?.();
                                    }}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Wrench} size={18} className="text-foreground" />
                                </Pressable>

                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onDelete?.();
                                    }}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Trash2} size={18} className="text-foreground" />
                                </Pressable>

                                <Badge
                                    variant="outline"
                                    className={`${farmer.activeCyclesCount > 0
                                        ? "bg-emerald-500/10 border-emerald-500/20"
                                        : "bg-muted/50 border-border"
                                        } h-6 px-2 rounded-md mb-1`}
                                >
                                    <Text
                                        className={`${farmer.activeCyclesCount > 0
                                            ? "text-emerald-500"
                                            : "text-muted-foreground"
                                            } text-[10px] font-bold uppercase`}
                                    >
                                        {farmer.activeCyclesCount > 0 ? "Active" : idleDays !== null ? `Idle · ${idleDays}d` : "Idle · New"}
                                    </Text>
                                </Badge>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                            <Icon as={Bird} size={16} className="text-primary" />
                            <Text className="text-foreground font-bold text-sm">
                                {farmer.activeCyclesCount} / {farmer.pastCyclesCount}
                            </Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-2 mb-3">
                        {/* Available */}
                        <View className="flex-1 bg-muted/30 border border-border p-2.5 rounded-xl h-20 justify-between">
                            <Text className="text-muted-foreground text-[9px] font-black uppercase tracking-widest">
                                Stock
                            </Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon
                                    as={Wheat}
                                    size={16}
                                    className={isLow ? "text-red-400" : "text-emerald-500"}
                                />
                                <View className="flex-row items-baseline gap-1">
                                    <Text
                                        className={`text-xl font-black ${isLow ? "text-red-500" : "text-emerald-500"
                                            }`}
                                    >
                                        {availableStock.toFixed(1)}
                                    </Text>
                                    <Text className="text-[10px] text-muted-foreground/60 font-bold lowercase">
                                        b
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Used */}
                        <View className="flex-1 bg-orange-500/5 border border-orange-500/10 p-2.5 rounded-xl h-20 justify-between">
                            <Text className="text-orange-500/60 text-[9px] font-black uppercase tracking-widest">
                                Used
                            </Text>
                            <View className="flex-row items-baseline gap-1">
                                <Text className="text-xl font-black text-orange-500">
                                    {totalConsumed.toFixed(1)}
                                </Text>
                                <Text className="text-[10px] text-orange-500/40 font-bold lowercase">
                                    b
                                </Text>
                            </View>
                        </View>

                        {/* Total */}
                        <View className="flex-1 bg-primary/80 p-2.5 rounded-xl h-20 justify-between shadow-sm shadow-primary/20">
                            <Text className="text-primary-foreground/60 text-[9px] font-black uppercase tracking-widest text-right">
                                Total
                            </Text>
                            <View className="flex-row justify-between gap-1">

                                <View className="flex flex-row items-baseline">
                                    <Text className="text-xl font-black gap-x-1 text-primary-foreground">{mainStock.toFixed(1)}</Text>
                                    <Text className="text-[10px] ml-[2px] text-primary-foreground/40 font-bold lowercase">
                                        b
                                    </Text>
                                </View>

                                {Number(farmer.problematicFeed) > 0 && (
                                    <Badge variant="destructive" className=" px-1 bg-red-500 mr-1 border-0 rounded-sm">
                                        <Text className="text-[10px] font-black text-white">PF - {Number(farmer.problematicFeed)}</Text>
                                    </Badge>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Actions */}
                    {onRestore ? (
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                onRestore();
                            }}
                            className="flex-row items-center justify-center gap-2 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl active:bg-emerald-500/20"
                        >
                            <Icon as={RotateCcw} size={16} className="text-emerald-600" />
                            <Text className="text-emerald-600 font-bold text-sm">
                                Restore Farmer
                            </Text>
                        </Pressable>
                    ) : (
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onTransfer?.();
                                }}
                                className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-muted/40 border border-border rounded-xl active:bg-muted"
                            >
                                <Icon
                                    as={ArrowRightLeft}
                                    size={16}
                                    className="text-muted-foreground"
                                />
                                <Text className="text-foreground font-bold text-sm">
                                    Transfer
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onRestock?.();
                                }}
                                className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-muted/40 border border-border rounded-xl active:bg-muted"
                            >
                                <Icon as={Wheat} size={16} className="text-muted-foreground" />
                                <Text className="text-foreground font-bold text-sm">
                                    Restock
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </CardContent>
            </Card>
        </TouchableOpacity>
    );
}