import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { ConfirmModal } from "./confirm-modal";
import { SaleEventCard } from "./sale-event-card";

interface CycleRowAccordionProps {
    cycle: any;
    isLast: boolean;
    onRefresh: () => void;
}

export function CycleRowAccordion({ cycle, isLast, onRefresh }: CycleRowAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const trpcContext = trpc.useUtils();

    const deleteMutation = trpc.officer.sales.delete.useMutation({
        onSuccess: () => {
            onRefresh();
            trpcContext.officer.cycles.listActive.invalidate();
            trpcContext.officer.farmers.listWithStock.invalidate();
            setIsConfirmOpen(false);
        },
        onError: (err: any) => {
            alert(err.message || "Failed to delete sales record.");
        }
    });

    const onConfirmDelete = () => {
        deleteMutation.mutate({
            saleEventId: cycle.sales[0].id,
            historyId: cycle.sales[0].historyId
        });
    };

    return (
        <View className={`${!isLast ? 'border-b border-border/10' : ''}`}>
            <ConfirmModal
                visible={isConfirmOpen}
                title="Delete Sales History?"
                description={cycle.isEnded
                    ? "This will delete the sale records for this batch. Batch stats and status will NOT be changed."
                    : "This will delete ALL sales records for this cycle and revert stats (mortality/population). This cannot be undone."}
                confirmText="Delete"
                cancelText="Keep"
                destructive
                onConfirm={onConfirmDelete}
                onCancel={() => setIsConfirmOpen(false)}
            />
            <TouchableOpacity
                activeOpacity={0.7}
                className="py-3 px-3 flex-row items-center justify-between active:bg-muted/10 transition-colors"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-1.5 flex-[1.5]">
                    <View className="ml-1 justify-center">
                        {cycle.isEnded ? (
                            <Icon as={CheckCircle2} size={16} className="text-emerald-500" />
                        ) : (
                            <View className="animate-spin">
                                <Icon as={CircleDashed} size={16} className="text-emerald-500" />
                            </View>
                        )}
                    </View>
                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                        {cycle.sales.length} {cycle.sales.length === 1 ? 'SALE' : 'SALES'}
                    </Text>
                </View>

                <View className="flex-1 items-center">
                    <Text className="text-xs font-black text-foreground">{cycle.age}d</Text>
                </View>

                <View className="flex-[1.5] items-center">
                    <Text className="text-xs font-black text-foreground">{cycle.doc.toLocaleString()}</Text>
                </View>

                <View className="flex-[1.5] items-center">
                    <Text className="text-xs font-black text-emerald-500">{cycle.totalSold.toLocaleString()}</Text>
                </View>

                <View className="flex-row items-center flex-1 justify-end gap-2">
                    <Pressable
                        className="p-1 active:bg-destructive/10 rounded-full"
                        onPress={(e) => {
                            e.stopPropagation();
                            setIsConfirmOpen(true);
                        }}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <BirdyLoader size={16} color="#ef4444" />
                        ) : (
                            <Icon as={Trash2} size={14} className="text-destructive/80" />
                        )}
                    </Pressable>
                    <Icon as={isOpen ? ChevronUp : ChevronDown} size={16} className="text-muted-foreground/70" />
                </View>
            </TouchableOpacity>

            {isOpen && (
                <View className="bg-muted/10 px-2 pt-3 pb-1 border-t border-border/10">
                    {cycle.sales.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).map((event: any, sIdx: number) => (
                        <SaleEventCard
                            key={event.id}
                            sale={event}
                            isLatest={sIdx === 0}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
