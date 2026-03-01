import { Text } from "@/components/ui/text";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Tag } from "lucide-react-native";
import { Pressable, View } from "react-native";

export type NotificationType = "INFO" | "WARNING" | "CRITICAL" | "SUCCESS" | "UPDATE" | "SALES";

interface NotificationItemProps {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    createdAt: string | Date;
    isRead: boolean;
    onPress: () => void;
}

export function NotificationItem({ title, message, type, createdAt, isRead, onPress }: NotificationItemProps) {
    let Icon = Info;
    let iconColor = "text-blue-500 dark:text-blue-400";
    let bgColor = "bg-blue-500/10 dark:bg-blue-500/20";

    switch (type) {
        case "WARNING":
            Icon = AlertTriangle;
            iconColor = "text-amber-500 dark:text-amber-400";
            bgColor = "bg-amber-500/10 dark:bg-amber-500/20";
            break;
        case "CRITICAL":
            Icon = AlertCircle;
            iconColor = "text-red-500 dark:text-red-400";
            bgColor = "bg-red-500/10 dark:bg-red-500/20";
            break;
        case "SUCCESS":
            Icon = CheckCircle;
            iconColor = "text-green-500 dark:text-green-400";
            bgColor = "bg-green-500/10 dark:bg-green-500/20";
            break;
        case "SALES":
            Icon = Tag;
            iconColor = "text-violet-500 dark:text-violet-400";
            bgColor = "bg-violet-500/10 dark:bg-violet-500/20";
            break;
    }

    return (
        <Pressable
            onPress={onPress}
            className={`flex-row gap-3 p-4 border-b border-border/50 items-start active:bg-muted/50 ${!isRead ? 'bg-primary/5' : ''}`}
        >
            <View className={`mt-0.5 p-2 rounded-full ${bgColor}`}>
                <Icon size={16} className={iconColor} />
            </View>
            <View className="flex-1">
                <Text className={`text-sm mb-1 ${!isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                    {title}
                </Text>
                <Text className="text-xs text-muted-foreground leading-tight line-clamp-2 mb-2">
                    {message}
                </Text>
                <Text className="text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">
                    {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </Text>
            </View>
            {!isRead && (
                <View className="w-2 h-2 rounded-full bg-primary mt-2" />
            )}
        </Pressable>
    );
}
