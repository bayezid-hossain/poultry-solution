import React, { createContext, useContext, useState } from "react";

interface GlobalFilterState {
    selectedOfficerId: string | null;
    selectedOfficerName: string;
    setSelectedOfficer: (id: string | null, name: string) => void;
}

const GlobalFilterContext = createContext<GlobalFilterState>({
    selectedOfficerId: null,
    selectedOfficerName: "All Officers",
    setSelectedOfficer: () => { },
});

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
    const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
    const [selectedOfficerName, setSelectedOfficerName] = useState("All Officers");

    const setSelectedOfficer = (id: string | null, name: string) => {
        setSelectedOfficerId(id);
        setSelectedOfficerName(name);
    };

    return (
        <GlobalFilterContext.Provider value={{ selectedOfficerId, selectedOfficerName, setSelectedOfficer }}>
            {children}
        </GlobalFilterContext.Provider>
    );
}

export const useGlobalFilter = () => useContext(GlobalFilterContext);
