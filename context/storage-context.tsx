import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageAccessFramework } from "expo-file-system/legacy";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { toast } from "sonner-native";

const STORAGE_KEY = "poultry_solution_download_uri";

interface StorageState {
    directoryUri: string | null;
    isConfigured: boolean;
    setupDownloadFolder: () => Promise<void>;
    resetDownloadFolder: () => Promise<void>;
}

const StorageContext = createContext<StorageState>({
    directoryUri: null,
    isConfigured: false,
    setupDownloadFolder: async () => { },
    resetDownloadFolder: async () => { },
});

export function StorageProvider({ children }: { children: React.ReactNode }) {
    const [directoryUri, setDirectoryUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS === "android") {
            AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
                if (stored) setDirectoryUri(stored);
            });
        }
    }, []);

    const setupDownloadFolder = async () => {
        if (Platform.OS !== "android") {
            toast.info("Standard storage used on this platform.");
            return;
        }

        try {
            const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                await AsyncStorage.setItem(STORAGE_KEY, permissions.directoryUri);
                setDirectoryUri(permissions.directoryUri);
                toast.success("Download Folder Set", {
                    description: "Saved reports will be sent here."
                });
            } else {
                toast.error("Permission Denied", {
                    description: "Please select a folder to save reports."
                });
            }
        } catch (e) {
            console.error("Storage setup error:", e);
            toast.error("Setup Failed", {
                description: "An error occurred during storage setup."
            });
        }
    };

    const resetDownloadFolder = async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        setDirectoryUri(null);
        toast.success("Download folder reset.");
    };

    return (
        <StorageContext.Provider value={{
            directoryUri,
            isConfigured: !!directoryUri || Platform.OS !== "android",
            setupDownloadFolder,
            resetDownloadFolder
        }}>
            {children}
        </StorageContext.Provider>
    );
}

export const useStorage = () => useContext(StorageContext);
