/// <reference types="nativewind/types" />
import { CycleCard } from "@/components/cycles/cycle-card";
import { SaleEventCard } from "@/components/cycles/sale-event-card";
import { DeleteFarmerModal } from "@/components/farmers/delete-farmer-modal";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { SecurityMoneyModal } from "@/components/farmers/security-money-modal";
import { StartCycleModal } from "@/components/farmers/start-cycle-modal";
import { StockCorrectionModal } from "@/components/farmers/stock-correction-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { Activity, Archive, ArrowLeft, Bird, ChevronDown, ChevronUp, History, Link, MoreVertical, Pencil, Scale, ShoppingCart, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

export default function FarmerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStartCycleOpen, setIsStartCycleOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [activeExpanded, setActiveExpanded] = useState(true);
    const [salesExpanded, setSalesExpanded] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [ledgerExpanded, setLedgerExpanded] = useState(false);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    const { data: farmer, isLoading, refetch } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id }
    );

    const { data: historyData, isLoading: historyLoading } = trpc.officer.cycles.listPast.useQuery(
        {
            orgId: membership?.orgId ?? "",
            farmerId: id,
            pageSize: 50,
        },
        { enabled: !!id && !!membership?.orgId && historyExpanded }
    );

    const { data: salesData, isLoading: salesLoading } = trpc.officer.sales.getRecentSales.useQuery(
        { limit: 50 },
        { enabled: !!id && !!membership?.orgId && salesExpanded }
    );

    const { data: ledgerData, isLoading: ledgerLoading } = trpc.officer.stock.getHistory.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id && ledgerExpanded }
    );

    const handleDelete = () => {
        setIsDeleteOpen(true);
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Farmer Details" />
                <View className="flex-1 items-center justify-center p-4">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground font-medium">Crunching data...</Text>
                </View>
            </View>
        );
    }

    if (!farmer) {
        return (
            <View className="flex-1 bg-background">
                <ScreenHeader title="Farmer Details" />
                <View className="flex-1 items-center justify-center p-10 opacity-50">
                    <Text className="text-center text-lg font-medium">Farmer not found</Text>
                </View>
            </View>
        );
    }

    const { cycles: activeCycles = [] } = farmer;
    const archivedCycles = historyData?.items ?? [];

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title=""
                leftElement={
                    <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                        <Icon as={ArrowLeft} size={24} className="text-foreground" />
                    </Pressable>
                }
            />

            <ScrollView
                contentContainerClassName="p-4 pb-20"
                className="flex-1"
            >
                {/* Farmer Title Section */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <Text className="text-3xl font-black text-foreground uppercase tracking-tight">{farmer.name}</Text>
                            <Text className="text-base text-muted-foreground">{farmer.location || "No location"}</Text>
                        </View>
                        <Pressable onPress={() => setIsEditOpen(true)} className="h-10 w-10 items-center justify-center rounded-xl bg-muted/30 border border-border/50">
                            <Icon as={MoreVertical} size={20} className="text-muted-foreground" />
                        </Pressable>
                    </View>
                    <Text className="text-sm text-muted-foreground italic mt-2">
                        Farmer History & Details • Production & Stock Management
                    </Text>
                </View>

                {/* ESTIMATED REMAINING Card */}
                <Card className="mb-4 bg-card border-border/50 overflow-hidden">
                    <CardContent className="p-5">
                        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Estimated Remaining</Text>
                        <View className="flex-row items-baseline gap-2 mb-6">
                            <Text className="text-4xl font-black text-foreground">{Number(farmer.mainStock ?? 0).toFixed(2)}</Text>
                            <Text className="text-sm text-muted-foreground">bags</Text>
                        </View>

                        <View className="flex-row justify-between mb-3">
                            <View>
                                <Text className="text-xs text-muted-foreground mb-1">Active Cycle Use</Text>
                                <Text className="text-sm font-bold text-orange-500">+{Number(farmer.totalConsumed ?? 0).toFixed(2)} bags</Text>
                            </View>
                            <View className="items-start">
                                <Text className="text-xs text-muted-foreground mb-1">Total Provisioned (Ledger)</Text>
                                <Text className="text-sm font-bold text-foreground">{(Number(farmer.mainStock ?? 0) + Number(farmer.totalConsumed ?? 0)).toFixed(2)} bags</Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View className="h-2 w-full bg-emerald-500/20 rounded-full mt-1 overflow-hidden flex-row">
                            <View className="h-full bg-emerald-500" style={{ width: `${(Number(farmer.mainStock ?? 0) / (Number(farmer.mainStock ?? 0) + Number(farmer.totalConsumed ?? 0))) * 100}%` }} />
                            <View className="h-full bg-orange-500" style={{ width: `${(Number(farmer.totalConsumed ?? 0) / (Number(farmer.mainStock ?? 0) + Number(farmer.totalConsumed ?? 0))) * 100}%` }} />
                        </View>
                    </CardContent>
                </Card>

                {/* SECURITY DEPOSIT Card */}
                <Card className="mb-8 border-border/50 bg-card overflow-hidden">
                    <CardContent className="p-5">
                        <View className="flex-row items-center gap-2 mb-3">
                            <Icon as={Link} size={14} className="text-muted-foreground" />
                            <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Security Deposit</Text>
                        </View>
                        <Text className="text-2xl font-black text-foreground mb-6">TK. {Number(farmer.securityMoney ?? 0).toLocaleString()}</Text>

                        <View className="flex-row gap-3">
                            <Button variant="outline" className="flex-1 bg-transparent border-border/50 flex-row gap-2 h-10" onPress={() => setIsSecurityOpen(true)}>
                                <Icon as={Pencil} size={14} className="text-foreground" />
                                <Text className="font-bold text-foreground text-sm">Edit Amount</Text>
                            </Button>
                            <Button variant="outline" className="flex-1 bg-transparent border-border/50 flex-row gap-2 h-10" onPress={() => router.push({ pathname: `/farmer/${farmer.id}/ledger`, params: { initialTab: 'security' } } as any)}>
                                <Icon as={History} size={14} className="text-foreground" />
                                <Text className="font-bold text-foreground text-sm">History</Text>
                            </Button>
                        </View>
                    </CardContent>
                </Card>

                {/* Accordions */}
                <View className="mb-8 mt-4">
                    {/* ACTIVE CYCLES */}
                    <View className="border-t border-border/10">
                        <Pressable className="flex-row items-center justify-between py-5" onPress={() => setActiveExpanded(!activeExpanded)}>
                            <View className="flex-row items-center gap-3">
                                <Icon as={Activity} size={20} className="text-emerald-500" />
                                <Text className="text-lg font-black text-foreground">Active Cycles</Text>
                            </View>
                            <Icon as={activeExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {activeExpanded && (
                            <View className="pb-5">
                                {activeCycles.length > 0 ? (
                                    activeCycles.map((cycle: any) => (
                                        <CycleCard
                                            key={cycle.id}
                                            cycle={{
                                                ...cycle,
                                                intake: Number(cycle.intake)
                                            }}
                                            onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                                        />
                                    ))
                                ) : (
                                    <Card className="border-dashed border-border/50 bg-muted/10 h-32 mt-2">
                                        <CardContent className="flex-1 items-center justify-center gap-2">
                                            <Icon as={Bird} size={32} className="text-muted-foreground/20" />
                                            <Text className="text-muted-foreground text-sm font-medium">No active cycles</Text>
                                            <Button variant="ghost" size="sm" className="mt-1" onPress={() => setIsStartCycleOpen(true)}>
                                                <Text className="text-primary font-bold">Launch First Batch</Text>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </View>
                        )}
                    </View>

                    {/* SALES HISTORY */}
                    <View className="border-t border-border/10">
                        <Pressable className="flex-row items-center justify-between py-5" onPress={() => setSalesExpanded(!salesExpanded)}>
                            <View className="flex-row items-center gap-3">
                                <Icon as={ShoppingCart} size={20} className="text-blue-500" />
                                <Text className="text-lg font-black text-foreground">Sales History</Text>
                            </View>
                            <Icon as={salesExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {salesExpanded && (
                            <View className="pb-5">
                                {salesLoading ? (
                                    <ActivityIndicator size="small" className="my-4" />
                                ) : salesData?.filter((s: any) => s.cycle?.farmer?.id === farmer.id).length ? (
                                    salesData.filter((s: any) => s.cycle?.farmer?.id === farmer.id).map((sale: any) => (
                                        <SaleEventCard key={sale.id} sale={sale} isLatest={false} />
                                    ))
                                ) : (
                                    <Card className="border-dashed border-border/50 bg-muted/10 p-6 items-center">
                                        <Text className="text-muted-foreground text-sm font-medium">No sales recorded</Text>
                                    </Card>
                                )}
                            </View>
                        )}
                    </View>

                    {/* CYCLES HISTORY */}
                    <View className="border-t border-border/10">
                        <Pressable className="flex-row items-center justify-between py-5" onPress={() => setHistoryExpanded(!historyExpanded)}>
                            <View className="flex-row items-center gap-3">
                                <Icon as={Archive} size={20} className="text-muted-foreground" />
                                <Text className="text-lg font-black text-foreground">Cycles History</Text>
                            </View>
                            <Icon as={historyExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {historyExpanded && (
                            <View className="pb-5">
                                {historyLoading ? (
                                    <ActivityIndicator size="small" className="my-4" />
                                ) : archivedCycles.length > 0 ? (
                                    archivedCycles.map((cycle: any) => (
                                        <CycleCard
                                            key={cycle.id}
                                            cycle={cycle as any}
                                            onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                                        />
                                    ))
                                ) : (
                                    <Card className="border-dashed border-border/50 bg-muted/10 p-6 items-center">
                                        <Text className="text-muted-foreground text-sm font-medium">No past cycles</Text>
                                    </Card>
                                )}
                            </View>
                        )}
                    </View>

                    {/* STOCK LEDGER */}
                    <View className="border-y border-border/10">
                        <Pressable className="flex-row items-center justify-between py-5" onPress={() => setLedgerExpanded(!ledgerExpanded)}>
                            <View className="flex-row items-center gap-3">
                                <Icon as={Scale} size={20} className="text-orange-500" />
                                <Text className="text-lg font-black text-foreground">Stock Ledger & Import History</Text>
                            </View>
                            <Icon as={ledgerExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {ledgerExpanded && (
                            <View className="pb-5">
                                {ledgerLoading ? (
                                    <ActivityIndicator size="small" className="my-4" />
                                ) : ledgerData && ledgerData.length > 0 ? (
                                    <>
                                        {ledgerData.slice(0, 5).map((log: any) => (
                                            <Card key={log.id} className="mb-2 border-border/50 bg-card p-3">
                                                <View className="flex-row justify-between items-center">
                                                    <View>
                                                        <Text className="font-bold text-foreground text-sm">{log.type}</Text>
                                                        <Text className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(log.createdAt), "MMM d, yyyy")}</Text>
                                                    </View>
                                                    <Text className={`font-black ${parseFloat(log.amount) > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                        {parseFloat(log.amount) > 0 ? '+' : ''}{log.amount} b
                                                    </Text>
                                                </View>
                                            </Card>
                                        ))}
                                        <Button variant="outline" className="mt-2 h-10 border-border/50" onPress={() => router.push(`/farmer/${farmer.id}/ledger` as any)}>
                                            <Text className="text-foreground font-bold">View Full Ledger</Text>
                                        </Button>
                                    </>
                                ) : (
                                    <Card className="border-dashed border-border/50 bg-muted/10 p-6 items-center">
                                        <Text className="text-muted-foreground text-sm font-medium">No stock transactions</Text>
                                    </Card>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Dangerous Zone */}
                <View className="mt-10 pt-6 border-t border-border/50">
                    <Button
                        variant="ghost"
                        onPress={handleDelete}
                        className="h-14 flex-row items-center justify-center gap-2"
                    >
                        <Icon as={Trash2} size={18} className="text-destructive" />
                        <Text className="text-destructive font-bold">Delete Farmer Profile</Text>
                    </Button>
                </View>
            </ScrollView>

            {/* Modals */}
            <RestockModal
                open={isRestockOpen}
                onOpenChange={setIsRestockOpen}
                farmerId={farmer.id}
                farmerName={farmer.name}
                onSuccess={refetch}
            />
            <StockCorrectionModal
                open={isCorrectionOpen}
                onOpenChange={setIsCorrectionOpen}
                farmerId={farmer.id}
                farmerName={farmer.name}
                onSuccess={refetch}
            />
            <SecurityMoneyModal
                open={isSecurityOpen}
                onOpenChange={setIsSecurityOpen}
                farmer={farmer}
                onSuccess={refetch}
            />
            <EditFarmerModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                farmer={farmer}
                onSuccess={refetch}
            />
            <StartCycleModal
                open={isStartCycleOpen}
                onOpenChange={setIsStartCycleOpen}
                farmer={farmer}
                onSuccess={refetch}
            />
            <DeleteFarmerModal
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                farmerId={farmer.id}
                organizationId={farmer.organizationId}
                farmerName={farmer.name}
            />
        </View>
    );
}
