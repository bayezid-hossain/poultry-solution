import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Info, Pencil } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { toast } from "sonner-native";

interface StockDistributionChipsProps {
    data?: { byType: { feedType: string; amount: number }[]; unspecified: number; total: number } | null;
    isLoading?: boolean;
    className?: string;
    /** When provided, shows an "Edit" pill that jumps to where the underlying logs can be retagged. */
    onEditPress?: () => void;
}

export function StockDistributionChips({ data, isLoading, className, onEditPress }: StockDistributionChipsProps) {
    if (isLoading || !data) return null;

    const { byType, unspecified, total } = data;
    if (byType.length === 0 && unspecified === 0) return null;

    return (
        <View className={`flex-row flex-wrap items-center gap-1.5 ${className ?? ""}`}>
            {byType.map(t => (
                <View key={t.feedType} className="bg-muted/50 px-2 py-1 rounded-md border border-border/40">
                    <Text className="text-[10px] font-bold text-foreground">
                        {t.feedType} · {t.amount.toFixed(1)}
                    </Text>
                </View>
            ))}
            {unspecified !== 0 && (
                <View className="bg-muted/30 px-2 py-1 rounded-md border border-dashed border-border/40">
                    <Text className="text-[10px] font-bold text-muted-foreground">
                        Unspecified · {unspecified.toFixed(1)}
                    </Text>
                </View>
            )}
            <View className="bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                <Text className="text-[10px] font-black text-primary">
                    Total · {Number(total).toFixed(1)}
                </Text>
            </View>
            <Pressable
                onPress={() => toast.info("Unspecified includes untyped entries and feed consumption, which isn't tracked per type.")}
                className="w-5 h-5 items-center justify-center"
            >
                <Icon as={Info} size={12} className="text-muted-foreground" />
            </Pressable>
            {onEditPress && (
                <Pressable
                    onPress={onEditPress}
                    className="flex-row items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 active:opacity-70"
                >
                    <Icon as={Pencil} size={10} className="text-blue-500" />
                    <Text className="text-[10px] font-bold text-blue-500">Edit</Text>
                </Pressable>
            )}
        </View>
    );
}
