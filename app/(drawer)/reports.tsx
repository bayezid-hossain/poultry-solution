import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ExportPreviewDialog } from "@/components/reports/ExportPreviewDialog";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { useStorage } from "@/context/storage-context";
import {
    deleteInternalFiles,
    downloadFileToDevice,
    exportActiveStockExcel,
    exportActiveStockPDF,
    exportAllFarmerStockExcel,
    exportAllFarmerStockPDF,
    exportProblematicFeedsExcel,
    exportProblematicFeedsPDF,
    exportRangeDocPlacementsExcel,
    exportRangeDocPlacementsPDF,
    exportRangeProductionExcel,
    exportRangeProductionPDF,
    exportSalesLedgerExcel,
    exportSalesLedgerPDF,
    exportYearlyPerformanceExcel,
    exportYearlyPerformancePDF,
    generateMultiSheetExcel,
    generateMultiSheetPDF,
    openFile,
    shareFile
} from "@/lib/export";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, Bird, ClipboardList, FileText, ShoppingBag, Table, TrendingUp } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { toast } from "sonner-native";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

interface LockedOfficer {
    id: string | null;
    name: string | null;
    branch: string | null;
    mobile: string | null;
}

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function AnimatedCircularProgress({ progress = 0, stopRequested = false }: { progress: number, stopRequested: boolean }) {
    const animatedValue = React.useRef(new Animated.Value(0)).current;

    const radius = 16;
    const strokeWidth = 2.5;
    const circumference = 2 * Math.PI * radius;

    React.useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: progress,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();
    }, [progress, animatedValue]);

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    return (
        <View className="items-center justify-center w-[40px] h-[40px]">
            <View className="absolute inset-0 bg-white/10 rounded-2xl" />
            <Svg width={40} height={40} style={{ transform: [{ rotate: "-90deg" }] }}>
                <Defs>
                    <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={stopRequested ? "#fca5a5" : "#86efac"} />
                        <Stop offset="100%" stopColor={stopRequested ? "#ef4444" : "#22c55e"} />
                    </LinearGradient>
                </Defs>
                <Circle stroke="rgba(255,255,255,0.2)" fill="none" cx={20} cy={20} r={radius} strokeWidth={strokeWidth} />
                <AnimatedCircle
                    stroke="url(#grad)"
                    fill="none"
                    cx={20}
                    cy={20}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            <Text className="absolute text-white font-black text-[9px]" style={{ transform: [{ translateY: 1 }] }}>
                {Math.round(progress)}%
            </Text>
        </View>
    );
}

