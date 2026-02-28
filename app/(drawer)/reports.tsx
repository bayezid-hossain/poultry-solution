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
    openFile,
    shareFile
} from "@/lib/export";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, Bird, ClipboardList, FileText, ShoppingBag, Table, TrendingUp } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function ReportsScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

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
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewData, setPreviewData] = useState<{ uri: string, type: 'pdf' | 'excel', title: string } | null>(null);

    // TRPC Utils
    const utils = trpc.useUtils();
    const { directoryUri } = useStorage();

    const handleExport = async (reportName: string, type: 'pdf' | 'excel', fetcher: () => Promise<string>) => {
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
        return <ProBlocker feature="Download Reports" description="Unlock comprehensive analytical reports and data exports across your farm operations." />;
    }

    const handleActiveStock = (type: 'pdf' | 'excel') => {
        handleExport(`Active_Stock_${new Date().toLocaleDateString()}`, type, async () => {
            const data = await utils.officer.cycles.listActive.fetch({ orgId: membership?.orgId ?? "", pageSize: 500 });
            return type === 'pdf' ? exportActiveStockPDF(data.items, "Active Stock Report") : exportActiveStockExcel(data.items, "Active Stock Report");
        });
    };

    const handleAllFarmerStock = (type: 'pdf' | 'excel') => {
        handleExport(`All_Farmer_Stock_${new Date().toLocaleDateString()}`, type, async () => {
            const data = await utils.officer.farmers.getMany.fetch({ orgId: membership?.orgId ?? "", pageSize: 500 });
            return type === 'pdf' ? exportAllFarmerStockPDF(data.items, "All Farmer Stock") : exportAllFarmerStockExcel(data.items, "All Farmer Stock");
        });
    };

    const handleProblematicFeeds = (type: 'pdf' | 'excel') => {
        handleExport(`Problematic_Feeds_${new Date().toLocaleDateString()}`, type, async () => {
            // Note: Uses different endpoint logic based on role
            const orgId = membership?.orgId ?? "";
            const data = await (isManagement
                ? utils.management.farmers.getProblematicFeeds.fetch({ orgId })
                : utils.officer.farmers.getProblematicFeeds.fetch({ orgId }));

            return type === 'pdf' ? exportProblematicFeedsPDF(data, "Problematic Feeds") : exportProblematicFeedsExcel(data, "Problematic Feeds");
        });
    };

    const handleSalesLedger = (type: 'pdf' | 'excel') => {
        handleExport(`Sales_Ledger_${new Date().toLocaleDateString()}`, type, async () => {
            const data = await utils.officer.sales.getRecentSales.fetch({ limit: 100 });
            return type === 'pdf' ? exportSalesLedgerPDF(data, "Recent Sales Ledger") : exportSalesLedgerExcel(data, "Recent Sales Ledger");
        });
    };

    const handleDocPlacement = (type: 'pdf' | 'excel') => {
        handleExport(`DOC_Placement_${MONTHS[startMonth]}_${startYear}_to_${MONTHS[endMonth]}_${endYear}`, type, async () => {
            const data = await utils.officer.reports.getRangeDocPlacements.fetch({
                startMonth: startMonth + 1,
                startYear,
                endMonth: endMonth + 1,
                endYear
            });
            return type === 'pdf' ? exportRangeDocPlacementsPDF(data, "DOC Placement Report") : exportRangeDocPlacementsExcel(data, "DOC Placement Report");
        });
    };

    const handleProduction = (type: 'pdf' | 'excel') => {
        handleExport(`Production_Report_${MONTHS[startMonth]}_${startYear}_to_${MONTHS[endMonth]}_${endYear}`, type, async () => {
            const rawData = await utils.officer.performanceReports.getRangeProductionRecords.fetch({
                startMonth,
                startYear,
                endMonth,
                endYear
            });

            // rawData is per-month arrays of FarmerProductionRecord[]. Flatten into a list of records.
            const data: any[] = [];
            rawData.forEach((monthEntry: any) => {
                for (const key of Object.keys(monthEntry)) {
                    if (!isNaN(Number(key))) {
                        data.push({
                            ...monthEntry[key],
                            monthName: monthEntry.monthName,
                            year: monthEntry.year,
                            monthKey: `${monthEntry.year}-${monthEntry.monthName}`
                        });
                    }
                }
            });

            return type === 'pdf' ? exportRangeProductionPDF(data, "Monthly Production Efficiency") : exportRangeProductionExcel(data, "Monthly Production Efficiency");
        });
    };

    const handleYearlyPerformance = (type: 'pdf' | 'excel') => {
        handleExport(`Annual_Performance_${startYear}`, type, async () => {
            const data = await utils.officer.performanceReports.getAnnualPerformance.fetch({
                year: startYear,
                officerId: isManagement ? (selectedOfficerId || undefined) : undefined
            });
            return type === 'pdf' ? exportYearlyPerformancePDF(data, `Annual Performance Report ${startYear}`) : exportYearlyPerformanceExcel(data, `Annual Performance Report ${startYear}`);
        });
    };

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
                    <ScrollView>
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

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
                {isManagement && (
                    <View className="mb-6">
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    </View>
                )}

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
                    onDownload={() => downloadFileToDevice(previewData.uri, previewData.title + (previewData.type === 'pdf' ? '.pdf' : '.xlsx'), previewData.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', directoryUri)}
                />
            )}

            {renderPickerModal(startMonthPickerOpen, () => setStartMonthPickerOpen(false), "Select Start Month", MONTHS, (v) => { setStartMonth(v); setStartMonthPickerOpen(false); }, startMonth)}
            {renderPickerModal(startYearPickerOpen, () => setStartYearPickerOpen(false), "Select Start Year", YEARS, (v) => { setStartYear(v); setStartYearPickerOpen(false); }, startYear)}
            {renderPickerModal(endMonthPickerOpen, () => setEndMonthPickerOpen(false), "Select End Month", MONTHS, (v) => { setEndMonth(v); setEndMonthPickerOpen(false); }, endMonth)}
            {renderPickerModal(endYearPickerOpen, () => setEndYearPickerOpen(false), "Select End Year", YEARS, (v) => { setEndYear(v); setEndYearPickerOpen(false); }, endYear)}
        </View>
    );
}
