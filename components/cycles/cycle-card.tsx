import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useRouter } from "expo-router";
import { Bird, CalendarDays, CircleDashed, MoreHorizontal, Pencil, Power, RotateCcw, ShoppingCart, Skull, Trash2, User, Wheat, Wrench } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, TouchableOpacity, View } from "react-native";

export type CycleAction = 'sell' | 'add_mortality' | 'edit_doc' | 'edit_age' | 'correct_mortality' | 'end_cycle' | 'reopen' | 'delete';

interface CycleCardProps {
    cycle: {
        id: string;
        name: string;
        farmerName?: string;
        officerName?: string | null;
        age: number;
        doc: number;
        mortality: number;
        intake: number;
        birdsSold: number;
        birdType?: string | null;
        status: string;
        createdAt?: string | Date | null;
        endDate?: string | Date | null;
        farmerId?: string;
        farmerMainStock?: number | null;
        farmerProblematicFeed?: number | null;
    };
    onPress?: () => void;
    onAction?: (action: CycleAction, cycle: any) => void;
    isGrouped?: boolean;
}

function formatDate(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
        return '';
    }
}

export function CycleCard({ cycle, onPress, onAction, isGrouped }: CycleCardProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const docValue = Number(cycle.doc || 0);
    const mortalityValue = Number(cycle.mortality || 0);
    const soldValue = Number(cycle.birdsSold || 0);
    const liveBirdsValue = Math.max(0, docValue - mortalityValue - soldValue);
    const feed = Number(cycle.intake ?? 0);
    const mainStock = Number(cycle.farmerMainStock ?? 0);
    const problematicFeed = Number(cycle.farmerProblematicFeed ?? 0);
    const isActive = cycle.status === 'active';

    const cycleName = cycle.farmerName || cycle.name;
    const createdAt = cycle.createdAt;
    const endDate = cycle.endDate;

    const handleAction = (action: CycleAction) => {
        setIsMenuOpen(false);
        if (onAction) {
            onAction(action, cycle);
        }
    };

    return (
        <Card className={`${isGrouped ? 'mb-0 rounded-none border-x-0 border-t-0 border-b border-border/20 last:border-b-0 shadow-none' : 'mb-3 border-border/50 border rounded-2xl shadow-sm'} overflow-hidden pb-0 bg-card`}>
            <Pressable onPress={onPress} className={`active:bg-muted/50 px-3`}>
                {/* Header Area */}
                <View className="flex-row items-start justify-between mb-0">
                    <View className="flex-1 space-y-1">
                        <View className="flex-row items-center flex-wrap gap-1">
                            {!isGrouped && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        if (cycle.farmerId) {
                                            router.push(`/farmer/${cycle.farmerId}` as any);
                                        }
                                    }}
                                >
                                    <Text className="font-bold text-foreground text-sm uppercase mr-1" numberOfLines={1}>
                                        {cycleName}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {soldValue > 0 && (
                                <View className={`flex-row items-center gap-1 px-1.5 py-0.5 rounded ${isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-muted/30 border border-border/50'}`}>
                                    {isActive && (
                                        <View className="animate-spin">
                                            <Icon as={CircleDashed} size={12} className="text-primary" />
                                        </View>
                                    )}
                                    <Text className={`text-[9px] font-bold uppercase ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                        {soldValue} SOLD {isActive ? '• RUNNING' : ''}
                                    </Text>
                                </View>
                            )}

                            {cycle.birdType && (
                                <View className="bg-amber-500/10 border border-amber-500/20 px-1 rounded">
                                    <Text className="text-[9px] font-bold text-amber-600 uppercase">{cycle.birdType}</Text>
                                </View>
                            )}

                            {cycle.status === 'deleted' && (
                                <View className="bg-destructive/10 border border-destructive/20 px-1 py-0.5 rounded">
                                    <Text className="text-[9px] font-bold text-destructive uppercase tracking-tighter">DELETED</Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-center mt-0.5 gap-2">
                            {cycle.officerName && (
                                <View className="flex-row items-center">
                                    <Icon as={User} size={10} className="text-muted-foreground mr-1" />
                                    <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest" numberOfLines={1}>
                                        {cycle.officerName}
                                    </Text>
                                </View>
                            )}
                            {!isActive && (
                                <Text className="text-[10px] text-muted-foreground font-medium">
                                    {formatDate(createdAt)} {endDate ? `- ${formatDate(endDate)}` : ''}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Actions Menu Trigger */}
                    <TouchableOpacity
                        className="p-1 -mr-1 rounded-full"
                        activeOpacity={0.5}
                        onPress={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(true);
                        }}
                    >
                        <Icon as={MoreHorizontal} size={18} className="text-muted-foreground" />
                    </TouchableOpacity>
                </View>

                {/* 4-Column Grid Layout matching mobile-cycle-card */}
                <View className={`flex-row border-y border-border/50 -mx-3 px-3 gap-2 ${isGrouped ? 'py-1.5 mt-0' : 'py-2.5 mt-1'}`}>

                    {/* 1. Age */}
                    <View className="flex-1 justify-center border-r border-border/20 pr-1">
                        <Text className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none mb-1">Age</Text>
                        <View className="flex-row items-baseline gap-0.5">
                            <Text className="text-sm font-bold text-foreground leading-none">{cycle.age}</Text>
                            <Text className="text-[9px] font-normal text-muted-foreground">d</Text>
                        </View>
                    </View>

                    {/* 2. DOC */}
                    <View className="flex-1 justify-center text-center p-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 ml-1">
                        <Text className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-bold uppercase tracking-tight text-center mb-0.5">DOC</Text>
                        <View className="flex-row items-center gap-1 justify-center">
                            <Icon as={Bird} size={14} className="text-emerald-600 dark:text-emerald-500" />
                            <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-500 leading-none">{docValue.toLocaleString()}</Text>
                        </View>
                        <Text className="text-[8px] text-muted-foreground mt-1 font-medium text-center">Live: {liveBirdsValue.toLocaleString()}</Text>
                    </View>

                    {/* 3. Feed */}
                    <View className="flex-1 w-full justify-center text-center rounded-lg bg-amber-500/5 border border-amber-500/10 ">
                        <Text className="text-[9px] text-amber-600/70 dark:text-amber-500/70 font-bold uppercase tracking-tight text-center ">Feed</Text>
                        <View className="flex-row items-center gap-1 justify-center">
                            <Icon as={Wheat} size={12} className="text-amber-500 dark:text-amber-400" />
                            <Text className="text-[13px] font-bold text-amber-600 dark:text-amber-500 leading-none">{feed.toFixed(1)}</Text>
                        </View>
                    </View>
                    {isActive && (
                        <View className="flex-1 w-full justify-center text-center rounded-lg bg-primary/10 border border-primary/20 ml-1 relative">

                            <Text className="text-[9px] text-foreground font-bold uppercase tracking-tight text-center ">Main Stock</Text>
                            <View className="flex-row items-center gap-1 justify-center">
                                <Icon as={Wheat} size={12} className="text-primary" />
                                <Text className="text-[13px] font-bold text-primary leading-none">{mainStock.toFixed(1)}</Text>
                            </View>
                            {problematicFeed > 0 && (
                                <View className="mt-1 items-center">
                                    <View className="bg-red-500 flex-row items-center px-1.5 rounded shadow-sm shadow-red-500/50">
                                        <Text className="text-[10px] text-white font-black tracking-tight text-center">PF - {problematicFeed}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* 4. Deaths */}
                    <View className="flex-1 justify-center items-end pl-1 border-l border-border/20 ml-1.5">
                        <Text className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight leading-none mb-1 text-right">Deaths</Text>
                        {mortalityValue > 0 ? (
                            <View className="bg-destructive/10 px-1.5 py-0.5 rounded-full">
                                <Text className="text-xs font-bold text-destructive leading-none">{mortalityValue}</Text>
                            </View>
                        ) : (
                            <Text className="text-xs font-bold text-muted-foreground/30 leading-none">-</Text>
                        )}
                    </View>

                </View>
            </Pressable>

            {/* Actions Bottom Sheet Modal */}
            <Modal
                transparent
                visible={isMenuOpen}
                animationType="fade"
                onRequestClose={() => setIsMenuOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setIsMenuOpen(false)}
                >
                    <Pressable
                        className="bg-card rounded-t-3xl pb-8 overflow-hidden border-t border-border/50"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="items-center py-4">
                            <View className="w-12 h-1.5 bg-muted rounded-full" />
                        </View>

                        <View className="px-6 pb-2">
                            <Text className="text-lg font-black text-foreground mb-4">Cycle Actions</Text>

                            {isActive ? (
                                <>
                                    <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => handleAction('sell')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={ShoppingCart} size={20} className="text-primary" /></View>
                                        <Text className="text-base font-bold text-foreground">Sell Birds</Text>
                                    </Pressable>
                                    <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => handleAction('add_mortality')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={Skull} size={20} className="text-foreground" /></View>
                                        <Text className="text-base font-medium text-foreground">Add Mortality</Text>
                                    </Pressable>
                                    <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`} onPress={() => soldValue === 0 && handleAction('edit_doc')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={Pencil} size={20} className="text-foreground" /></View>
                                        <Text className="text-base font-medium text-foreground">Edit Initial Birds (DOC)</Text>
                                    </Pressable>
                                    <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`} onPress={() => soldValue === 0 && handleAction('edit_age')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={CalendarDays} size={20} className="text-foreground" /></View>
                                        <Text className="text-base font-medium text-foreground">Edit Age</Text>
                                    </Pressable>
                                    <Pressable className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`} onPress={() => soldValue === 0 && handleAction('correct_mortality')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={Wrench} size={20} className="text-foreground" /></View>
                                        <Text className="text-base font-medium text-foreground">Correct Total Mortality</Text>
                                    </Pressable>
                                    <Pressable className="flex-row items-center py-4 mt-2 active:bg-red-500/10 rounded-xl" onPress={() => handleAction('end_cycle')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={Power} size={20} className="text-destructive" /></View>
                                        <Text className="text-base font-bold text-destructive">End Cycle</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => handleAction('reopen')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={RotateCcw} size={20} className="text-foreground" /></View>
                                        <Text className="text-base font-medium text-foreground">Reopen Cycle</Text>
                                    </Pressable>
                                    <Pressable className="flex-row items-center py-4 mt-2 active:bg-red-500/10 rounded-xl" onPress={() => handleAction('delete')}>
                                        <View className="w-8 items-center justify-center mr-3"><Icon as={Trash2} size={20} className="text-destructive" /></View>
                                        <Text className="text-base font-bold text-destructive">Delete Record</Text>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </Card>
    );
}
