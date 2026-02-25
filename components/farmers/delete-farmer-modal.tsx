/// <reference types="nativewind/types" />
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { AlertTriangle, Trash2 } from "lucide-react-native";
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface DeleteFarmerModalProps {
    farmerId: string;
    organizationId: string;
    farmerName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteFarmerModal({
    farmerId,
    organizationId,
    farmerName,
    open,
    onOpenChange,
}: DeleteFarmerModalProps) {

    const mutation = trpc.officer.farmers.delete.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            // Navigate back after successful deletion
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace("/(drawer)/(tabs)/farmers");
            }
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    const handleDelete = () => {
        mutation.mutate({ id: farmerId, orgId: organizationId });
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                className="flex-1"
            >
                <Pressable
                    className="flex-1 bg-black/60 items-center justify-center p-4"
                    onPress={() => onOpenChange(false)}
                >
                    <Pressable
                        className="w-full max-w-xs bg-card rounded-3xl overflow-hidden"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View className="p-6 pb-0 items-center">
                            <View className="w-16 h-16 rounded-full bg-destructive/10 items-center justify-center mb-4">
                                <Icon as={AlertTriangle} size={32} className="text-destructive" />
                            </View>
                            <Text className="text-xl font-bold text-foreground text-center">Delete Farmer?</Text>
                            <Text className="text-sm text-muted-foreground text-center mt-2 px-2">
                                Are you sure you want to delete <Text className="font-bold text-foreground">{farmerName}</Text>?
                                {"\n"}This action cannot be undone.
                            </Text>
                        </View>



                        {/* Actions */}
                        <View className="p-6 flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl border-border/50"
                                onPress={() => onOpenChange(false)}
                            >
                                <Text className="font-bold text-foreground">Cancel</Text>
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-destructive rounded-xl shadow-none flex-row items-center justify-center gap-2"
                                onPress={handleDelete}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? (
                                    <Text className="text-destructive-foreground font-bold">Deleting...</Text>
                                ) : (
                                    <>
                                        <Icon as={Trash2} size={16} className="text-destructive-foreground" />
                                        <Text className="text-destructive-foreground font-bold">Delete</Text>
                                    </>
                                )}
                            </Button>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
