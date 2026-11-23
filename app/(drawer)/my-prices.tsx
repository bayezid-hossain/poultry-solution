/// <reference types="nativewind/types" />
import { PricePoliciesContent } from "@/components/prices/price-policies-content";
import { ScreenHeader } from "@/components/screen-header";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";

export default function MyPricesScreen() {
    const { add } = useLocalSearchParams<{ add?: string }>();

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="My Prices" />
            <PricePoliciesContent scope={{ kind: "mine" }} autoOpenAdd={add || undefined} />
        </View>
    );
}
