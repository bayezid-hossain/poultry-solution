import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Activity, FileText, Pencil, Settings, ShoppingCart, Skull, Wheat, Wrench } from "lucide-react-native";
import { useState } from "react";
import { ActionSheetIOS, Platform, Pressable, View } from "react-native";
import { EditMortalityLogModal } from "./edit-mortality-log-modal";
import { RevertCycleLogModal } from "./revert-cycle-log-modal";

export interface TimelineLog {
    id: string;
    type: string;
    valueChange: number;
    previousValue?: number;
    newValue?: number;
    createdAt: string | Date;
    note?: string | null;
    cycleId?: string | null;
    isReverted?: boolean;
}

const LogIcon = ({ type, note, isReverted }: { type: string; note?: string | null; isReverted?: boolean }) => {
    const normalizedType = type.toUpperCase();
    const isConsumption = (note?.includes("Consumption") || normalizedType === "CONSUMPTION") && !note?.includes("Ended");

    if (isReverted) return { icon: <Settings size={14} color="white" />, color: "bg-muted-foreground opacity-50" };
    if (normalizedType === "FEED" || normalizedType === "STOCK_IN") return { icon: <Wheat size={14} color="white" />, color: "bg-amber-500" };
    if (normalizedType === "MORTALITY") return { icon: <Skull size={14} color="white" />, color: "bg-destructive" };
    if (normalizedType === "CORRECTION") return { icon: <Wrench size={14} color="white" />, color: "bg-orange-500" };
    if (normalizedType === "SYSTEM" || normalizedType === "NOTE") {
        const n = note?.toLowerCase() || "";
        if (n.includes("started") || n.includes("ended") || n.includes("reopened")) {
            return { icon: <Settings size={14} color="white" />, color: "bg-purple-500" };
        }
        return { icon: <FileText size={14} color="white" />, color: "bg-muted-foreground" };
    }
    if (isConsumption || normalizedType === "CONSUMPTION" || normalizedType === "STOCK_OUT") {
        return { icon: <Activity size={14} color="white" />, color: "bg-blue-500" };
    }
    if (normalizedType === "SALES") return { icon: <ShoppingCart size={14} color="white" />, color: "bg-emerald-500" };

    return { icon: <FileText size={14} color="white" />, color: "bg-muted-foreground" };
};

const getLogTitle = (type: string, note?: string | null) => {
    const normalizedType = type.toUpperCase();
    if (normalizedType === "FEED") return "Added Feed";
    if (normalizedType === "STOCK_IN") return "Stock In";
    if (normalizedType === "MORTALITY") return "Reported Mortality";
    if (normalizedType === "CORRECTION") return "Correction";
    if (normalizedType === "SALES") return "Sale Recorded";
    if (normalizedType === "CONSUMPTION" || normalizedType === "STOCK_OUT") return "Stock Deduction";

    const n = note?.toLowerCase() || "";
    if (n.includes("started")) return "Cycle Started";
    if (n.includes("ended")) return "Cycle Ended";
    if (n.includes("reopened")) return "Cycle Reopened";

    return "Activity Log";
};

export function LogsTimeline({ logs, onRefresh }: { logs: TimelineLog[], onRefresh?: () => void }) {
    const [selectedLog, setSelectedLog] = useState<TimelineLog | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isRevertOpen, setIsRevertOpen] = useState(false);

    const handleLogOptions = (log: TimelineLog) => {
        if (log.type.toUpperCase() !== "MORTALITY" || log.isReverted) return;

        // Simple mock of ActionSheet for options. In a real app we'd use a bottom sheet.
        // For simplicity, let's just use ActionSheetIOS on iOS, or just open edit modal for now.
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Edit Mortality Log', 'Revert Mortality Log'],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setSelectedLog(log);
                        setIsEditOpen(true);
                    } else if (buttonIndex === 2) {
                        setSelectedLog(log);
                        setIsRevertOpen(true);
                    }
                }
            );
        } else {
            // Very simple fallback for Android: just open Edit for now
            setSelectedLog(log);
            setIsEditOpen(true);
        }
    };
    if (!logs || logs.length === 0) {
        return (
            <View className="items-center justify-center py-10 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                <Text className="text-muted-foreground italic">No activity recorded yet</Text>
            </View>
        );
    }

    return (
        <View className="space-y-0">
            {logs.map((log, index) => {
                const { icon, color } = LogIcon({ type: log.type, note: log.note, isReverted: log.isReverted });
                const isLast = index === logs.length - 1;

                return (
                    <View key={log.id} className="flex-row">
                        <View className="items-center mr-4">
                            <View className={cn("w-8 h-8 rounded-full items-center justify-center shadow-sm z-10", color)}>
                                {icon}
                            </View>
                            {!isLast && <View className="w-[1px] flex-1 bg-border/50 my-1" />}
                        </View>

                        <View className="flex-1 pb-6">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className="font-bold text-sm text-foreground">
                                    {getLogTitle(log.type, log.note)}
                                </Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-[10px] text-muted-foreground">
                                        {format(new Date(log.createdAt), "MMM d, HH:mm")}
                                    </Text>
                                    {log.type.toUpperCase() === "MORTALITY" && !log.isReverted && (
                                        <Pressable onPress={() => handleLogOptions(log)} className="p-1 -mr-2 bg-muted/50 rounded flex-row items-center gap-1">
                                            <Icon as={Pencil} size={10} className="text-muted-foreground" />
                                            <Text className="text-[9px] text-muted-foreground font-bold">EDIT</Text>
                                        </Pressable>
                                    )}
                                </View>
                            </View>

                            <View className="flex-row items-center gap-2 mb-1">
                                <Badge variant="secondary" className="px-1.5 py-0 h-5">
                                    <Text className="text-[10px] font-mono">
                                        {(log.valueChange ?? 0) >= 0 ? "+" : ""}
                                        {(log.valueChange ?? 0).toFixed(log.type.toUpperCase() === 'MORTALITY' ? 0 : 1)}
                                        {" "}
                                        {log.type.toUpperCase() === 'MORTALITY' || log.type.toUpperCase() === 'SALES' ? "Birds" : "Bags"}
                                    </Text>
                                </Badge>
                                {log.note && (
                                    <Text className="text-[11px] text-muted-foreground flex-1" numberOfLines={1}>
                                        {log.note}
                                    </Text>
                                )}
                            </View>

                            {log.previousValue !== undefined && log.previousValue !== null && log.newValue !== undefined && log.newValue !== null && (
                                <Text className="text-[10px] text-muted-foreground font-mono">
                                    {(log.previousValue ?? 0).toFixed(1)} → {(log.newValue ?? 0).toFixed(1)}
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}

            <EditMortalityLogModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                log={selectedLog ? { id: selectedLog.id, value: selectedLog.valueChange, note: selectedLog.note } : null}
                onSuccess={onRefresh}
            />

            <RevertCycleLogModal
                open={isRevertOpen}
                onOpenChange={setIsRevertOpen}
                log={selectedLog ? { id: selectedLog.id, value: selectedLog.valueChange, note: selectedLog.note } : null}
                onSuccess={onRefresh}
            />
        </View>
    );
}
