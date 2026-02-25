import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Link, Stack } from "expo-router";
import { Compass, House } from "lucide-react-native";
import { View } from "react-native";

function NotFoundScreen() {
    return (
        <View className="flex-1 items-center justify-center bg-background p-6">
            <Stack.Screen options={{ title: "Oops!", headerShown: false }} />

            {/* Background Decoration */}
            <View className="absolute opacity-[0.03]" style={{ transform: [{ scale: 4 }] }}>
                <Icon as={Compass} size={200} className="text-foreground" />
            </View>

            {/* Content Container */}
            <View className="items-center max-w-sm w-full">
                {/* Visual Indicator */}
                <View className="w-24 h-24 rounded-3xl bg-primary/10 items-center justify-center mb-8 rotate-12">
                    <Icon as={Compass} size={48} className="text-primary -rotate-12" />
                </View>

                {/* Typography */}
                <Text className="text-6xl font-black text-foreground mb-2 tracking-tighter">404</Text>
                <Text className="text-2xl font-bold text-foreground mb-4">Path Not Found</Text>

                <Text className="text-center text-muted-foreground mb-10 leading-relaxed px-4">
                    The page you are looking for doesn't exist or has been moved to a different location.
                </Text>

                {/* Action */}
                <Link href="/" asChild>
                    <Button className="w-full h-16 rounded-2xl flex-row gap-3 shadow-lg shadow-primary/20">
                        <Icon as={House} size={20} className="text-primary-foreground" />
                        <Text className="text-primary-foreground font-black uppercase tracking-widest">Return Home</Text>
                    </Button>
                </Link>

                <Link href="/settings" asChild className="mt-4">
                    <Button variant="ghost" className="h-12 px-8">
                        <Text className="text-muted-foreground font-bold italic">Check your connection? →</Text>
                    </Button>
                </Link>
            </View>

            {/* Footer Decor */}
            <View className="absolute bottom-12 opacity-20">
                <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Poultry Solution System</Text>
            </View>
        </View>
    );
}

export default NotFoundScreen;
