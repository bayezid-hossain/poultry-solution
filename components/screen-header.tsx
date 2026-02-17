import { Text } from "@/components/ui/text";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
    title: string;
}

export function ScreenHeader({ title }: ScreenHeaderProps) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    return (
        <View
            className="flex-row items-center px-4 pb-3 bg-background border-b border-border"
            style={{ paddingTop: insets.top + 8 }}
        >
            <Pressable
                onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
                className="w-10 h-10 items-center justify-center rounded-lg active:bg-accent mr-2"
            >
                <Text className="text-xl">☰</Text>
            </Pressable>
            <Text className="text-xl font-bold text-primary flex-1">{title}</Text>
        </View>
    );
}
