/// <reference types="nativewind/types" />
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "expo-router";
import { ChevronDown, FileText, Table } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";

const MONTHS_SHORT = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

export default function PerformanceScreen() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [yearPickerOpen, setYearPickerOpen] = useState(false);
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    if (!membership?.isPro) {
        return <ProBlocker feature="Performance Reports" description="Access advanced flock performance metrics, FCR, and EPI analytics." />;
    }

    const { data, isLoading, refetch } = trpc.officer.performanceReports.getAnnualPerformance.useQuery(
        { year, officerId: isManagement ? (selectedOfficerId || undefined) : undefined },
    );

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    const fmtNum = (v: number | undefined | null) => {
        if (!v || v === 0) return '–';
        return v.toLocaleString();
    };

    const fmtDec = (v: number | undefined | null, decimals = 2) => {
        if (!v || v === 0) return '–';
        return v.toFixed(decimals);
    };

    const fmtPct = (v: number | undefined | null) => {
        if (!v || v === 0) return '–';
        return `${v.toFixed(1)}%`;
    };

    // Determine FCR rating label
    const getFCRLabel = (fcr: number) => {
        if (fcr <= 0) return null;
        if (fcr <= 1.6) return { label: '↗ Excellent', color: 'text-emerald-500' };
        if (fcr <= 1.8) return { label: '↗ Good', color: 'text-green-500' };
        if (fcr <= 2.0) return { label: '→ Average', color: 'text-amber-500' };
        return { label: '↘ Poor', color: 'text-red-500' };
    };

    const soldPercent = data && data.totalChicksIn > 0
        ? ((data.totalChicksSold / data.totalChicksIn) * 100).toFixed(1)
        : '0';

    const fcrLabel = data ? getFCRLabel(data.averageFCR) : null;

    const exportPdf = async () => {
        if (!data) return;
        const html = `
            <div class="section-title">Summary Performance Overview - ${year}</div>
            <div class="kpi-container">
                <div class="kpi-card">
                    <div class="kpi-value">${fmtNum(data.totalChicksIn)}</div>
                    <div class="kpi-label">Total DOC Placed</div>
                    <div class="kpi-note">Total birds started in ${year}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${fmtNum(data.totalChicksSold)}</div>
                    <div class="kpi-label">Total Sold</div>
                    <div class="kpi-note">${soldPercent}% of total placed</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${fmtDec(data.averageFCR)}</div>
                    <div class="kpi-label">Average FCR</div>
                    <div class="kpi-note">${fcrLabel?.label || ''}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-value">${fmtDec(data.averageEPI, 0)}</div>
                    <div class="kpi-label">Average EPI</div>
                    <div class="kpi-note">${fmtPct(data.averageSurvivalRate)} survival rate</div>
                </div>
            </div>

            <div class="section-title">Monthly Performance Breakdown</div>
            <table>
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Chicks In</th>
                        <th>Sold</th>
                        <th>EPI</th>
                        <th>FCR</th>
                        <th>Survival</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.monthlyData.map((m: any, idx: number) => `
                        <tr>
                            <td>${MONTHS_SHORT[idx]}</td>
                            <td>${m.chicksIn}</td>
                            <td>${m.chicksSold}</td>
                            <td>${m.epi > 0 ? Math.round(m.epi) : '-'}</td>
                            <td>${m.fcr > 0 ? m.fcr.toFixed(2) : '-'}</td>
                            <td>${m.survivalRate > 0 ? (m.survivalRate * 100).toFixed(1) + '%' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p><b>FCR (Feed Conversion Ratio)</b> = Total Feed Consumed / Total Weight Gain</p>
                <p><b>EPI (European Production Index)</b> = (Survival % × Body Weight) / (Age × FCR) × 10</p>
            </div>
        `;
        try { await exportToPDF({ title: `Performance_Report_${year}`, htmlContent: html }); }
        catch (e) { Alert.alert("Export Failed", "Error generating PDF."); }
    };

    const exportExcel = async () => {
        if (!data) return;

        const summaryData = [
            { Metric: "Total DOC Placed", Value: data.totalChicksIn },
            { Metric: "Total Sold", Value: data.totalChicksSold },
            { Metric: "Average FCR", Value: data.averageFCR.toFixed(2) },
            { Metric: "Average EPI", Value: data.averageEPI.toFixed(0) },
            { Metric: "Average Survival Rate", Value: (data.averageSurvivalRate * 100).toFixed(1) + "%" }
        ];

        const rawData = data.monthlyData.map((m: any, idx: number) => ({
            Month: MONTHS_SHORT[idx],
            "Chicks In": m.chicksIn,
            Sold: m.chicksSold,
            "Avg Age (days)": m.averageAge > 0 ? Math.round(m.averageAge) : 0,
            "Total Weight (kg)": m.totalBirdWeight,
            "Feed (kg)": m.feedConsumption,
            "Survival %": m.survivalRate > 0 ? (m.survivalRate * 100).toFixed(1) : 0,
            EPI: m.epi > 0 ? Math.round(m.epi) : 0,
            FCR: m.fcr > 0 ? Number(m.fcr.toFixed(3)) : 0,
            "Avg Price": m.averagePrice
        }));

        try {
            await exportToExcel({
                title: `Performance_Report_${year}`,
                summaryData,
                rawHeaders: ["Month", "Chicks In", "Sold", "Avg Age (days)", "Total Weight (kg)", "Feed (kg)", "Survival %", "EPI", "FCR", "Avg Price"],
                rawDataTable: rawData,
                definitions: [
                    { Metric: "FCR", Calculation: "Feed Consumed / Body Weight" },
                    { Metric: "EPI", Calculation: "(SurvivalRate * BodyWeight) / (Age * FCR) * 10" }
                ]
            });
        } catch (e) { Alert.alert("Export Failed", "Error generating Excel."); }
    };

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Performance" />

            <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
                {/* Title */}
                <View className="mb-4">
                    <Text className="text-3xl font-black text-foreground mb-1">Performance Reports</Text>
                    <Text className="text-sm text-muted-foreground opacity-70">
                        Monthly broiler performance metrics and analytics
                    </Text>
                </View>

                {/* Year Dropdown + Officer Selector */}
                <View className="flex-row items-center gap-3 mb-6">
                    <Pressable
                        onPress={() => setYearPickerOpen(true)}
                    >
                        <View className="flex-row items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-4 h-10">
                            <Text className="text-sm font-bold text-foreground">{year}</Text>
                            <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
                        </View>
                    </Pressable>
                    {isManagement && (
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    )}
                    <View className="flex-1" />
                    <View className="flex-row gap-2">
                        <Pressable onPress={exportExcel} className="w-10 h-10 rounded-xl bg-emerald-500/10 items-center justify-center border border-emerald-500/20 active:bg-emerald-500/20">
                            <Icon as={Table} size={18} className="text-emerald-600" />
                        </Pressable>
                        <Pressable onPress={exportPdf} className="w-10 h-10 rounded-xl bg-destructive/10 items-center justify-center border border-destructive/20 active:bg-destructive/20">
                            <Icon as={FileText} size={18} className="text-destructive" />
                        </Pressable>
                    </View>
                </View>

                {isLoading ? (
                    <View className="items-center justify-center py-12">
                        <BirdyLoader size={48} color={"#10b981"} />
                        <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Crunching performance data...
                        </Text>
                    </View>
                ) : data ? (
                    <>
                        {/* KPI Cards */}
                        <View className="gap-3 mb-8">
                            {/* Total DOC Placed */}
                            <Card className="border-border/50 bg-card overflow-hidden">
                                <View className="flex-row">
                                    <View className="w-1 bg-emerald-500" />
                                    <CardContent className="p-5 flex-1">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Total DOC Placed</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {fmtNum(data.totalChicksIn)}
                                        </Text>
                                        <Text className="text-[10px] font-bold text-muted-foreground opacity-60 mt-1">
                                            Birds started in {year}
                                        </Text>
                                    </CardContent>
                                </View>
                            </Card>

                            {/* Total Sold */}
                            <Card className="border-border/50 bg-card overflow-hidden">
                                <View className="flex-row">
                                    <View className="w-1 bg-amber-500" />
                                    <CardContent className="p-5 flex-1">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Total Sold</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {fmtNum(data.totalChicksSold)}
                                        </Text>
                                        <Text className="text-[10px] font-bold text-muted-foreground opacity-60 mt-1">
                                            {soldPercent}% of total placed
                                        </Text>
                                    </CardContent>
                                </View>
                            </Card>

                            {/* Avg FCR */}
                            <Card className="border-border/50 bg-card overflow-hidden">
                                <View className="flex-row">
                                    <View className="w-1 bg-red-500" />
                                    <CardContent className="p-5 flex-1">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Avg FCR</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {fmtDec(data.averageFCR)}
                                        </Text>
                                        {fcrLabel && (
                                            <Text className={`text-[10px] font-bold mt-1 ${fcrLabel.color}`}>
                                                {fcrLabel.label}
                                            </Text>
                                        )}
                                    </CardContent>
                                </View>
                            </Card>

                            {/* Avg EPI */}
                            <Card className="border-border/50 bg-card overflow-hidden">
                                <View className="flex-row">
                                    <View className="w-1 bg-blue-500" />
                                    <CardContent className="p-5 flex-1">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Avg EPI</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {fmtDec(data.averageEPI, 0)}
                                        </Text>
                                        <Text className="text-[10px] font-bold text-muted-foreground opacity-60 mt-1">
                                            {fmtPct(data.averageSurvivalRate)} survival rate
                                        </Text>
                                    </CardContent>
                                </View>
                            </Card>
                        </View>

                        {/* Monthly Breakdown */}
                        <View className="mb-4">
                            <Text className="text-lg font-black uppercase tracking-tight text-primary">Monthly Breakdown</Text>
                            <Text className="text-xs text-muted-foreground opacity-60">
                                Detailed performance metrics for each month of {year}
                            </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View>
                                {/* Table Header */}
                                <View className="flex-row border-b border-border/50 pb-3 mb-1">
                                    <View className="w-24 px-2"><Text className="text-[9px] font-black text-muted-foreground uppercase">Month</Text></View>
                                    <View className="w-20 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Chicks In</Text></View>
                                    <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Sold</Text></View>
                                    <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Age</Text></View>
                                    <View className="w-20 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Weight</Text></View>
                                    <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Feed</Text></View>
                                    <View className="w-20 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Survival</Text></View>
                                    <View className="w-14 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">EPI</Text></View>
                                    <View className="w-14 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">FCR</Text></View>
                                    <View className="w-20 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Price</Text></View>
                                </View>

                                {/* Table Rows */}
                                {data.monthlyData.map((m: any, idx: number) => {
                                    const hasData = m.chicksIn > 0 || m.chicksSold > 0;
                                    const isCurrentMonth = idx === now.getMonth() && year === now.getFullYear();

                                    return (
                                        <View
                                            key={idx}
                                            className={`flex-row items-center py-3 border-b border-border/20 ${isCurrentMonth ? 'bg-primary/5' : ''}`}
                                        >
                                            <View className="w-24 px-2">
                                                <Text className={`text-xs ${hasData ? 'font-black text-foreground' : 'font-medium text-muted-foreground opacity-50'}`}>
                                                    {MONTHS_SHORT[idx]}
                                                </Text>
                                            </View>
                                            <View className="w-20 px-2 items-end">
                                                <Text className={`text-xs ${hasData ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {fmtNum(m.chicksIn)}
                                                </Text>
                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className={`text-xs ${m.chicksSold > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {fmtNum(m.chicksSold)}
                                                </Text>
                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className={`text-xs ${m.averageAge > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {m.averageAge > 0 ? Math.round(m.averageAge) : '–'}
                                                </Text>
                                            </View>
                                            <View className="w-20 px-2 items-end">
                                                <Text className={`text-xs ${m.totalBirdWeight > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {m.totalBirdWeight > 0 ? fmtNum(Math.round(m.totalBirdWeight)) : '–'}
                                                </Text>
                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className={`text-xs ${m.feedConsumption > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {m.feedConsumption > 0 ? fmtNum(Math.round(m.feedConsumption)) : '–'}
                                                </Text>
                                            </View>
                                            <View className="w-20 px-2 items-end">
                                                <Text className={`text-xs ${m.survivalRate > 0 ? 'font-bold text-emerald-500' : 'text-muted-foreground opacity-40'}`}>
                                                    {fmtPct(m.survivalRate)}
                                                </Text>
                                            </View>
                                            <View className="w-14 px-2 items-end">
                                                <Text className={`text-xs ${m.epi > 0 ? 'font-bold text-primary' : 'text-muted-foreground opacity-40'}`}>
                                                    {m.epi > 0 ? Math.round(m.epi) : '–'}
                                                </Text>
                                            </View>
                                            <View className="w-14 px-2 items-end">
                                                <Text className={`text-xs ${m.fcr > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {fmtDec(m.fcr)}
                                                </Text>
                                            </View>
                                            <View className="w-20 px-2 items-end">
                                                <Text className={`text-xs ${m.averagePrice > 0 ? 'font-bold text-foreground' : 'text-muted-foreground opacity-40'}`}>
                                                    {m.averagePrice > 0 ? m.averagePrice.toFixed(2) : '–'}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </>
                ) : (
                    <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                        <CardContent className="flex-1 items-center justify-center">
                            <Text className="text-muted-foreground">No performance data</Text>
                        </CardContent>
                    </Card>
                )}
            </ScrollView>

            {/* Year Picker Modal */}
            <Modal
                visible={yearPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setYearPickerOpen(false)}
            >
                <Pressable
                    onPress={() => setYearPickerOpen(false)}
                    className="flex-1 bg-black/60 items-center justify-center p-6"
                >
                    <View className="bg-card w-full rounded-[2rem] p-6 border border-border/50">
                        <Text className="text-lg font-black uppercase tracking-tight mb-4 ml-1">Select Year</Text>
                        <View className="gap-2">
                            {YEARS.map((y) => (
                                <Button
                                    key={y}
                                    onPress={() => { setYear(y); setYearPickerOpen(false); }}
                                    variant={year === y ? "default" : "secondary"}
                                    className="h-12 w-full rounded-xl items-start px-6"
                                >
                                    <Text className={`text-sm font-black uppercase ${year === y ? "text-primary-foreground" : "text-foreground"}`}>{y}</Text>
                                </Button>
                            ))}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}
