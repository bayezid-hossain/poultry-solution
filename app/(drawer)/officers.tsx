import { ScreenHeader } from "@/components/screen-header";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export default function OfficersScreen() {
    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Officers" />
            <View className="p-5">
                <Text variant="muted" className="mt-2">Coming soon</Text>
            </View>
        </View>
    );
}
