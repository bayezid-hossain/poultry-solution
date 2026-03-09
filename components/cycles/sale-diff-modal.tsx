import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { ArrowRight, ChevronDown, ChevronUp, Minus } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

interface DiffField {
    label: string;
    before: string | number | null | undefined;
    after: string | number | null | undefined;
    /** "number" = compare numerically, "date" = format as date, "text" = plain text */
    type?: "number" | "date" | "text";
    /** If true, a decrease is good (e.g. mortality) */
    invertColor?: boolean;
    /** Unit suffix to display */
    unit?: string;
}

interface SaleDiffModalProps {
    visible: boolean;
    title?: string;
    description?: string;
    fields: DiffField[];
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    destructive?: boolean;
}

function formatValue(val: string | number | null | undefined, type: string, unit?: string): string {
    if (val === null || val === undefined || val === "") return "—";
    if (type === "date") {
        try {
            return format(new Date(val), "dd MMM yyyy");
        } catch {
            return String(val);
        }
    }
    if (type === "number") {
        const n = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(n as number)) return String(val);
        return `${(n as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
    }
    return `${String(val)}${unit ? ` ${unit}` : ""}`;
}

function getDiff(before: any, after: any, type: string): number {
    if (type !== "number") return 0;
    const b = typeof before === "string" ? parseFloat(before) : (before ?? 0);
    const a = typeof after === "string" ? parseFloat(after) : (after ?? 0);
    if (isNaN(b) || isNaN(a)) return 0;
    return a - b;
}

export function SaleDiffModal({
    visible,
    title = "Review Changes",
    description,
    fields,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isLoading = false,
    destructive = false,
}: SaleDiffModalProps) {
    const hasChanges = fields.some(f => {
        const b = String(f.before ?? "");
        const a = String(f.after ?? "");
        return b !== a;
    });

    return (
        <BottomSheetModal open={visible} onOpenChange={(v) => !v && onCancel()}>
            <ScrollView className="max-h-[500px]" contentContainerClassName="p-5 pb-8">
                {/* Title */}
                <Text className="text-lg font-black text-center text-foreground mb-1">
                    {title}
                </Text>
                {description && (
                    <Text className="text-xs text-muted-foreground text-center mb-4 leading-4">
                        {description}
                    </Text>
                )}

                {!hasChanges && (
                    <View className="p-4 bg-muted/30 rounded-xl border border-border/50 items-center mb-4">
                        <Text className="text-sm text-muted-foreground font-medium">No changes detected</Text>
                    </View>
                )}

                {hasChanges && (
                    <View className="rounded-xl border border-border/50 overflow-hidden mb-4">
                        {/* Table Header */}
                        <View className="flex-row bg-muted/40 px-3 py-2 border-b border-border/30">
                            <View className="flex-[2]">
                                <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Field</Text>
                            </View>
                            <View className="flex-[2] items-center">
                                <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Before</Text>
                            </View>
                            <View className="w-5" />
                            <View className="flex-[2] items-center">
                                <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">After</Text>
                            </View>
                        </View>

                        {/* Rows */}
                        {fields.map((field, idx) => {
                            const type = field.type || "text";
                            const beforeStr = formatValue(field.before, type, field.unit);
                            const afterStr = formatValue(field.after, type, field.unit);
                            const changed = beforeStr !== afterStr;
                            const diff = getDiff(field.before, field.after, type);
                            const isPositive = field.invertColor ? diff < 0 : diff > 0;
                            const isNegative = field.invertColor ? diff > 0 : diff < 0;

                            return (
                                <View
                                    key={field.label}
                                    className={`flex-row items-center px-3 py-2.5 ${changed ? "bg-primary/5" : "bg-card"
                                        } ${idx < fields.length - 1 ? "border-b border-border/20" : ""}`}
                                >
                                    <View className="flex-[2]">
                                        <Text className={`text-xs font-bold ${changed ? "text-foreground" : "text-muted-foreground/60"}`}>
                                            {field.label}
                                        </Text>
                                    </View>
                                    <View className="flex-[2] items-center">
                                        <Text className={`text-xs font-mono ${changed ? "text-muted-foreground line-through" : "text-muted-foreground/60"}`}>
                                            {beforeStr}
                                        </Text>
                                    </View>
                                    <View className="w-5 items-center">
                                        {changed ? (
                                            <Icon as={ArrowRight} size={10} className="text-muted-foreground" />
                                        ) : (
                                            <Icon as={Minus} size={8} className="text-muted-foreground/30" />
                                        )}
                                    </View>
                                    <View className="flex-[2] items-center flex-row justify-center gap-1">
                                        <Text className={`text-xs font-mono font-bold ${changed
                                            ? isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-blue-600"
                                            : "text-muted-foreground/60"
                                            }`}>
                                            {afterStr}
                                        </Text>
                                        {changed && diff !== 0 && (
                                            <Icon
                                                as={diff > 0 ? ChevronUp : ChevronDown}
                                                size={10}
                                                className={isPositive ? "text-emerald-500" : "text-red-400"}
                                            />
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Buttons */}
                <View className="flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-2xl"
                        onPress={onCancel}
                        disabled={isLoading}
                    >
                        <Text className="font-bold text-xs uppercase tracking-wider">{cancelText}</Text>
                    </Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        className={`flex-1 h-12 rounded-2xl ${!destructive ? "bg-emerald-600 active:bg-emerald-700" : ""}`}
                        onPress={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="font-bold text-xs uppercase tracking-wider text-white">{confirmText}</Text>
                        )}
                    </Button>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
