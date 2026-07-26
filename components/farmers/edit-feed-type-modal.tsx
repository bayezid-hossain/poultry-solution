import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Tag, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { FeedTypeInput } from "./feed-type-input";

interface EditFeedTypeModalProps {
    log: {
        id: string;
        feedType?: string | null;
    } | null;
    orgId?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditFeedTypeModal({ log, orgId, open, onOpenChange, onSuccess }: EditFeedTypeModalProps) {
    const [feedType, setFeedType] = useState("");

    useEffect(() => {
        if (open) setFeedType(log?.feedType || "");
    }, [open, log]);

    const mutation = trpc.officer.stock.updateLogFeedType.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
            toast.success("Feed type updated");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update feed type");
        },
    });

    if (!log) return null;

    const handleSubmit = () => {
        mutation.mutate({
            logId: log.id,
            feedType: feedType.trim() || null,
        });
    };

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                <View className="p-6 pb-2 flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={Tag} size={20} className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-foreground">Edit Feed Type</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                                Label which feed variety this entry involved
                            </Text>
                        </View>
                    </View>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Button>
                </View>

                <View className="p-6 pt-2">
                    <View className="gap-2 mb-6">
                        <Text className="text-sm font-bold text-foreground ml-1">Feed Type</Text>
                        <FeedTypeInput
                            value={feedType}
                            onChangeText={setFeedType}
                            orgId={orgId}
                            className="h-12 bg-muted/30 border-border/50"
                        />
                    </View>

                    <View className="flex-row gap-3">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl" onPress={() => onOpenChange(false)}>
                            <Text className="font-bold">Cancel</Text>
                        </Button>
                        <Button className="flex-1 h-12 bg-primary rounded-xl shadow-none" onPress={handleSubmit} disabled={mutation.isPending}>
                            <Text className="text-primary-foreground font-bold">
                                {mutation.isPending ? "Saving..." : "Save"}
                            </Text>
                        </Button>
                    </View>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
