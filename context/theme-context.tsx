import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import { createContext, useContext, useEffect, useState } from "react";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextType {
    /** The resolved color scheme (always 'light' or 'dark') */
    colorScheme: "light" | "dark";
    /** The user's preference ('light', 'dark', or 'system') */
    preference: ColorScheme;
    /** Whether the resolved scheme is dark */
    isDarkColorScheme: boolean;
    /** Set the color scheme preference */
    setColorScheme: (scheme: ColorScheme) => void;
    /** Toggle between light and dark */
    toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    colorScheme: "light",
    preference: "system",
    isDarkColorScheme: false,
    setColorScheme: () => { },
    toggleColorScheme: () => { },
});

const STORAGE_KEY = "color-scheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { colorScheme: nwColorScheme, setColorScheme: setNwColorScheme } =
        useNativeWindColorScheme();

    const [preference, setPreference] = useState<ColorScheme>("system");
    const [isLoaded, setIsLoaded] = useState(false);

    // Load stored preference on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
            if (stored === "light" || stored === "dark" || stored === "system") {
                setPreference(stored);
                if (stored !== "system") {
                    setNwColorScheme(stored);
                } else {
                    setNwColorScheme("system");
                }
            }
            setIsLoaded(true);
        });
    }, []);

    const setColorScheme = (scheme: ColorScheme) => {
        setPreference(scheme);
        AsyncStorage.setItem(STORAGE_KEY, scheme);
        if (scheme === "system") {
            setNwColorScheme("system");
        } else {
            setNwColorScheme(scheme);
        }
    };

    const resolved = nwColorScheme ?? "light";

    const toggleColorScheme = () => {
        setColorScheme(resolved === "dark" ? "light" : "dark");
    };

    const value: ThemeContextType = {
        colorScheme: resolved,
        preference,
        isDarkColorScheme: resolved === "dark",
        setColorScheme,
        toggleColorScheme,
    };

    // Don't render until preference is loaded to avoid flash
    if (!isLoaded) return null;

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

export { ThemeContext };
