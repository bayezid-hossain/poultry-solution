import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { CalendarIcon, MapPin, Phone, Plus, X } from "lucide-react-native";
import { Control, Controller, UseFieldArrayReturn } from "react-hook-form";
import { View } from "react-native";

// --- Farmer Info Header ---

interface FarmerInfoHeaderProps {
    farmerName: string;
    farmerLocation?: string | null;
    farmerMobile?: string | null;
    cycleAge: number;
    colorScheme?: "blue" | "orange";
}

export const FarmerInfoHeader = ({
    farmerName,
    farmerLocation,
    farmerMobile,
    cycleAge,
    colorScheme = "blue",
}: FarmerInfoHeaderProps) => {
    const isBlue = colorScheme === "blue";

    return (
        <View className={`p-4 rounded-2xl border ${isBlue ? 'bg-blue-500/5 border-blue-500/10' : 'bg-orange-500/5 border-orange-500/10'}`}>
            <View className="items-center">
                <Text className={`text-xl font-bold text-center ${isBlue ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                    {farmerName}
                </Text>

                <View className="flex-row flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-2">
                    {farmerLocation && (
                        <View className="flex-row items-center gap-1.5">
                            <Icon as={MapPin} size={13} className="text-muted-foreground/60" />
                            <Text className="text-sm font-medium text-muted-foreground">{farmerLocation}</Text>
                        </View>
                    )}
                    {farmerMobile && (
                        <View className="flex-row items-center gap-1.5">
                            <Icon as={Phone} size={13} className="text-muted-foreground/60" />
                            <Text className="text-sm font-medium text-muted-foreground">{farmerMobile}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View className="mt-4 flex-row items-center justify-center">
                <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-background/50 rounded-full">
                    <Icon as={CalendarIcon} size={14} className="text-muted-foreground" />
                    <Text className="text-sm font-bold text-foreground">Age: {cycleAge} days</Text>
                </View>
            </View>
        </View>
    );
};


// --- Feed Field Array ---

interface FeedFieldArrayProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: Control<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldArray: UseFieldArrayReturn<any, any, any>;
    namePrefix: "feedConsumed" | "feedStock";
    label: string;
    description?: string;
    onBagsChange?: (index: number, bags: number) => void;
    showRemoveOnSingle?: boolean;
}

export const FeedFieldArray = ({
    control,
    fieldArray,
    namePrefix,
    label,
    description,
    onBagsChange,
    showRemoveOnSingle = false,
}: FeedFieldArrayProps) => {
    const canRemove = showRemoveOnSingle || fieldArray.fields.length > 1;

    return (
        <View className="gap-3">
            <View className="ml-1">
                <Text className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</Text>
                {description && (
                    <Text className="text-xs text-muted-foreground mt-0.5">{description}</Text>
                )}
            </View>

            <View className="gap-2">
                {fieldArray.fields.map((field, index) => (
                    <View key={field.id} className="flex-row gap-2 items-center">
                        <View className="flex-[2]">
                            <Controller
                                control={control}
                                name={`${namePrefix}.${index}.type` as const}
                                render={({ field: { onChange, value } }) => (
                                    <View className="space-y-1">
                                        <Input
                                            placeholder="Type (B1, B2...)"
                                            value={value}
                                            onChangeText={onChange}
                                            className="h-12 bg-muted/30 border-border/50"
                                            returnKeyType="next"
                                        />
                                    </View>
                                )}
                            />
                        </View>
                        <View className="flex-1 min-w-[80px]">
                            <Controller
                                control={control}
                                name={`${namePrefix}.${index}.bags` as const}
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        placeholder="Bags"
                                        keyboardType="number-pad"
                                        value={value?.toString() || ""}
                                        onChangeText={(text) => {
                                            const num = parseInt(text, 10) || 0;
                                            onChange(num);
                                            onBagsChange?.(index, num);
                                        }}
                                        className="h-12 bg-muted/30 border-border/50 font-mono text-center"
                                        returnKeyType="next"
                                    />
                                )}
                            />
                        </View>
                        {canRemove && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onPress={() => fieldArray.remove(index)}
                                className="h-12 w-12 shrink-0 bg-destructive/5 rounded-xl border border-destructive/20"
                            >
                                <Icon as={X} size={18} className="text-destructive" />
                            </Button>
                        )}
                    </View>
                ))}
            </View>

            <Button
                variant="outline"
                className="w-full h-12 flex-row gap-2 border-dashed border-primary/30 bg-primary/5 rounded-xl mt-2"
                onPress={() => fieldArray.append({ type: "", bags: 0 })}
            >
                <Icon as={Plus} size={16} className="text-primary" />
                <Text className="text-primary font-bold">
                    Add {namePrefix === "feedConsumed" ? "Feed Type" : "Stock Type"}
                </Text>
            </Button>
        </View>
    );
};


// --- Sale Metrics Bar ---

interface SaleMetricsBarProps {
    avgWeight: string;
    totalAmount: string;
}

export const SaleMetricsBar = ({ avgWeight, totalAmount }: SaleMetricsBarProps) => (
    <View className="flex-row gap-4 p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 shadow-sm shadow-emerald-500/5">
        <View className="flex-1">
            <Text className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70 tracking-wider mb-2">Avg Weight</Text>
            <View className="flex-row items-baseline gap-1.5">
                <Text className="font-mono font-bold text-3xl text-foreground">{avgWeight}</Text>
                <Text className="text-xs text-muted-foreground font-bold uppercase">kg</Text>
            </View>
        </View>
        <View className="w-[1px] bg-emerald-500/10 my-1" />
        <View className="flex-[1.5] ml-2">
            <Text className="text-[10px] uppercase font-bold text-emerald-600/70 dark:text-emerald-400/70 tracking-wider mb-2">Total Amount</Text>
            <View className="flex-row items-baseline gap-1">
                <Text className="font-mono font-bold text-3xl text-emerald-600 dark:text-emerald-400">৳{totalAmount}</Text>
            </View>
        </View>
    </View>
);
