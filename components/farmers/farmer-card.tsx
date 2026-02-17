import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { ArrowRight, ArrowRightLeft, Bird, Trash2, Wheat, Wrench } from "lucide-react-native";
import { Pressable, View } from "react-native";

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
    onPress?: () => void;
    onRestock?: () => void;
    onTransfer?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
}

export function FarmerCard({
    farmer,
    onPress,
    onRestock,
    onTransfer,
    onDelete,
    onEdit
}: FarmerCardProps) {
    const totalSupplied = (Number(farmer.mainStock ?? 0) + Number(farmer.totalConsumed ?? 0));
    const joinedDate = farmer.createdAt ? format(new Date(farmer.createdAt), "dd/MM/yyyy") : "N/A";

    return (
        <Pressable onPress={onPress}>
            <Card className='mb-4 overflow-hidden border-border/50 bg-[#121212]'>
                <CardContent className='p-5'>
                    {/* Header Area */}
                    <View className='flex-row justify-between items-center mb-5'>
                        <View className='flex-row items-center gap-2 flex-1'>
                            <Text className='font-black text-xl text-white uppercase tracking-tight'>
                                {farmer.name}
                            </Text>
                            <View className="flex-row items-center gap-2 ml-1">
                                <Pressable
                                    onPress={onEdit}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Wrench} size={18} className="text-white" />
                                </Pressable>
                                <Pressable
                                    onPress={onDelete}
                                    className="opacity-60 active:opacity-100"
                                >
                                    <Icon as={Trash2} size={18} className="text-white" />
                                </Pressable>
                                <Badge variant='secondary' className='bg-[#222] border-0 h-6 px-2 rounded-md'>
                                    <Text className='text-muted-foreground text-[10px] font-bold uppercase'>
                                        {farmer.activeCyclesCount > 0 ? "Active" : "Idle"}
                                    </Text>
                                </Badge>
                            </View>
                        </View>

                        <View className='flex-row items-center gap-1.5'>
                            <Icon as={Bird} size={18} className="text-white/80" />
                            <Text className='text-white font-black text-lg'>
                                {farmer.activeCyclesCount} / {farmer.activeCyclesCount + farmer.pastCyclesCount}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View className="flex-row gap-2.5 mb-5">
                        {/* Stock Card */}
                        <View className="flex-1 bg-[#1A1A1A] border border-white/5 p-3 rounded-2xl h-24 justify-between">
                            <Text className="text-white/40 text-[10px] font-black uppercase tracking-widest">Stock</Text>
                            <View className="flex-row items-center gap-1.5">
                                <Icon as={Wheat} size={20} className="text-red-400" />
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-2xl font-black text-red-500">{Number(farmer.mainStock ?? 0).toFixed(1)}</Text>
                                    <Text className="text-[10px] text-white/30 font-bold lowercase">b</Text>
                                </View>
                            </View>
                        </View>

                        {/* Used Card */}
                        <View className="flex-1 bg-[#231508] border border-orange-500/10 p-3 rounded-2xl h-24 justify-between">
                            <Text className="text-orange-500/60 text-[10px] font-black uppercase tracking-widest">Used</Text>
                            <View className="flex-row items-center">
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-2xl font-black text-orange-500">{Number(farmer.totalConsumed ?? 0).toFixed(1)}</Text>
                                    <Text className="text-[10px] text-orange-500/40 font-bold lowercase">b</Text>
                                </View>
                            </View>
                        </View>

                        {/* Total Card */}
                        <View className="flex-1 bg-white p-3 rounded-2xl h-24 justify-between">
                            <Text className="text-black/40 text-[10px] font-black uppercase tracking-widest text-right">Total</Text>
                            <View className="flex-row items-baseline justify-end gap-1">
                                <Text className="text-2xl font-black text-black">{totalSupplied.toFixed(1)}</Text>
                                <Text className="text-[10px] text-black/40 font-bold lowercase">b</Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View className="flex-row gap-3 mb-5">
                        <Pressable
                            onPress={onTransfer}
                            className="flex-1 flex-row items-center justify-center gap-2 h-14 bg-[#1A1A1A] border border-white/5 rounded-2xl active:bg-white/5"
                        >
                            <Icon as={ArrowRightLeft} size={18} className="text-white/60" />
                            <Text className="text-white/80 font-bold text-base">Transfer</Text>
                        </Pressable>
                        <Pressable
                            onPress={onRestock}
                            className="flex-1 flex-row items-center justify-center gap-2 h-14 bg-[#1A1A1A] border border-white/5 rounded-2xl active:bg-white/5"
                        >
                            <Icon as={Wheat} size={18} className="text-white/60" />
                            <Text className="text-white/80 font-bold text-base">Restock</Text>
                        </Pressable>
                    </View>

                    {/* Footer */}
                    <View className="flex-row justify-between items-center border-t border-white/5 pt-4">
                        <Text className="text-white/40 text-xs font-medium">Joined {joinedDate}</Text>
                        <Pressable
                            onPress={onPress}
                            className="flex-row items-center gap-1.5"
                        >
                            <Text className="text-white font-black text-sm">View</Text>
                            <Icon as={ArrowRight} size={14} className="text-white" />
                        </Pressable>
                    </View>
                </CardContent>
            </Card>
        </Pressable>
    );
}
