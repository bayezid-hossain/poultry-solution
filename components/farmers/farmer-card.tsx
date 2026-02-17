import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Bird, MapPin, Phone, Wheat } from "lucide-react-native";
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
        activeBirdsCount: number;
    };
    onPress?: () => void;
}

export function FarmerCard({ farmer, onPress }: FarmerCardProps) {
    return (
        <Card className='mb-4 overflow-hidden border-border/50'>
            <Pressable onPress={onPress} className="active:bg-muted/50">
                <CardContent className='p-4'>
                    <View className='flex-row justify-between items-start mb-3'>
                        <View className='flex-1'>
                            <Text className='font-bold text-lg text-foreground mb-1'>
                                {farmer.name}
                            </Text>
                            <View className='flex-row items-center gap-2'>
                                {farmer.activeCyclesCount > 0 ? (
                                    <Badge variant='default' className='bg-primary/10 border-primary/20'>
                                        <Text className='text-primary text-[10px] font-bold uppercase'>Active</Text>
                                    </Badge>
                                ) : (
                                    <Badge variant='secondary' className='bg-muted'>
                                        <Text className='text-muted-foreground text-[10px] font-bold uppercase'>Idle</Text>
                                    </Badge>
                                )}
                            </View>
                        </View>
                        <View className='items-end'>
                            <View className='flex-row items-center gap-1'>
                                <Icon as={Wheat} size={14} className="text-amber-500" />
                                <Text className='font-bold text-foreground font-mono'>
                                    {Number(farmer.mainStock ?? 0).toFixed(1)}
                                </Text>
                                <Text className='text-[10px] text-muted-foreground'>bags</Text>
                            </View>
                        </View>
                    </View>

                    <View className='space-y-2 mb-3'>
                        {farmer.location && (
                            <View className='flex-row items-center gap-2'>
                                <Icon as={MapPin} size={14} className='text-muted-foreground' />
                                <Text className='text-xs text-muted-foreground flex-1' numberOfLines={1}>
                                    {farmer.location}
                                </Text>
                            </View>
                        )}
                        {farmer.mobile && (
                            <View className='flex-row items-center gap-2'>
                                <Icon as={Phone} size={14} className='text-muted-foreground' />
                                <Text className='text-xs text-muted-foreground'>
                                    {farmer.mobile}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className='flex-row border-t border-border/50 pt-3 gap-4'>
                        <View className='flex-row items-center gap-2'>
                            <Icon as={Bird} size={16} className='text-primary/70' />
                            <View>
                                <Text className='font-bold text-foreground text-sm'>
                                    {farmer.activeCyclesCount} / {farmer.activeCyclesCount + farmer.pastCyclesCount}
                                </Text>
                                <Text className='text-[10px] text-muted-foreground uppercase'>Cycles</Text>
                            </View>
                        </View>

                        {farmer.activeBirdsCount > 0 && (
                            <View className='flex-row items-center gap-2'>
                                <Icon as={Bird} size={16} className='text-emerald-500/70' />
                                <View>
                                    <Text className='font-bold text-foreground text-sm'>
                                        {farmer.activeBirdsCount.toLocaleString()}
                                    </Text>
                                    <Text className='text-[10px] text-muted-foreground uppercase'>Live Birds</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </CardContent>
            </Pressable>
        </Card>
    );
}
