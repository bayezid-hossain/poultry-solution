import { useTheme } from '@/context/theme-context';

/**
 * Returns the resolved color scheme ('light' or 'dark').
 * Wraps the theme context to maintain backward compatibility with
 * consumers that call `useColorScheme()` and expect a string.
 */
export function useColorScheme(): 'light' | 'dark' {
    const { colorScheme } = useTheme();
    return colorScheme;
}
