import { cn } from '@/lib/utils';
import { Bird } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { Text } from './text';

interface Props {
    title?: string;
    description?: string;
    className?: string;
    fullPage?: boolean;
}

export const BirdyLoader = ({ size = 48, color = "#10b981", withGlow = true }: { size?: number, color?: string, withGlow?: boolean }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const birdStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [0, -8]) },
            { scale: interpolate(progress.value, [0, 1], [1, 1.05]) }
        ]
    }));

    const shadowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0.6, 0.15]),
        transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1.4]) }]
    }));

    return (
        <View className="items-center justify-center relative">
            <Animated.View style={birdStyle} className="z-10">
                <Bird size={size} color={color} strokeWidth={2.5} />
            </Animated.View>

            {withGlow && (
                <View className="absolute -bottom-2.5 items-center justify-center">
                    <Animated.View
                        style={[shadowStyle, { backgroundColor: color, width: size * 0.7, height: Math.max(4, size * 0.1), borderRadius: Math.max(2, size * 0.05) }]}
                    />
                </View>
            )}
        </View>
    );
};

export const LoadingState = ({ title, description, className, fullPage = false }: Props) => {
    return (
        <View className={cn(
            "flex-1 items-center justify-center bg-background",
            fullPage ? "absolute inset-0 z-50 bg-background/100 backdrop-blur-xl" : "min-h-[200px] w-full",
            className
        )}>
            <BirdyLoader size={48} color={"#10b981"} />

            {(title || description) && (
                <View className="mt-4 items-center">
                    {title && (
                        <Text className="text-[12px] font-black uppercase tracking-[0.25em] text-foreground mb-1.5 text-center">
                            {title}
                        </Text>
                    )}
                    {description && (
                        <Text className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground text-center">
                            {description}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};
