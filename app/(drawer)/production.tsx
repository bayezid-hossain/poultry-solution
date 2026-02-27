import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { router, useFocusEffect } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

export default function ProductionScreen() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth()); // 0-11
    const [year, setYear] = useState(now.getFullYear());
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [yearPickerOpen, setYearPickerOpen] = useState(false);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    const officerProdQuery = trpc.officer.performanceReports.getMonthlyProductionRecord.useQuery(
        { year, month },
        { enabled: !isManagement }
    );
    const mgmtProdQuery = trpc.managementPerformance.getMonthlyProductionRecord.useQuery(
        { orgId: membership?.orgId ?? "", officerId: selectedOfficerId ?? "", year, month },
        { enabled: isManagement && !!selectedOfficerId }
    );
    const data = isManagement ? mgmtProdQuery.data : officerProdQuery.data;
    const isLoading = isManagement ? mgmtProdQuery.isLoading : officerProdQuery.isLoading;
    const refetch = isManagement ? mgmtProdQuery.refetch : officerProdQuery.refetch;

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    // Compute totals / averages
    const farmers = data ?? [];
    const totalDoc = farmers.reduce((s: number, f: any) => s + f.doc, 0);
    const avgSurvival = farmers.length > 0
        ? farmers.reduce((s: number, f: any) => s + f.survivalRate, 0) / farmers.length : 0;
    const avgWeight = farmers.length > 0
        ? farmers.reduce((s: number, f: any) => s + f.averageWeight, 0) / farmers.length : 0;
    const avgFCR = farmers.length > 0
        ? farmers.reduce((s: number, f: any) => s + f.fcr, 0) / farmers.length : 0;
    const avgEPI = farmers.length > 0
        ? farmers.reduce((s: number, f: any) => s + f.epi, 0) / farmers.length : 0;
    const avgAge = farmers.length > 0
        ? farmers.reduce((s: number, f: any) => s + f.age, 0) / farmers.length : 0;
    const totalProfit = farmers.reduce((s: number, f: any) => s + f.profit, 0);

    const fmtProfit = (v: number) => {
        if (v === 0) return '–';
        const prefix = v < 0 ? '-' : '';
        return `${prefix}BDT ${Math.abs(v).toLocaleString()}`;
    };

    if (!membership?.isPro) {
        return <ProBlocker feature="Monthly Production" description="Gain insights into monthly production records and historical performance." />;
    }

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Monthly Production" />

            <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
                {/* Title */}
                <View className="mb-4">
                    <Text className="text-3xl font-black text-foreground mb-1">Monthly Production Record</Text>
                    <Text className="text-sm text-muted-foreground opacity-70">
                        Performance metrics for cycles ended in specific months.
                    </Text>
                </View>

                {/* Filters */}
                <View className="flex-row items-center gap-3 mb-6 flex-wrap">
                    <Pressable onPress={() => setMonthPickerOpen(true)}>
                        <View className="flex-row items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-4 h-10">
                            <Text className="text-sm font-bold text-foreground">{MONTHS[month]}</Text>
                            <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
                        </View>
                    </Pressable>

                    <Pressable onPress={() => setYearPickerOpen(true)}>
                        <View className="flex-row items-center gap-2 bg-muted/50 border border-border/50 rounded-xl px-4 h-10">
                            <Text className="text-sm font-bold text-foreground">{year}</Text>
                            <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
                        </View>
                    </Pressable>

                    {isManagement && (
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    )}
                </View>

                {isLoading ? (
                    <View className="items-center justify-center py-10">
                        <BirdyLoader size={48} color={"#10b981"} />
                    </View>
                ) : (
                    <>
                        {/* Summary Card */}
                        <Card className="mb-6 border-border/50 bg-card overflow-hidden">
                            <View className="flex-row">
                                <View className="w-1 bg-primary" />
                                <CardContent className="p-5 flex-1">
                                    <Text className="text-base font-black text-foreground mb-1">
                                        {MONTHS[month]} {year} Production
                                    </Text>
                                    <Text className="text-xs text-muted-foreground opacity-60">
                                        Consolidated performance record for all your farmers whose cycles ended in {MONTHS[month]}.
                                    </Text>
                                </CardContent>
                            </View>
                        </Card>

                        {farmers.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    {/* Table Header */}
                                    <View className="flex-row border-b border-border/50 pb-3 mb-1">
                                        <View className="w-28 px-2"><Text className="text-[9px] font-black text-muted-foreground uppercase">Farmer</Text></View>
                                        <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">DOC</Text></View>
                                        <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Surv. %</Text></View>
                                        <View className="w-20 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Avg Wt (kg)</Text></View>
                                        <View className="w-14 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">FCR</Text></View>
                                        <View className="w-16 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">EPI</Text></View>
                                        <View className="w-14 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Age</Text></View>
                                        <View className="w-24 px-2 items-end"><Text className="text-[9px] font-black text-muted-foreground uppercase">Net Profit</Text></View>
                                    </View>

                                    {/* Farmer Rows */}
                                    {farmers.map((f: any) => (
                                        <View key={f.farmerId} className="flex-row items-center py-3 border-b border-border/20">
                                            <View className="w-28 px-2" >


                                                <Text className="text-xs font-black text-foreground uppercase active:text-primary leading-tight" numberOfLines={3} onPress={() => {
                                                    // console.log("touched");
                                                    router.push({
                                                        pathname: `/farmer/${f.farmerId}` as any,
                                                    })
                                                }}>{f.farmerName}</Text>

                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.doc.toLocaleString()}</Text>
                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.survivalRate.toFixed(1)}%</Text>
                                            </View>
                                            <View className="w-20 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.averageWeight.toFixed(3)}</Text>
                                            </View>
                                            <View className="w-14 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.fcr.toFixed(2)}</Text>
                                            </View>
                                            <View className="w-16 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.epi.toFixed(2)}</Text>
                                            </View>
                                            <View className="w-14 px-2 items-end">
                                                <Text className="text-xs font-bold text-foreground">{f.age > 0 ? f.age.toFixed(1) : '–'}</Text>
                                            </View>
                                            <View className="w-24 px-2 items-end">
                                                <Text className={`text-xs font-black ${f.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {fmtProfit(f.profit)}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}

                                    {/* Total / Avg Row */}
                                    <View className="flex-row items-center py-3 border-t border-amber-500/30 bg-amber-500/5">
                                        <View className="w-28 px-2">
                                            <Text className="text-xs font-black text-amber-500 uppercase">Total / Avg</Text>
                                        </View>
                                        <View className="w-16 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{totalDoc.toLocaleString()}</Text>
                                        </View>
                                        <View className="w-16 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{avgSurvival.toFixed(1)}%</Text>
                                        </View>
                                        <View className="w-20 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{avgWeight.toFixed(3)}</Text>
                                        </View>
                                        <View className="w-14 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{avgFCR.toFixed(2)}</Text>
                                        </View>
                                        <View className="w-16 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{avgEPI.toFixed(2)}</Text>
                                        </View>
                                        <View className="w-14 px-2 items-end">
                                            <Text className="text-xs font-black text-amber-500">{avgAge > 0 ? avgAge.toFixed(1) : '–'}</Text>
                                        </View>
                                        <View className="w-24 px-2 items-end">
                                            <Text className={`text-xs font-black ${totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {fmtProfit(totalProfit)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        ) : (
                            <View className="items-center justify-center py-10 bg-muted/10 border-2 border-dashed border-border/50 rounded-[2rem]">
                                <Text className="text-[10px] font-black uppercase text-muted-foreground opacity-40">
                                    No production records for {MONTHS[month]} {year}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Month Picker Modal */}
            <Modal
                visible={monthPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMonthPickerOpen(false)}
            >
                <Pressable
                    onPress={() => setMonthPickerOpen(false)}
                    className="flex-1 bg-black/60 items-center justify-center p-6"
                >
                    <View className="bg-card w-full rounded-[2rem] p-6 border border-border/50">
                        <Text className="text-lg font-black uppercase tracking-tight mb-4 ml-1">Select Month</Text>
                        <ScrollView className="max-h-96">
                            <View className="flex-row flex-wrap gap-2">
                                {MONTHS.map((m, i) => (
                                    <Button
                                        key={m}
                                        onPress={() => { setMonth(i); setMonthPickerOpen(false); }}
                                        variant={month === i ? "default" : "secondary"}
                                        className="h-10 px-4 rounded-xl min-w-[30%]"
                                    >
                                        <Text className={`text-xs font-black uppercase ${month === i ? "text-primary-foreground" : "text-foreground"}`}>{m}</Text>
                                    </Button>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

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

