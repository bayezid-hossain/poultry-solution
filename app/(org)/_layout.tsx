import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function OrganizationLayout() {
    const colorScheme = useColorScheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' },
            }}
        />
    );
}
