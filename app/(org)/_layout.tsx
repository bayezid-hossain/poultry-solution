import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

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
