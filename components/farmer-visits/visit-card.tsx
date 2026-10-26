import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatVisitMessage } from "@/lib/farmer-visit";
import * as Clipboard from "expo-clipboard";
import { Copy, Trash2 } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";
import { toast } from "sonner-native";

export type VisitListItem = {
    id: string;
    cycleId: string | null;
    visitDate: string;
    farmerName: string;
    farmerLocation: string | null;
    cycleName: string;
    age: number;
    docCount: number;
    strain: string | null;
    todayMortality: number;
    totalMortality: number;
    avgWeightG: number;
    stdWeightG: number | null;
    avgFcr: string;
    stdFcr: string | null;
    feedLines: { type: string; intake: number; running: number; stock: number }[];
    litter: string;
    disease: string;
    medicine: string;
    suggestions: string;
};

interface VisitCardProps {
    item: VisitListItem;
    onPress: () => void;
    onDelete: () => void;
}

export function VisitCard({ item, onPress, onDelete }: VisitCardProps) {
    const [y, m, d] = item.visitDate.split("-");

    const copy = async () => {
        await Clipboard.setStringAsync(
            formatVisitMessage({
                visitDate: item.visitDate,
                farmerName: item.farmerName,
                farmerLocation: item.farmerLocation,
                docCount: item.docCount,
                strain: item.strain,
                age: item.age,
                todayMortality: item.todayMortality,
                totalMortality: item.totalMortality,
                avgWeightG: item.avgWeightG,
                stdWeightG: item.stdWeightG,
                avgFcr: Number(item.avgFcr),
                stdFcr: item.stdFcr === null ? null : Number(item.stdFcr),
                feedLines: item.feedLines,
                litter: item.litter,
                disease: item.disease,
                medicine: item.medicine,
                suggestions: item.suggestions,
            }),
        );
        toast.success("Report copied");
    };

    const confirmDelete = () =>
        Alert.alert("Delete report", `Delete the ${d}/${m}/${y} visit report for ${item.farmerName}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: onDelete },
        ]);

    return (
        <Pressable
            onPress={onPress}
            disabled={!item.cycleId}
            className={`rounded-2xl border border-border/50 bg-card p-4 gap-3 ${item.cycleId ? "active:bg-muted/50 active:scale-[0.99]" : ""}`}
        >
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                    <Text className="text-base font-black text-foreground" numberOfLines={1}>{item.farmerName}</Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.cycleName}{item.farmerLocation ? `, ${item.farmerLocation}` : ""}
                    </Text>
                </View>
                <View className="bg-primary/10 px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-bold text-primary">{`${d}/${m}/${y}`}</Text>
                </View>
            </View>

            <View className="flex-row gap-2">
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Age</Text>
                    <Text className="text-sm font-black text-foreground">{item.age} d</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Avg wt</Text>
                    <Text className="text-sm font-black text-foreground">{item.avgWeightG} gm</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">FCR</Text>
                    <Text className="text-sm font-black text-foreground">{Number(item.avgFcr).toFixed(3)}</Text>
                </View>
                <View className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
                    <Text className="text-[11px] font-semibold text-muted-foreground">Dead</Text>
                    <Text className="text-sm font-black text-foreground">{item.totalMortality}</Text>
                </View>
            </View>

            <View className="flex-row justify-end gap-2">
                <Pressable className="flex-row items-center gap-1.5 h-9 px-3 rounded-xl border border-border active:bg-accent" onPress={copy}>
                    <Icon as={Copy} size={14} className="text-foreground" />
                    <Text className="text-xs font-bold text-foreground">Copy</Text>
                </Pressable>
                <Pressable className="flex-row items-center gap-1.5 h-9 px-3 rounded-xl border border-destructive/40 active:bg-destructive/10" onPress={confirmDelete}>
                    <Icon as={Trash2} size={14} className="text-destructive" />
                    <Text className="text-xs font-bold text-destructive">Delete</Text>
                </Pressable>
            </View>
        </Pressable>
    );
}
