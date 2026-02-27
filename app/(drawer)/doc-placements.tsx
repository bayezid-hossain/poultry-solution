import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ProBlocker } from "@/components/pro-blocker";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronDown, ChevronRight, FileText, Filter } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DocPlacementsScreen() {
    const router = useRouter();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
    const [year, setYear] = useState(now.getFullYear());
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [yearPickerOpen, setYearPickerOpen] = useState(false);
    const [expandedFarmers, setExpandedFarmers] = useState<Record<string, boolean>>({});

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    if (!membership?.isPro) {
        return <ProBlocker feature="DOC Placements" description="View detailed Day Old Chick placement reports and analytics." />;
    }

    const officerDocQuery = trpc.officer.reports.getMonthlyDocPlacements.useQuery(
        { month, year },
        { enabled: !isManagement }
    );
    const mgmtDocQuery = trpc.management.reports.getMonthlyDocPlacements.useQuery(
        { orgId: membership?.orgId ?? "", officerId: selectedOfficerId ?? "", month, year },
        { enabled: isManagement && !!selectedOfficerId }
    );
    const data = isManagement ? mgmtDocQuery.data : officerDocQuery.data;
    const isLoading = isManagement ? mgmtDocQuery.isLoading : officerDocQuery.isLoading;
    const refetch = isManagement ? mgmtDocQuery.refetch : officerDocQuery.refetch;

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const toggleExpand = (id: string) => {
        setExpandedFarmers(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const YEARS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="DOC Placements" />

            <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
                <View className="flex-row items-center justify-between mb-6">
                    <View>
                        <Text className="text-3xl font-black text-foreground mb-1">DOC Placement Report</Text>
                        <Text className="text-sm text-muted-foreground opacity-70">
                            Month-wise breakdown of Day Old Chick placements.
                        </Text>
                    </View>
                </View>

                {/* Report Filters */}
                <Card className="mb-6 border-border/50 bg-card/50">
                    <CardContent className="p-4">
                        <View className="flex-row items-center gap-2 mb-4">
                            <Icon as={Filter} size={18} className="text-foreground" />
                            <Text className="text-lg font-black uppercase tracking-tight">Report Filters</Text>
                        </View>

                        {isManagement && (
                            <View className="mb-4">
                                <OfficerSelector orgId={membership?.orgId ?? ""} />
                            </View>
                        )}

                        <View className="flex-row gap-4">
                            <Pressable
                                onPress={() => setMonthPickerOpen(true)}
                                className="flex-1"
                            >
                                <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 ml-1">Month</Text>
                                <View className="flex-row items-center justify-between bg-muted/50 border border-border/50 rounded-xl px-4 h-12">
                                    <Text className="text-sm font-bold">{MONTHS[month - 1]}</Text>
                                    <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
                                </View>
                            </Pressable>

                            <Pressable
                                onPress={() => setYearPickerOpen(true)}
                                className="w-32"
                            >
                                <Text className="text-[10px] font-black uppercase text-muted-foreground mb-1 ml-1">Year</Text>
                                <View className="flex-row items-center justify-between bg-muted/50 border border-border/50 rounded-xl px-4 h-12">
                                    <Text className="text-sm font-bold">{year}</Text>
                                    <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
                                </View>
                            </Pressable>
                        </View>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <View className="items-center justify-center py-10">
                        <BirdyLoader size={48} />
                        <Text className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                            Crunching Monthly DOC data...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Metrics */}
                        <View className="gap-3 mb-8">
                            <Card className="border-border/50 bg-card">
                                <CardContent className="p-5">
                                    <View className="flex-row items-center justify-between mb-6">
                                        <Text className="text-sm font-black uppercase tracking-tight text-foreground">Total DOC Placed</Text>
                                        <Icon as={FileText} size={18} className="text-muted-foreground opacity-60" />
                                    </View>
                                    <Text className="text-4xl font-black text-foreground">
                                        {(data?.summary?.totalDoc ?? 0).toLocaleString()}
                                    </Text>
                                    <Text className="text-[10px] font-bold text-muted-foreground opacity-60 mt-1 uppercase tracking-widest">
                                        in {MONTHS[month - 1]} {year}
                                    </Text>
                                </CardContent>
                            </Card>

                            <View className="flex-row gap-3">
                                <Card className="flex-1 border-border/50 bg-card">
                                    <CardContent className="p-5">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Total Farmers</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {data?.summary?.farmerCount ?? 0}
                                        </Text>
                                    </CardContent>
                                </Card>

                                <Card className="flex-1 border-border/50 bg-card">
                                    <CardContent className="p-5">
                                        <Text className="text-xs font-black uppercase tracking-tight text-foreground mb-4">Total Batches</Text>
                                        <Text className="text-3xl font-black text-foreground">
                                            {data?.summary?.cycleCount ?? 0}
                                        </Text>
                                    </CardContent>
                                </Card>
                            </View>
                        </View>

                        {/* Farmer Breakdown */}
                        <View className="mb-4">
                            <Text className="text-lg font-black uppercase tracking-tight text-foreground">Farmer Breakdown</Text>
                            <Text className="text-xs text-muted-foreground opacity-60">
                                List of farmers who received DOCs in {MONTHS[month - 1]} {year}.
                            </Text>
                        </View>

                        <View className="gap-3">
                            {data?.farmers && data.farmers.length > 0 ? (
                                data.farmers.map((f: any, idx: number) => {
                                    const farmerKey = f.farmerId || idx.toString();
                                    const isExpanded = !!expandedFarmers[farmerKey];
                                    return (
                                        <View key={farmerKey}>
                                            <Pressable
                                                onPress={() => toggleExpand(farmerKey)}
                                                className="flex-row items-center justify-between p-4 bg-card border border-border/50 rounded-[1.5rem] active:opacity-70"
                                            >
                                                <View className="flex-row items-center gap-4">
                                                    <View className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                                                        <Icon
                                                            as={isExpanded ? ChevronDown : ChevronRight}
                                                            size={16}
                                                            className="text-muted-foreground"
                                                        />
                                                    </View>
                                                    <View>
                                                        <Pressable
                                                            className="active:opacity-70"

                                                        >
                                                            <Text onPress={() => {
                                                                router.push(`/farmer/${f.farmerId}`)
                                                            }} className="font-black text-sm uppercase tracking-tight text-foreground active:text-primary" numberOfLines={1}>{f.farmerName}</Text>
                                                        </Pressable>
                                                        <View className="flex-row items-center gap-1.5 mt-0.5">
                                                            <Text className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">
                                                                {f.cycles?.length ?? 0} {f.cycles?.length === 1 ? 'Batch' : 'Batches'}
                                                            </Text>
                                                            {f.cycles?.length > 1 && (
                                                                <>
                                                                    <View className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                                                    <Text className="text-[10px] font-medium text-muted-foreground opacity-50">
                                                                        {f.cycles.map((c: any, i: number) => `B${i + 1}: ${c.doc}`).join(', ')}
                                                                    </Text>
                                                                </>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>
                                                <Badge variant="outline" className="h-8 px-3 rounded-full bg-primary/10 border-primary/20">
                                                    <Text className="text-[11px] font-black text-primary">{f.totalDoc.toLocaleString()} DOC</Text>
                                                </Badge>
                                            </Pressable>

                                            {isExpanded && (
                                                <View className="mt-1 border-t border-border/30">
                                                    {f.cycles.map((c: any, ci: number) => {
                                                        const isArchived = c.status === 'archived' || c.status === 'completed';
                                                        return (
                                                            <View key={ci} className="flex-row items-center justify-between px-4 py-3 border-b border-border/20">
                                                                <View>
                                                                    <Text className="text-xs font-bold text-foreground">
                                                                        {formatDate(c.date)}
                                                                    </Text>
                                                                    <View className={`mt-1 px-1.5 py-0.5 rounded-md border self-start ${isArchived ? 'bg-muted/50 border-border/30' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                                                        <Text className={`text-[8px] font-black uppercase ${isArchived ? 'text-muted-foreground' : 'text-emerald-500'}`}>
                                                                            {isArchived ? 'Archived' : 'Active'}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                                <Text className="text-base font-black text-foreground">
                                                                    {c.doc.toLocaleString()} <Text className="text-xs font-bold text-muted-foreground">DOC</Text>
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            ) : (
                                <View className="items-center justify-center py-10 bg-muted/10 border-2 border-dashed border-border/50 rounded-[2rem]">
                                    <Text className="text-[10px] font-black uppercase text-muted-foreground opacity-40">No placements found</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Selection Modals */}
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
                                        onPress={() => { setMonth(i + 1); setMonthPickerOpen(false); }}
                                        variant={month === i + 1 ? "default" : "secondary"}
                                        className="h-10 px-4 rounded-xl min-w-[30%]"
                                    >
                                        <Text className={`text-xs font-black uppercase ${month === i + 1 ? "text-primary-foreground" : "text-foreground"}`}>{m}</Text>
                                    </Button>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

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