export default function ReportsScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const { data: sessionData } = trpc.auth.getSession.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId, selectedOfficerName, branchName: selectedBranch, mobile: selectedMobile } = useGlobalFilter();

    // Range states
    const [startMonth, setStartMonth] = useState(new Date().getMonth());
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [endMonth, setEndMonth] = useState(new Date().getMonth());
    const [endYear, setEndYear] = useState(new Date().getFullYear());

    const [startMonthPickerOpen, setStartMonthPickerOpen] = useState(false);
    const [startYearPickerOpen, setStartYearPickerOpen] = useState(false);
    const [endMonthPickerOpen, setEndMonthPickerOpen] = useState(false);
    const [endYearPickerOpen, setEndYearPickerOpen] = useState(false);

    const [isExporting, setIsExporting] = useState(false);
    const [isBulkExporting, setIsBulkExporting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [currentBulkTask, setCurrentBulkTask] = useState("");
    const [stopRequested, setStopRequested] = useState(false);
    const stopRequestedRef = useRef(false);
    const [sessionFiles, setSessionFiles] = useState<string[]>([]);

    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<{ uri: string, type: 'pdf' | 'excel', title: string } | null>(null);

    // TRPC Utils
    const utils = trpc.useUtils();
    const { directoryUri, saveDirectoryUri } = useStorage();

    const handleExport = async (reportName: string, type: 'pdf' | 'excel', fetcher: () => Promise<any>) => {
        setIsExporting(true);
        try {
            const uri = await fetcher();
            setPreviewData({ uri, type, title: reportName });
            setPreviewVisible(true);
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate report.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!membership?.isPro) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Download Reports" />
                <ProBlocker feature="Download Reports" description="Unlock comprehensive analytical reports and data exports across your farm operations." />
            </View>
        );
    }

    const getReportTitle = (base: string) => {
        return base;
    };

    const getReportSubtitle = (officerOverride?: any, lockedSelection?: LockedOfficer) => {
        let branchName = "";
        let mobile = "";
        let officerName = "";

        if (officerOverride) {
            officerName = officerOverride.name || "";
            branchName = officerOverride.branchName || "";
            mobile = officerOverride.mobile || "";
        } else if (lockedSelection && lockedSelection.id) {
            officerName = lockedSelection.name || "";
            branchName = lockedSelection.branch || "";
            mobile = lockedSelection.mobile || "";
        } else if (isManagement && selectedOfficerId) {
            officerName = selectedOfficerName || "";
            branchName = selectedBranch || "";
            mobile = selectedMobile || "";
        } else if (!isManagement) {
            officerName = sessionData?.user?.name || "";
            branchName = sessionData?.user?.branchName || "";
            mobile = sessionData?.user?.mobile || "";
        }

        const parts = [];
        if (branchName) parts.push(`Branch: ${branchName}`);
        if (mobile) parts.push(`Mobile: ${mobile}`);

        let subtitleText = parts.length > 0 ? parts.join(" | ") : "";

        if (officerName) {
            if (subtitleText) {
                return `Officer: ${officerName}\n${subtitleText}`;
            }
            return `Officer: ${officerName}`;
        }
        return subtitleText || undefined;
    };

    // Modular Fetchers
    const fetchActiveStock = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        const orgId = membership?.orgId ?? "";
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.cycles.listActive.fetch({ orgId, pageSize: 500, officerId });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportActiveStockPDF(data.items, getReportTitle("Active Stock"), false, subtitle) : exportActiveStockExcel(data.items, getReportTitle("Active Stock"), false, subtitle);
            } else {
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.cycles.listActive.fetch({ orgId, pageSize: 500, officerId: officer.id });
                    if (data.items.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportActiveStockPDF(data.items, `Active Stock `, true, getReportSubtitle(officer))
                                : await exportActiveStockExcel(data.items, `Active Stock `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportActiveStockPDF([], "Active Stock Report") : exportActiveStockExcel([], "Active Stock Report");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "Active Stock Report") : generateMultiSheetExcel(sheets, "Active Stock Report");
            }
        }
        const data = await utils.officer.cycles.listActive.fetch({ orgId, pageSize: 500 });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportActiveStockPDF(data.items, getReportTitle("Active Stock"), false, subtitle) : exportActiveStockExcel(data.items, getReportTitle("Active Stock"), false, subtitle);
    };

    const fetchAllFarmerStock = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        const orgId = membership?.orgId ?? "";
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.farmers.getMany.fetch({ orgId, pageSize: 500, officerId });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportAllFarmerStockPDF(data.items, getReportTitle("All Farmer Stock"), false, subtitle) : exportAllFarmerStockExcel(data.items, getReportTitle("All Farmer Stock"), false, subtitle);
            } else {
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.farmers.getMany.fetch({ orgId, pageSize: 500, officerId: officer.id });
                    if (data.items.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportAllFarmerStockPDF(data.items, `All Farmer Stock `, true, getReportSubtitle(officer))
                                : await exportAllFarmerStockExcel(data.items, `All Farmer Stock `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportAllFarmerStockPDF([], "All Farmer Stock") : exportAllFarmerStockExcel([], "All Farmer Stock");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "All Farmer Stock") : generateMultiSheetExcel(sheets, "All Farmer Stock");
            }
        }
        const data = await utils.officer.farmers.getMany.fetch({ orgId, pageSize: 500 });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportAllFarmerStockPDF(data.items, getReportTitle("All Farmer Stock"), false, subtitle) : exportAllFarmerStockExcel(data.items, getReportTitle("All Farmer Stock"), false, subtitle);
    };

    const fetchProblematicFeeds = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        const orgId = membership?.orgId ?? "";
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.farmers.getProblematicFeeds.fetch({ orgId, officerId });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportProblematicFeedsPDF(data, getReportTitle("Problematic Feeds"), false, subtitle) : exportProblematicFeedsExcel(data, getReportTitle("Problematic Feeds"), false, subtitle);
            } else {
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.farmers.getProblematicFeeds.fetch({ orgId, officerId: officer.id });
                    if (data.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportProblematicFeedsPDF(data, `Problematic Feeds `, true, getReportSubtitle(officer))
                                : await exportProblematicFeedsExcel(data, `Problematic Feeds `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportProblematicFeedsPDF([], "Problematic Feeds") : exportProblematicFeedsExcel([], "Problematic Feeds");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "Problematic Feeds") : generateMultiSheetExcel(sheets, "Problematic Feeds");
            }
        }
        const data = await utils.officer.farmers.getProblematicFeeds.fetch({ orgId });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportProblematicFeedsPDF(data, getReportTitle("Problematic Feeds"), false, subtitle) : exportProblematicFeedsExcel(data, getReportTitle("Problematic Feeds"), false, subtitle);
    };

    const fetchSalesLedger = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        const orgId = membership?.orgId ?? "";
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.sales.getRecentSales.fetch({ limit: 100, officerId, orgId });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportSalesLedgerPDF(data as any, getReportTitle("Sales Ledger"), false, subtitle) : exportSalesLedgerExcel(data as any, getReportTitle("Sales Ledger"), false, subtitle);
            } else {
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.sales.getRecentSales.fetch({ limit: 100, officerId: officer.id, orgId });
                    if (data.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportSalesLedgerPDF(data as any, `Recent Sales `, true, getReportSubtitle(officer))
                                : await exportSalesLedgerExcel(data as any, `Recent Sales `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportSalesLedgerPDF([], "Recent Sales") : exportSalesLedgerExcel([], "Recent Sales");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "Recent Sales Ledger", true) : generateMultiSheetExcel(sheets, "Recent Sales Ledger");
            }
        }
        const data = await utils.officer.sales.getRecentSales.fetch({ limit: 100 });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportSalesLedgerPDF(data, getReportTitle("Recent Sales"), false, subtitle) : exportSalesLedgerExcel(data, getReportTitle("Recent Sales"), false, subtitle);
    };

    const fetchDocPlacement = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.reports.getRangeDocPlacements.fetch({ orgId: membership?.orgId ?? "", officerId, startMonth: startMonth + 1, startYear, endMonth: endMonth + 1, endYear });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportRangeDocPlacementsPDF(data, getReportTitle("DOC Placement"), false, subtitle) : exportRangeDocPlacementsExcel(data, getReportTitle("DOC Placement"), false, subtitle);
            } else {
                const orgId = membership?.orgId ?? "";
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.reports.getRangeDocPlacements.fetch({ orgId, officerId: officer.id, startMonth: startMonth + 1, startYear, endMonth: endMonth + 1, endYear });
                    if (data?.farmers?.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportRangeDocPlacementsPDF(data, `DOC Placements `, true, getReportSubtitle(officer))
                                : await exportRangeDocPlacementsExcel(data, `DOC Placements `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportRangeDocPlacementsPDF({}, "DOC Placement") : exportRangeDocPlacementsExcel({}, "DOC Placement");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "DOC Placement Report") : generateMultiSheetExcel(sheets, "DOC Placement Report");
            }
        }
        const data = await utils.officer.reports.getRangeDocPlacements.fetch({ startMonth: startMonth + 1, startYear, endMonth: endMonth + 1, endYear });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportRangeDocPlacementsPDF(data, getReportTitle("DOC Placement"), false, subtitle) : exportRangeDocPlacementsExcel(data, getReportTitle("DOC Placement"), false, subtitle);
    };

    const processProductionData = (rawData: any[]) => {
        const data: any[] = [];
        rawData.forEach((monthEntry: any) => {
            for (const key of Object.keys(monthEntry)) {
                if (!isNaN(Number(key))) {
                    data.push({ ...monthEntry[key], monthName: monthEntry.monthName, year: monthEntry.year, monthKey: `${monthEntry.year}-${monthEntry.monthName}` });
                }
            }
        });
        return data;
    };

    const fetchProduction = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        if (isManagement) {
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const orgId = membership?.orgId ?? "";
                const rawData = await utils.management.performanceReports.getRangeProductionRecords.fetch({ orgId, officerId, startMonth, startYear, endMonth, endYear });
                const dataToExport = processProductionData(rawData);
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportRangeProductionPDF(dataToExport, getReportTitle("Monthly Production Efficiency"), false, subtitle) : exportRangeProductionExcel(dataToExport, getReportTitle("Monthly Production Efficiency"), false, subtitle);
            } else {
                const orgId = membership?.orgId ?? "";
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const rawData = await utils.management.performanceReports.getRangeProductionRecords.fetch({ orgId, officerId: officer.id, startMonth, startYear, endMonth, endYear });
                    const data = processProductionData(rawData);
                    if (data.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportRangeProductionPDF(data, `Production `, true, getReportSubtitle(officer))
                                : await exportRangeProductionExcel(data, `Production `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportRangeProductionPDF([], "Monthly Production Efficiency") : exportRangeProductionExcel([], "Monthly Production Efficiency");
                return type === 'pdf' ? generateMultiSheetPDF(sheets, "Monthly Production Efficiency", true) : generateMultiSheetExcel(sheets, "Monthly Production Efficiency");
            }
        }
        const rawData = await utils.officer.performanceReports.getRangeProductionRecords.fetch({ startMonth, startYear, endMonth, endYear });
        const data = processProductionData(rawData);
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportRangeProductionPDF(data, getReportTitle("Monthly Production Efficiency"), false, subtitle) : exportRangeProductionExcel(data, getReportTitle("Monthly Production Efficiency"), false, subtitle);
    };

    const fetchYearlyPerformance = async (type: 'pdf' | 'excel', lockedSelection?: LockedOfficer) => {
        if (isManagement) {
            const orgId = membership?.orgId ?? "";
            const officerId = lockedSelection ? lockedSelection.id : selectedOfficerId;
            if (officerId) {
                const data = await utils.management.performanceReports.getAnnualPerformance.fetch({ orgId, officerId, year: startYear });
                const subtitle = getReportSubtitle(undefined, lockedSelection);
                return type === 'pdf' ? exportYearlyPerformancePDF(data, getReportTitle(`Annual Performance ${startYear}`), false, subtitle) : exportYearlyPerformanceExcel(data, getReportTitle(`Annual Performance ${startYear}`), false, subtitle);
            } else {
                const officers = await utils.management.performanceReports.getOfficersInOrg.fetch({ orgId });
                const officerPromises = officers.map(async (officer: any) => {
                    const data = await utils.management.performanceReports.getAnnualPerformance.fetch({ orgId, officerId: officer.id, year: startYear });
                    if (data?.monthlyData?.length > 0) {
                        return {
                            sheetName: officer.name,
                            options: type === 'pdf'
                                ? await exportYearlyPerformancePDF(data, `Performance `, true, getReportSubtitle(officer))
                                : await exportYearlyPerformanceExcel(data, `Performance `, true, getReportSubtitle(officer))
                        };
                    }
                    return null;
                });
                const results = await Promise.all(officerPromises);
                const sheets = results.filter(Boolean) as any[];
                if (sheets.length === 0) return type === 'pdf' ? exportYearlyPerformancePDF({ monthlyData: [] }, `Annual Performance ${startYear}`) : exportYearlyPerformanceExcel({ monthlyData: [] }, `Annual Performance ${startYear}`);
                return type === 'pdf' ? generateMultiSheetPDF(sheets, `Annual Performance Report ${startYear}`, true) : generateMultiSheetExcel(sheets, `Annual Performance Report ${startYear}`);
            }
        }
        const data = await utils.officer.performanceReports.getAnnualPerformance.fetch({ year: startYear, officerId: undefined });
        const subtitle = getReportSubtitle();
        return type === 'pdf' ? exportYearlyPerformancePDF(data, getReportTitle(`Annual Performance ${startYear}`), false, subtitle) : exportYearlyPerformanceExcel(data, getReportTitle(`Annual Performance ${startYear}`), false, subtitle);
    };

    const handleActiveStock = (type: 'pdf' | 'excel') => handleExport(`Active Stock Report`, type, () => fetchActiveStock(type));
    const handleAllFarmerStock = (type: 'pdf' | 'excel') => handleExport(`All Farmer Stock Report`, type, () => fetchAllFarmerStock(type));
    const handleProblematicFeeds = (type: 'pdf' | 'excel') => handleExport(`Problematic Feeds Report`, type, () => fetchProblematicFeeds(type));
    const handleSalesLedger = (type: 'pdf' | 'excel') => handleExport(`Sales Ledger Report`, type, () => fetchSalesLedger(type));
    const handleDocPlacement = (type: 'pdf' | 'excel') => handleExport(`DOC Placement Report`, type, () => fetchDocPlacement(type));
    const handleProduction = (type: 'pdf' | 'excel') => handleExport(`Monthly Production Report`, type, () => fetchProduction(type));
    const handleYearlyPerformance = (type: 'pdf' | 'excel') => handleExport(`Yearly Performance Report`, type, () => fetchYearlyPerformance(type));

    const handleDownloadAll = async () => {
        setIsBulkExporting(true);
        setBulkProgress(0);
        setStopRequested(false);
        stopRequestedRef.current = false;
        setSessionFiles([]);
        const createdFiles: { uri: string, name: string, type: string }[] = [];

        const lockedSelection: LockedOfficer = {
            id: selectedOfficerId,
            name: selectedOfficerName,
            branch: selectedBranch,
            mobile: selectedMobile
        };

        const reports = [
            { name: "Active Stock", fetcher: (t: any) => fetchActiveStock(t, lockedSelection) },
            { name: "All Farmer Stock", fetcher: (t: any) => fetchAllFarmerStock(t, lockedSelection) },
            { name: "Problematic Feeds", fetcher: (t: any) => fetchProblematicFeeds(t, lockedSelection) },
            { name: "Recent Sales", fetcher: (t: any) => fetchSalesLedger(t, lockedSelection) },
            { name: "DOC Placements", fetcher: (t: any) => fetchDocPlacement(t, lockedSelection) },
            { name: "Monthly Production", fetcher: (t: any) => fetchProduction(t, lockedSelection) },
            { name: "Yearly Performance", fetcher: (t: any) => fetchYearlyPerformance(t, lockedSelection) },
        ];

        const officerPrefix = isManagement ? (lockedSelection.id ? lockedSelection.name?.split(' ')[0] : "All_Officers") : (sessionData?.user?.name?.split(' ')[0] || "My");
        const prefix = `${sanitizeFileName(officerPrefix || "")}_`;

        const totalTasks = reports.length * 2;
        let completed = 0;

        try {
            let activeDir = directoryUri;

            for (const report of reports) {
                if (stopRequestedRef.current) break;

                // PDF
                setCurrentBulkTask(`${report.name} (PDF)`);
                const pdfUri = await report.fetcher('pdf');
                createdFiles.push({
                    uri: pdfUri,
                    name: `${prefix}${sanitizeFileName(report.name)}.pdf`,
                    type: 'application/pdf'
                });
                setSessionFiles(createdFiles.map(f => f.uri));
                completed++;
                setBulkProgress(Math.floor((completed / totalTasks) * 100));

                if (stopRequestedRef.current) break;

                // Excel
                setCurrentBulkTask(`${report.name} (Excel)`);
                const excelUri = await report.fetcher('excel');
                createdFiles.push({
                    uri: excelUri,
                    name: `${prefix}${sanitizeFileName(report.name)}.xlsx`,
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                setSessionFiles(createdFiles.map(f => f.uri));
                completed++;
                setBulkProgress(Math.floor((completed / totalTasks) * 100));
            }

            if (stopRequestedRef.current) {
                toast.info("Generation Stopped", { description: "Removing partially created files..." });
                await deleteInternalFiles(createdFiles.map(f => f.uri));
                toast.success("Stopped and cleaned up.");
            } else {
                setCurrentBulkTask("Saving to Device...");
                for (const file of createdFiles) {
                    const usedDir = await downloadFileToDevice(file.uri, file.name, file.type, activeDir, true);
                    if (usedDir && !activeDir) {
                        activeDir = usedDir;
                        await saveDirectoryUri(usedDir);
                    }
                }
                toast.success("All Reports Downloaded", { description: "Verified and saved to your device." });
            }
        } catch (e) {
            console.error(e);
            toast.error("Bulk download failed partially.");
        } finally {
            setIsBulkExporting(false);
            setCurrentBulkTask("");
        }
    };

    const sanitizeFileName = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const renderReportCard = (title: string, description: string, icon: any, onExcel?: () => void, onPdf?: () => void, children?: React.ReactNode) => (
        <Card className="mb-4 overflow-hidden border-border/50">
            <CardContent className="p-5">
                <View className="flex-row items-center gap-4 mb-4">
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center border border-primary/20">
                        <Icon as={icon} size={24} className="text-primary" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-black text-foreground uppercase tracking-tight">{title}</Text>
                        <Text variant="muted" className="text-xs font-medium leading-4">{description}</Text>
                    </View>
                </View>

                {children}

                <View className="flex-row gap-3">
                    {onExcel && (
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-emerald-500/20 bg-emerald-500/5 active:bg-emerald-500/10"
                            onPress={onExcel}
                            disabled={isExporting}
                        >
                            <View className="flex-row items-center gap-2">
                                <Icon as={Table} size={18} className="text-emerald-600" />
                                <Text className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Excel</Text>
                            </View>
                        </Button>
                    )}
                    {onPdf && (
                        <Button
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-rose-500/20 bg-rose-500/5 active:bg-rose-500/10"
                            onPress={onPdf}
                            disabled={isExporting}
                        >
                            <View className="flex-row items-center gap-2">
                                <Icon as={FileText} size={18} className="text-rose-600" />
                                <Text className="text-rose-700 font-bold uppercase tracking-wider text-[10px]">PDF</Text>
                            </View>
                        </Button>
                    )}
                </View>
            </CardContent>
        </Card>
    );

    const renderRangePicker = (isAnnual = false) => (
        <View className="mb-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">{isAnnual ? 'Select Year' : 'Time Range'}</Text>

            <View className="flex-row gap-4 mb-2">
                <View className="flex-1">
                    <Text className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{isAnnual ? 'Annual Report' : 'From'}</Text>
                    <View className="flex-row gap-2">
                        {!isAnnual && (
                            <Pressable onPress={() => setStartMonthPickerOpen(true)} className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 h-10 justify-center">
                                <Text className="text-xs font-bold text-foreground text-center" numberOfLines={1}>{MONTHS[startMonth]}</Text>
                            </Pressable>
                        )}
                        <Pressable onPress={() => setStartYearPickerOpen(true)} className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 h-10 justify-center">
                            <Text className="text-xs font-bold text-foreground text-center">{startYear}</Text>
                        </Pressable>
                    </View>
                </View>
                {!isAnnual && (
                    <View className="flex-1">
                        <Text className="text-[10px] font-bold text-muted-foreground uppercase mb-1">To</Text>
                        <View className="flex-row gap-2">
                            <Pressable onPress={() => setEndMonthPickerOpen(true)} className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 h-10 justify-center">
                                <Text className="text-xs font-bold text-foreground text-center" numberOfLines={1}>{MONTHS[endMonth]}</Text>
                            </Pressable>
                            <Pressable onPress={() => setEndYearPickerOpen(true)} className="flex-1 bg-background border border-border/50 rounded-xl px-3 py-2 h-10 justify-center">
                                <Text className="text-xs font-bold text-foreground text-center">{endYear}</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );

    const renderPickerModal = (visible: boolean, onClose: () => void, title: string, items: any[], onSelect: (val: any) => void, currentVal: any) => (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable onPress={onClose} className="flex-1 bg-black/60 items-center justify-center p-6">
                <View className="bg-card w-full rounded-[2rem] p-6 border border-border/50 max-h-[80%]">
                    <Text className="text-lg font-black uppercase tracking-tight mb-4 ml-1">{title}</Text>
                    <ScrollView keyboardShouldPersistTaps="handled" >
                        <View className="flex-row flex-wrap gap-2">
                            {items.map((item, idx) => (
                                <Button
                                    key={idx}
                                    onPress={() => onSelect(typeof item === 'number' ? item : idx)}
                                    variant={(typeof item === 'number' ? item === currentVal : idx === currentVal) ? "default" : "secondary"}
                                    className={`h-10 px-4 rounded-xl ${typeof item === 'number' ? 'w-full' : 'min-w-[30%]'}`}
                                >
                                    <Text className={`text-xs font-black uppercase ${(typeof item === 'number' ? item === currentVal : idx === currentVal) ? "text-primary-foreground" : "text-foreground"}`}>{item}</Text>
                                </Button>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Pressable>
        </Modal>
    );

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Download Reports" />

            <ScrollView keyboardShouldPersistTaps="handled" className="flex-1" contentContainerStyle={{ padding: 20 }}>
                {isManagement && (
                    <View className="mb-6">
                        <OfficerSelector orgId={membership?.orgId ?? ""} disabled={isBulkExporting} />
                    </View>
                )}

                <Button
                    variant="default"
                    className={`mb-6 h-16 rounded-sm border-primary/20 bg-primary dark:bg-primary/60 shadow-xl shadow-primary/20 ${isExporting && !isBulkExporting ? 'opacity-50' : 'active:scale-95'} ${isBulkExporting ? 'dark:bg-blue-500 active:bg-blue-500' : ''}  ${isBulkExporting && stopRequested ? 'dark:bg-red-500 active:bg-red-500' : ''}`}
                    onPress={() => {
                        if (isBulkExporting) {
                            setStopRequested(true);
                            stopRequestedRef.current = true;
                        } else {
                            handleDownloadAll();
                        }
                    }}
                    disabled={isExporting && !isBulkExporting}
                >
                    <View className="flex-row items-center gap-3 relative w-full px-5">
                        <View className="w-10 h-10 items-center justify-center z-10 relative">
                            {isBulkExporting ? (
                                <AnimatedCircularProgress progress={bulkProgress} stopRequested={stopRequested} />
                            ) : (
                                <View className="w-full h-full rounded-2xl bg-white/20 items-center justify-center">
                                    <Icon as={ShoppingBag} size={20} className="text-white" />
                                </View>
                            )}
                        </View>
                        <View className="flex-1 z-10">
                            <Text className="text-white font-black uppercase tracking-tight text-lg">
                                {isBulkExporting
                                    ? (stopRequested ? "Reverting changes..." : `Saving [ Tap to stop ]`)
                                    : "Download All Reports"}
                            </Text>
                            <Text className="text-white/70 text-[10px] font-bold uppercase tracking-widest" numberOfLines={1}>
                                {isBulkExporting
                                    ? (stopRequested ? "Cleaning up temporary files" : `${currentBulkTask !== "Saving to Device..." ? "Generating " : ""}${currentBulkTask}...`)
                                    : "Generate & Save Day Folder"}
                            </Text>
                        </View>
                    </View>
                </Button>

                <Text className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">📦 Stock Reports</Text>

                {renderReportCard(
                    "Active Farmer Cycles",
                    "Detailed list of all ongoing cycles with DOC, age, and individual inventory status.",
                    Bird,
                    () => handleActiveStock('excel'),
                    () => handleActiveStock('pdf')
                )}

                {renderReportCard(
                    "All Farmer Stock",
                    "Comprehensive report of all farmers and their current total feed main stock bridge.",
                    ClipboardList,
                    () => handleAllFarmerStock('excel'),
                    () => handleAllFarmerStock('pdf')
                )}

                {renderReportCard(
                    "Problematic Feeds",
                    "List of active farmers who currently have a problematic feed balance greater than zero.",
                    AlertTriangle,
                    () => handleProblematicFeeds('excel'),
                    () => handleProblematicFeeds('pdf')
                )}

                <Text className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-4 mb-4">💰 Sales Reports</Text>

                {renderReportCard(
                    "Recent Sales Ledger",
                    "List of the most recent sales transactions across all cycles (Last 100).",
                    ShoppingBag,
                    () => handleSalesLedger('excel'),
                    () => handleSalesLedger('pdf')
                )}

                <Text className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-4 mb-4">📊 Performance Reports</Text>

                {renderReportCard(
                    "DOC Placements",
                    "Range-based overview of chicks placed across the organization.",
                    TrendingUp,
                    () => handleDocPlacement('excel'),
                    () => handleDocPlacement('pdf'),
                    renderRangePicker()
                )}

                {renderReportCard(
                    "Monthly Production",
                    "Efficiency analysis comparing feed consumption vs live weight production.",
                    BarChart3,
                    () => handleProduction('excel'),
                    () => handleProduction('pdf'),
                    renderRangePicker()
                )}

                {renderReportCard(
                    "Yearly Performance",
                    "Full annual breakdown of metrics including FCR, EPI, and Survival rates.",
                    BarChart3,
                    () => handleYearlyPerformance('excel'),
                    () => handleYearlyPerformance('pdf'),
                    renderRangePicker(true)
                )}

                <View className="h-10" />
            </ScrollView>

            {isExporting && (
                <View className="absolute inset-0 bg-background/80 items-center justify-center z-50">
                    <LoadingState title="Generating Report" description="Please wait while we crunch the numbers..." />
                </View>
            )}

            {previewData && (
                <ExportPreviewDialog
                    visible={previewVisible}
                    onClose={() => setPreviewVisible(false)}
                    title={previewData.title}
                    type={previewData.type}
                    onView={() => openFile(previewData.uri, previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                    onShare={() => shareFile(previewData.uri, previewData.title, previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                    onDownload={isBulkExporting ? undefined : async () => {
                        const usedDir = await downloadFileToDevice(
                            previewData.uri,
                            previewData.title + (previewData.type === 'pdf' ? '.pdf' : '.xlsx'),
                            previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            directoryUri
                        );
                        if (usedDir && !directoryUri) {
                            await saveDirectoryUri(usedDir);
                        }
                    }}
                />
            )}



            {renderPickerModal(startMonthPickerOpen, () => setStartMonthPickerOpen(false), "Select Start Month", MONTHS, (v) => { setStartMonth(v); setStartMonthPickerOpen(false); }, startMonth)}
            {renderPickerModal(startYearPickerOpen, () => setStartYearPickerOpen(false), "Select Start Year", YEARS, (v) => { setStartYear(v); setStartYearPickerOpen(false); }, startYear)}
            {renderPickerModal(endMonthPickerOpen, () => setEndMonthPickerOpen(false), "Select End Month", MONTHS, (v) => { setEndMonth(v); setEndMonthPickerOpen(false); }, endMonth)}
            {renderPickerModal(endYearPickerOpen, () => setEndYearPickerOpen(false), "Select End Year", YEARS, (v) => { setEndYear(v); setEndYearPickerOpen(false); }, endYear)}
        </View>
    );
}
