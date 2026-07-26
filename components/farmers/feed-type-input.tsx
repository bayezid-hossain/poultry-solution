import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Pressable, View } from "react-native";

interface FeedTypeInputProps {
    value: string;
    onChangeText: (text: string) => void;
    orgId?: string;
    placeholder?: string;
    className?: string;
}

export function FeedTypeInput({ value, onChangeText, orgId, placeholder = "e.g. B1", className }: FeedTypeInputProps) {
    const [focused, setFocused] = useState(false);

    const { data: suggestions } = trpc.officer.stock.getFeedTypeSuggestions.useQuery(
        { orgId: orgId ?? "" },
        { enabled: !!orgId, staleTime: 5 * 60 * 1000 }
    );

    const filtered = (suggestions ?? [])
        .filter(s => s.toLowerCase().includes(value.trim().toLowerCase()) && s.toLowerCase() !== value.trim().toLowerCase())
        .slice(0, 6);

    return (
        <View>
            <Input
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                className={className}
            />
            {focused && filtered.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mt-2">
                    {filtered.map(s => (
                        <Pressable
                            key={s}
                            onPress={() => onChangeText(s)}
                            className="bg-muted px-2.5 py-1 rounded-lg border border-border active:opacity-70"
                        >
                            <Text className="text-[10px] font-bold text-foreground">{s}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>
    );
}
