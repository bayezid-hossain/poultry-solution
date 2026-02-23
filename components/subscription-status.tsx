import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatDistanceToNow } from "date-fns";
import { Crown, Zap } from "lucide-react-native";
import { View } from "react-native";

interface SubscriptionStatusProps {
    isPro?: boolean;
    proExpiresAt?: Date | null;
}

export function SubscriptionStatus({ isPro, proExpiresAt }: SubscriptionStatusProps) {
    return (
        <View className="bg-muted/30 rounded-2xl p-3 border border-border/20">
            <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2 flex-1">
                    <View className={`w-8 h-8 rounded-lg items-center justify-center ${isPro ? 'bg-indigo-500/10' : 'bg-slate-500/10'}`}>
                        <Icon as={isPro ? Crown : Zap} size={16} className={isPro ? 'text-indigo-600' : 'text-slate-500'} />
                    </View>
                    <View className="flex-1">
                        <Text className={`text-[10px] font-black uppercase tracking-wider text-foreground`}>
                            {isPro ? 'Pro Member' : 'Free Plan'}
                        </Text>
                        {isPro && proExpiresAt && (
                            <Text className="text-[10px] text-muted-foreground font-medium">
                                Expires in {formatDistanceToNow(proExpiresAt)}
                            </Text>
                        )}
                    </View>
                </View>
                {isPro && (
                    <View className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
            </View>
        </View>
    );
}
