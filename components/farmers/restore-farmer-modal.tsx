import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { RotateCcw, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";

interface RestoreFarmerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    farmerId: string;
    farmerName: string;
    orgId: string;
    onSuccess?: () => void;
}

export function RestoreFarmerModal({
    open,
    onOpenChange,
    farmerId,
    farmerName,
    orgId,
    onSuccess,
}: RestoreFarmerModalProps) {
    // Extract original name from archived format (e.g., "FarmerName_AB12" → "FarmerName")
    const lastUnderscore = farmerName.lastIndexOf("_");
    const originalName = lastUnderscore !== -1 ? farmerName.substring(0, lastUnderscore) : farmerName;

    const [newName, setNewName] = useState(originalName);
    const [error, setError] = useState<string | null>(null);

    const restoreMutation = trpc.management.farmers.restore.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err) => {
            setError(err.message);
        },
    });

    const handleRestore = () => {
        setError(null);
        restoreMutation.mutate({
            orgId,
            farmerId,
            newName: newName.trim() || undefined,
        });
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => onOpenChange(false)}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-background rounded-t-3xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-border/50">
                        <View className="flex-row items-center gap-2">
                            <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center">
                                <Icon as={RotateCcw} size={16} className="text-emerald-500" />
                            </View>
                            <Text className="text-lg font-bold text-foreground">Restore Farmer</Text>
                        </View>
                        <Pressable onPress={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    <View className="p-4">
                        <Text className="text-sm text-muted-foreground mb-4">
                            Restoring <Text className="font-bold text-foreground">{farmerName}</Text> to active status.
                            You can optionally change the name.
                        </Text>

                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Farmer Name</Text>
                        <Input
                            value={newName}
                            onChangeText={(text) => {
                                setNewName(text);
                                setError(null);
                            }}
                            placeholder="Enter farmer name"
                            className="mb-4"
                        />

                        {error && (
                            <Card className="mb-4 border-destructive/30 bg-destructive/5">
                                <CardContent className="p-3">
                                    <Text className="text-xs text-destructive">{error}</Text>
                                </CardContent>
                            </Card>
                        )}

                        <Button
                            className="h-12 rounded-xl bg-emerald-500 flex-row items-center justify-center gap-2"
                            onPress={handleRestore}
                            disabled={restoreMutation.isPending || !newName.trim()}
                        >
                            {restoreMutation.isPending ? (
                                <ActivityIndicator color={"#ffffff"} />
                            ) : (
                                <Icon as={RotateCcw} size={18} className="text-white" />
                            )}
                            <Text className="text-white font-bold">Restore Farmer</Text>
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
