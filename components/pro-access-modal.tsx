import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, X } from "lucide-react-native";
import { Modal, Pressable, View } from "react-native";
import { toast } from "sonner-native";

interface ProAccessModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature?: string;
    description?: string;
}

export function ProAccessModal({
    open,
    onOpenChange,
    feature = "Premium Feature",
    description = "This feature is only available on the Pro plan."
}: ProAccessModalProps) {
    const queryClient = useQueryClient();

    const { data: requestStatus, isLoading: isLoadingStatus } = trpc.officer.getMyRequestStatus.useQuery(
        { feature: "PRO_PACK" },
        { enabled: open }
    );

    const requestMutation = trpc.officer.requestAccess.useMutation({
        onSuccess: () => {
            toast.success("Pro access requested successfully!");
            queryClient.invalidateQueries({ queryKey: [["officer", "getMyRequestStatus"]] });
        },
        onError: (err) => {
            toast.error(`Request failed: ${err.message}`);
        }
    });

    const isPending = requestStatus?.status === "PENDING";
    const isApproved = requestStatus?.status === "APPROVED";

    return (
        <Modal
            visible={open}
            animationType="fade"
            transparent
            onRequestClose={() => onOpenChange(false)}
        >
            <Pressable
                className="flex-1 bg-black/50 items-center justify-center p-4"
                onPress={() => onOpenChange(false)}
            >
                <Pressable
                    className="w-full max-w-sm bg-card rounded-3xl p-6 border-2 border-dashed border-border/50 shadow-lg items-center relative"
                    onPress={(e) => e.stopPropagation()}
                >
                    <Pressable
                        onPress={() => onOpenChange(false)}
                        className="absolute right-4 top-4 w-8 h-8 rounded-full bg-muted items-center justify-center active:bg-muted/80 z-10"
                    >
                        <Icon as={X} size={16} className="text-muted-foreground" />
                    </Pressable>

                    <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 border border-primary/20">
                        <Icon as={Lock} size={32} className="text-primary" />
                    </View>

                    <Text className="text-xl font-black text-center text-primary mb-2">Pro Access Required</Text>

                    <Text className="text-base font-bold text-center text-foreground mb-2">
                        {feature}
                    </Text>

                    <Text className="text-sm text-center text-muted-foreground leading-5 mb-6">
                        {description} {"\n"}
                        Upgrade your plan to unlock unlimited access.
                    </Text>

                    <View className="w-full flex-row justify-center">
                        {isLoadingStatus ? (
                            <Button disabled className="w-full opacity-50 flex-row gap-2 h-12 justify-center rounded-xl border border-border/50">
                                <Icon as={Loader2} className="animate-spin text-primary-foreground" size={16} />
                                <Text className="font-bold text-primary-foreground">Checking status...</Text>
                            </Button>
                        ) : isPending ? (
                            <Button disabled className="w-full bg-muted border justify-center border-border/50 h-12 rounded-xl">
                                <Text className="font-bold text-muted-foreground">Request Pending</Text>
                            </Button>
                        ) : isApproved ? (
                            <Button disabled className="w-full bg-emerald-500/10 justify-center border border-emerald-500/20 h-12 rounded-xl">
                                <Text className="font-bold text-emerald-600">Access Granted (Refresh)</Text>
                            </Button>
                        ) : (
                            <Button
                                onPress={() => requestMutation.mutate({ feature: "PRO_PACK" })}
                                disabled={requestMutation.isPending}
                                className={`w-full bg-primary shadow-lg shadow-primary/20 justify-center flex-row gap-2 h-12 rounded-xl ${requestMutation.isPending ? 'opacity-70' : ''}`}
                            >
                                {requestMutation.isPending && <Icon as={Loader2} className="animate-spin text-primary-foreground" size={16} />}
                                <Text className="font-bold text-primary-foreground uppercase tracking-widest text-[10px]">
                                    Request Pro Access
                                </Text>
                            </Button>
                        )}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
