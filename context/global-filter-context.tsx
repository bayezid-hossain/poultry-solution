import React, { createContext, useContext, useState } from "react";

interface GlobalFilterState {
    selectedOfficerId: string | null;
    selectedOfficerName: string;
    branchName: string | null;
    mobile: string | null;
    setSelectedOfficer: (id: string | null, name: string, branchName?: string | null, mobile?: string | null) => void;
}

const GlobalFilterContext = createContext<GlobalFilterState>({
    selectedOfficerId: null,
    selectedOfficerName: "All Officers",
    branchName: null,
    mobile: null,
    setSelectedOfficer: () => { },
});

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
    const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
    const [selectedOfficerName, setSelectedOfficerName] = useState("All Officers");
    const [branchName, setBranchName] = useState<string | null>(null);
    const [mobile, setMobile] = useState<string | null>(null);

    const setSelectedOfficer = (id: string | null, name: string, branch?: string | null, mob?: string | null) => {
        setSelectedOfficerId(id);
        setSelectedOfficerName(name);
        setBranchName(branch || null);
        setMobile(mob || null);
    };

    return (
        <GlobalFilterContext.Provider value={{ selectedOfficerId, selectedOfficerName, branchName, mobile, setSelectedOfficer }}>
            {children}
        </GlobalFilterContext.Provider>
    );
}

export const useGlobalFilter = () => useContext(GlobalFilterContext);
