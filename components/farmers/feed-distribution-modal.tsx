import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Check, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { FeedTypeInput } from "./feed-type-input";

interface FeedDistributionModalProps {
    farmerId: string;
    orgId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function FeedDistributionModal({ farmerId, orgId, open, onOpenChange, onSuccess }: FeedDistributionModalProps) {
    const utils = trpc.useUtils();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const historyProcedure = isManagement ? trpc.management.stock.getHistory : trpc.officer.stock.getHistory;
    const { data: history, isLoading } = (historyProcedure as any).useQuery(
        { farmerId, orgId },
        { enabled: open && !!farmerId }
    );

    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const mutation = trpc.officer.stock.splitLogFeedType.useMutation({
        onSuccess: (_data: any, variables: any) => {
            toast.success("Feed type updated");
            setEditValues(prev => {
                const next = { ...prev };
                delete next[variables.logId];
                return next;
            });
            utils.officer.stock.getHistory.invalidate({ farmerId });
            utils.management.stock.getHistory.invalidate({ farmerId });
            utils.officer.stock.getStockBreakdown.invalidate({ farmerId });
            utils.management.stock.getStockBreakdown.invalidate({ farmerId });
            onSuccess?.();
        },
        onError: (err: any) => toast.error(err.message || "Failed to update feed type"),
        onSettled: () => setSavingId(null),
    });

    const handleSave = (log: any) => {
        const value = editValues[log.id] ?? (log.feedType || "");
        setSavingId(log.id);
        mutation.mutate({
            logId: log.id,
            splits: [{ type: value.trim() || undefined, quantity: Math.abs(parseFloat(log.amount)) }],
        });
    };

    const logs: any[] = history ?? [];

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange} fullScreen>
            <View className="px-6 pt-6 pb-4 border-b border-border/50 flex-row justify-between items-center">
                <View className="flex-1">
                    <Text className="text-xl font-bold text-foreground">Feed Type Breakdown</Text>
                    <Text className="text-xs text-muted-foreground mt-0.5">
                        Assign a feed type to any entry, including &quot;Unspecified&quot; ones
                    </Text>
                </View>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                    <Icon as={X} size={18} className="text-muted-foreground" />
                </Button>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 pb-10" className="flex-1">
                {isLoading ? (
                    <View className="py-20 items-center justify-center">
                        <ActivityIndicator />
                    </View>
                ) : logs.length === 0 ? (
                    <View className="py-20 items-center justify-center">
                        <Text className="text-muted-foreground text-sm">No stock entries yet</Text>
                    </View>
                ) : (
                    logs.map((log: any) => {
                        const value = editValues[log.id] ?? (log.feedType || "");
                        const isUnspecified = !log.feedType;
                        const dirty = value.trim() !== (log.feedType || "");
                        const amt = Number(log.amount);
                        return (
                            <View
                                key={log.id}
                                className={`flex-row items-center gap-2 p-3 mb-2 rounded-xl border ${isUnspecified ? 'border-amber-400/40 bg-amber-500/5' : 'border-border/40 bg-card'}`}
                            >
                                <View className="w-16">
                                    <Text className="text-[10px] text-muted-foreground font-bold">{format(new Date(log.createdAt), "dd MMM yy")}</Text>
                                    <Text className="text-[9px] text-muted-foreground/70" numberOfLines={1}>{String(log.type).replace(/_/g, ' ')}</Text>
                                </View>
                                <View className="flex-1">
                                    <FeedTypeInput
                                        value={value}
                                        onChangeText={(val) => setEditValues(prev => ({ ...prev, [log.id]: val }))}
                                        orgId={orgId}
                                        placeholder={isUnspecified ? "Assign type..." : undefined}
                                        className="h-10 bg-background border-border/50"
                                    />
                                </View>
                                <Text className={`w-14 text-right text-xs font-bold ${amt >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                    {amt >= 0 ? '+' : ''}{amt.toFixed(1)}
                                </Text>
                                {dirty && (
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 rounded-lg bg-primary"
                                        onPress={() => handleSave(log)}
                                        disabled={savingId === log.id}
                                    >
                                        {savingId === log.id ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Icon as={Check} size={16} className="text-primary-foreground" />
                                        )}
                                    </Button>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </BottomSheetModal>
    );
}
