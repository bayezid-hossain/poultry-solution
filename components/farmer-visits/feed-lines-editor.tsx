import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Plus, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

export type FeedLineDraft = { type: string; intake: string; running: string; stock: string };

interface FeedLinesEditorProps {
    lines: FeedLineDraft[];
    onChange: (lines: FeedLineDraft[]) => void;
}

const COLUMNS: { key: "intake" | "running" | "stock"; label: string }[] = [
    { key: "intake", label: "Intake" },
    { key: "running", label: "Running" },
    { key: "stock", label: "Stock" },
];

export function FeedLinesEditor({ lines, onChange }: FeedLinesEditorProps) {
    const update = (index: number, patch: Partial<FeedLineDraft>) =>
        onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

    return (
        <View className="gap-3">
            {lines.map((line, index) => (
                <View key={index} className="rounded-2xl border border-border/50 bg-card p-3 gap-2">
                    <View className="flex-row items-center gap-2">
                        <Input
                            className="flex-1 h-10 font-bold"
                            value={line.type}
                            onChangeText={(t) => update(index, { type: t })}
                            placeholder="Feed type, e.g. B1"
                            maxLength={20}
                            autoCapitalize="characters"
                        />
                        {lines.length > 1 && (
                            <Pressable
                                hitSlop={8}
                                className="w-10 h-10 items-center justify-center rounded-xl active:bg-destructive/10"
                                onPress={() => onChange(lines.filter((_, i) => i !== index))}
                            >
                                <Icon as={Trash2} size={18} className="text-destructive" />
                            </Pressable>
                        )}
                    </View>
                    <View className="flex-row gap-2">
                        {COLUMNS.map((col) => (
                            <View key={col.key} className="flex-1">
                                <Text className="text-[11px] font-semibold text-muted-foreground mb-1">{col.label} (bags)</Text>
                                <Input
                                    className="h-10 text-center"
                                    value={line[col.key]}
                                    onChangeText={(t) => update(index, { [col.key]: t.replace(/[^0-9.]/g, "") })}
                                    keyboardType="decimal-pad"
                                    placeholder="0"
                                />
                            </View>
                        ))}
                    </View>
                </View>
            ))}

            <Pressable
                className="flex-row items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-primary/50 active:bg-primary/10"
                onPress={() => onChange([...lines, { type: "", intake: "", running: "", stock: "" }])}
                disabled={lines.length >= 12}
            >
                <Icon as={Plus} size={16} className="text-primary" />
                <Text className="text-sm font-bold text-primary">Add feed type</Text>
            </Pressable>
        </View>
    );
}
