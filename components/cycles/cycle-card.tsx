import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Bird, ChevronRight, RotateCcw, Skull, Trash2, Wheat } from "lucide-react-native";
import { Pressable, View } from "react-native";

interface CycleCardProps {
    cycle: {
        id: string;
        name: string;
        farmerName?: string;
        age: number;
        doc: number;
        mortality: number;
        intake: number;
        birdsSold: number;
        birdType?: string | null;
        status: string;
    };
    onPress?: () => void;
    onReopen?: () => void;
    onDelete?: () => void;
}

export function CycleCard({ cycle, onPress, onReopen, onDelete }: CycleCardProps) {
    const liveBirds = Math.max(0, cycle.doc - cycle.mortality - (cycle.birdsSold || 0));

    return (
        <Card className="mb-3 overflow-hidden border-border/50">
            <Pressable onPress={onPress} className="active:bg-muted/50">
                <CardContent className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                        <View className="flex-1 pr-2">
                            <View className="flex-row items-center gap-2 flex-wrap mb-1">
                                <Text className="font-bold text-base text-foreground">
                                    {cycle.name || cycle.farmerName}
                                </Text>
                                {cycle.status === 'active' && (
                                    <Badge variant="outline" className="border-primary py-0 px-1.5 h-4">
                                        <Text className="text-primary text-[8px] font-bold uppercase">Active</Text>
                                    </Badge>
                                )}
                                {cycle.birdType && (
                                    <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 py-0 px-1.5 h-4">
                                        <Text className="text-amber-600 text-[8px] font-bold uppercase">{cycle.birdType}</Text>
                                    </Badge>
                                )}
                            </View>
                            {cycle.birdsSold > 0 && (
                                <Badge variant="outline" className="self-start bg-emerald-500/10 border-emerald-500/20 py-0 px-1.5 h-4">
                                    <Text className="text-emerald-600 text-[8px] font-bold uppercase">{cycle.birdsSold} Sold</Text>
                                </Badge>
                            )}
                        </View>
                        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                    </View>

                    <View className="flex-row border-y border-border/50 py-3">
                        <View className="flex-1 items-center justify-center border-r border-border/30">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Age</Text>
                            <View className="flex-row items-baseline gap-0.5">
                                <Text className="font-bold text-lg text-foreground">{cycle.age}</Text>
                                <Text className="text-[10px] text-muted-foreground">d</Text>
                            </View>
                        </View>

                        <View className="flex-1 items-center justify-center border-r border-border/30">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">DOC</Text>
                            <View className="flex-row items-center gap-1">
                                <Icon as={Bird} size={14} className="text-primary/70" />
                                <Text className="font-bold text-lg text-foreground">{cycle.doc.toLocaleString()}</Text>
                            </View>
                            <Text className="text-[8px] text-muted-foreground font-medium">Live: {liveBirds.toLocaleString()}</Text>
                        </View>

                        <View className="flex-1 items-center justify-center border-r border-border/30">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Feed</Text>
                            <View className="flex-row items-center gap-1">
                                <Icon as={Wheat} size={14} className="text-amber-500/70" />
                                <Text className="font-bold text-lg text-amber-600">{Number(cycle.intake ?? 0).toFixed(1)}</Text>
                            </View>
                        </View>

                        <View className="flex-1 items-center justify-center">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Deaths</Text>
                            <View className="flex-row items-center gap-1">
                                <Icon as={Skull} size={14} className={cycle.mortality > 0 ? "text-destructive" : "text-muted-foreground/30"} />
                                <Text className={`font-bold text-lg ${cycle.mortality > 0 ? "text-destructive" : "text-muted-foreground/30"}`}>
                                    {cycle.mortality || "-"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {(onReopen || onDelete) && (
                        <View className="flex-row gap-2 mt-3 pt-3 border-t border-border/50">
                            {onReopen && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 flex-row gap-2 h-10 border-amber-500/20 bg-amber-500/5"
                                    onPress={onReopen}
                                >
                                    <Icon as={RotateCcw} size={14} className="text-amber-600" />
                                    <Text className="text-amber-600 font-bold text-xs uppercase">Reopen Cycle</Text>
                                </Button>
                            )}
                            {onDelete && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-none w-10 h-10 p-0 border-destructive/20 bg-destructive/5"
                                    onPress={onDelete}
                                >
                                    <Icon as={Trash2} size={14} className="text-destructive" />
                                </Button>
                            )}
                        </View>
                    )}
                </CardContent>
            </Pressable>
        </Card>
    );
}
