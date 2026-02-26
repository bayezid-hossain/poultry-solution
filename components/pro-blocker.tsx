import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock } from "lucide-react-native";
import { View } from "react-native";
import { toast } from "sonner-native";

interface ProBlockerProps {
    feature?: string;
    description?: string;
}

export function ProBlocker({
    feature = "Premium Feature",
    description = "This feature is only available on the Pro plan."
}: ProBlockerProps) {
    const queryClient = useQueryClient();

    const { data: requestStatus, isLoading: isLoadingStatus } = trpc.officer.getMyRequestStatus.useQuery(
        { feature: "PRO_PACK" }
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
        <View className="flex-1 items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-sm border-2 border-dashed border-border/50 bg-muted/10 shadow-none py-4">
                <CardHeader className="items-center pb-2">
                    <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4 border border-primary/20">
                        <Icon as={Lock} size={32} className="text-primary" />
                    </View>
                    <CardTitle className="text-2xl font-black text-center text-primary mt-2 flex-row flex-wrap justify-center">
                        <Text className="text-2xl font-black text-primary">Pro Access Required</Text>
                    </CardTitle>
                    <CardDescription className="text-base text-center mt-2 font-medium">
                        {feature} is a Pro feature.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Text className="text-center text-muted-foreground leading-6">
                        {description} {"\n"}
                        Upgrade your plan to unlock unlimited access.
                    </Text>
                </CardContent>
                <CardFooter className="flex justify-center pb-2 pt-4">
                    {isLoadingStatus ? (
                        <Button disabled className="w-full sm:w-auto opacity-50 flex-row gap-2">
                            <Icon as={Loader2} className="animate-spin text-primary-foreground" size={16} />
                            <Text className="font-bold text-primary-foreground">Checking status...</Text>
                        </Button>
                    ) : isPending ? (
                        <Button disabled className="w-full sm:w-auto bg-muted border border-border/50">
                            <Text className="font-bold text-muted-foreground">Request Pending</Text>
                        </Button>
                    ) : isApproved ? (
                        <Button disabled className="w-full sm:w-auto bg-emerald-500/10 border-emerald-500/20">
                            <Text className="font-bold text-emerald-600">Access Granted (Refresh)</Text>
                        </Button>
                    ) : (
                        <Button
                            onPress={() => requestMutation.mutate({ feature: "PRO_PACK" })}
                            disabled={requestMutation.isPending}
                            className={`w-full sm:w-auto bg-primary shadow-lg shadow-primary/20 flex-row gap-2 ${requestMutation.isPending ? 'opacity-70' : ''}`}
                        >
                            {requestMutation.isPending && <Icon as={Loader2} className="animate-spin text-primary-foreground" size={16} />}
                            <Text className="font-bold text-primary-foreground">
                                Request Pro Access
                            </Text>
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </View>
    );
}
