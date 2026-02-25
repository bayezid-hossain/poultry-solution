/// <reference types="nativewind/types" />
import { AddMortalityModal } from "@/components/cycles/add-mortality-modal";
import { CorrectAgeModal } from "@/components/cycles/correct-age-modal";
import { CorrectDocModal } from "@/components/cycles/correct-doc-modal";
import { CorrectMortalityModal } from "@/components/cycles/correct-mortality-modal";
import { CycleAction, CycleCard } from "@/components/cycles/cycle-card";
import { DeleteCycleModal } from "@/components/cycles/delete-cycle-modal";
import { EndCycleModal } from "@/components/cycles/end-cycle-modal";
import { ReopenCycleModal } from "@/components/cycles/reopen-cycle-modal";
import { SaleEventCard } from "@/components/cycles/sale-event-card";
import { SellModal } from "@/components/cycles/sell-modal";
import { DeleteFarmerModal } from "@/components/farmers/delete-farmer-modal";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { SecurityMoneyModal } from "@/components/farmers/security-money-modal";
import { StartCycleModal } from "@/components/farmers/start-cycle-modal";
import { StockCorrectionModal } from "@/components/farmers/stock-correction-modal";
import { TransferStockModal } from "@/components/farmers/transfer-stock-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { Activity, Archive, ArrowLeft, ArrowRightLeft, Bird, ChevronDown, ChevronUp, History, Link, MoreVertical, Package, Pencil, Plus, Scale, ShoppingCart, Trash2, Wrench } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

export default function FarmerDetailScreen() {
    const utils = trpc.useUtils();
    const { id } = useLocalSearchParams<{ id: string }>();

    // Farmer-level modal states
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStartCycleOpen, setIsStartCycleOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);

    // Accordion states
    const [activeExpanded, setActiveExpanded] = useState(true);
    const [salesExpanded, setSalesExpanded] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [ledgerExpanded, setLedgerExpanded] = useState(false);

    // Cycle action modal states
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [isSellOpen, setIsSellOpen] = useState(false);
    const [isAddMortalityOpen, setIsAddMortalityOpen] = useState(false);
    const [isEditDocOpen, setIsEditDocOpen] = useState(false);
    const [isEditAgeOpen, setIsEditAgeOpen] = useState(false);
    const [isCorrectMortalityOpen, setIsCorrectMortalityOpen] = useState(false);
    const [isEndCycleOpen, setIsEndCycleOpen] = useState(false);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isDeleteCycleOpen, setIsDeleteCycleOpen] = useState(false);

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const detailProcedure = isManagement ? trpc.management.farmers.getDetails : trpc.officer.farmers.getDetails;
    const { data: farmer, isLoading, refetch } = (detailProcedure as any).useQuery(
        { farmerId: id ?? "", orgId: membership?.orgId ?? "" },
        { enabled: !!id && (isManagement ? !!membership?.orgId : true) }
    );

    const listPastProcedure = isManagement ? trpc.management.cycles.listPast : trpc.officer.cycles.listPast;
    const { data: historyData, isLoading: historyLoading } = (listPastProcedure as any).useQuery(
        {
            orgId: membership?.orgId ?? "",
            farmerId: id,
            pageSize: 50,
        },
        { enabled: !!id && !!membership?.orgId && historyExpanded }
    );

    const { data: salesData, isLoading: salesLoading } = trpc.officer.sales.getSaleEvents.useQuery(
        { farmerId: id },
        { enabled: !!id && salesExpanded }
    );

    const stockHistoryProcedure = isManagement ? trpc.management.stock.getHistory : trpc.officer.stock.getHistory;
    const { data: ledgerData, isLoading: ledgerLoading } = (stockHistoryProcedure as any).useQuery(
        { farmerId: id ?? "", orgId: membership?.orgId ?? "" },
        { enabled: !!id && (isManagement ? !!membership?.orgId : true) && ledgerExpanded }
    );

    const refetchAll = useCallback(async () => {
        await Promise.all([
            refetch(),
            utils.officer.cycles.listPast.invalidate({ farmerId: id }),
            utils.management.cycles.listPast.invalidate({ farmerId: id }),
            utils.officer.sales.getSaleEvents.invalidate(),
            utils.management.sales.getRecentSales.invalidate(),
            utils.officer.stock.getHistory.invalidate({ farmerId: id }),
            utils.management.stock.getHistory.invalidate({ farmerId: id }),
            utils.officer.cycles.getDetails.invalidate(),
            utils.management.cycles.getDetails.invalidate(),
        ]);
    }, [id, refetch, utils]);

    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetchAll();
        setRefreshing(false);
    }, [refetchAll]);

    const handleCycleAction = useCallback((action: CycleAction, cycle: any) => {
        setSelectedCycleId(cycle.id);
        switch (action) {
            case 'sell': setIsSellOpen(true); break;
            case 'add_mortality': setIsAddMortalityOpen(true); break;
            case 'edit_doc': setIsEditDocOpen(true); break;
            case 'edit_age': setIsEditAgeOpen(true); break;
            case 'correct_mortality': setIsCorrectMortalityOpen(true); break;
            case 'end_cycle': setIsEndCycleOpen(true); break;
            case 'reopen': setIsReopenModalOpen(true); break;
            case 'delete': setIsDeleteCycleOpen(true); break;
        }
    }, []);

    const [renderSalesCards, setRenderSalesCards] = useState(false);
    const [renderHistoryCards, setRenderHistoryCards] = useState(false);
    const [renderLedgerCards, setRenderLedgerCards] = useState(false);

    useEffect(() => {
        if (salesExpanded && salesData?.length && !salesLoading) {
            const timer = setTimeout(() => {
                setRenderSalesCards(true);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setRenderSalesCards(false);
        }
    }, [salesExpanded, salesData, salesLoading]);

    useEffect(() => {
        if (historyExpanded && historyData?.items?.length && !historyLoading) {
            const timer = setTimeout(() => {
                setRenderHistoryCards(true);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setRenderHistoryCards(false);
        }
    }, [historyExpanded, historyData, historyLoading]);

    useEffect(() => {
        if (ledgerExpanded && ledgerData?.length && !ledgerLoading) {
            const timer = setTimeout(() => {
                setRenderLedgerCards(true);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setRenderLedgerCards(false);
        }
    }, [ledgerExpanded, ledgerData, ledgerLoading]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <BirdyLoader size={48} color={"#10b981"} />
                <Text className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs">Fetching Detail...</Text>
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

    const { cycles: rawActiveCycles = [] } = farmer;
    const activeCycles = rawActiveCycles.filter((c: any) => c.status === 'active');
    const archivedCycles = historyData?.items ?? [];

    const mainStock = Number(farmer.mainStock ?? 0);
    const activeConsumption = activeCycles.reduce((acc: number, c: any) => acc + (parseFloat(c.intake) || 0), 0);
    const availableStock = mainStock - activeConsumption;

    const selectedCycle = (() => {
        if (!selectedCycleId) return null;
        const active = activeCycles.find((c: any) => c.id === selectedCycleId);
        if (active) return active;
        const archived = archivedCycles.find((c: any) => c.id === selectedCycleId);
        if (archived) return { ...archived, type: 'history' };
        return null;
    })();

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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={["#16a34a"]}
                        tintColor={"#16a34a"}
                    />
                }
            >
                {/* Farmer Title Section */}
                <View className="mb-6">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                            <Text className="text-3xl font-black text-foreground uppercase tracking-tight">{farmer.name}</Text>
                            <Text className="text-base text-muted-foreground">{farmer.location || "No location"}</Text>
                            {farmer.createdAt && (
                                <Text className="text-sm font-bold text-primary mt-1">Joined {format(new Date(farmer.createdAt), "dd MMM yyyy")}</Text>
                            )}
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
                            <Text className="text-4xl font-black text-foreground">{availableStock.toFixed(2)}</Text>
                            <Text className="text-sm text-muted-foreground">bags</Text>
                        </View>

                        <View className="flex-row justify-between mb-3">
                            <View>
                                <Text className="text-xs text-muted-foreground mb-1">Active Cycle Use</Text>
                                <Text className="text-sm font-bold text-orange-500">+{activeConsumption.toFixed(2)} bags</Text>
                            </View>
                            <View className="items-start">
                                <Text className="text-xs text-muted-foreground mb-1">Total Provisioned (Ledger)</Text>
                                <Text className="text-sm font-bold text-foreground">{mainStock.toFixed(2)} bags</Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View className="h-2 w-full bg-emerald-500/20 rounded-full mt-1 overflow-hidden flex-row">
                            <View className="h-full bg-emerald-500" style={{ width: `${mainStock > 0 ? (availableStock / mainStock) * 100 : 0}%` }} />
                            <View className="h-full bg-orange-500" style={{ width: `${mainStock > 0 ? (activeConsumption / mainStock) * 100 : 0}%` }} />
                        </View>
                    </CardContent>
                </Card>

                {/* QUICK ACTIONS BAR */}
                <View className="flex-row gap-2 mb-4">
                    <Pressable
                        onPress={() => setIsRestockOpen(true)}
                        className="flex-1 bg-emerald-500/10 h-12 rounded-xl items-center justify-center flex-row gap-1.5 border border-emerald-500/20 active:bg-emerald-500/20"
                    >
                        <Icon as={Package} size={14} className="text-emerald-500" />
                        <Text className="text-emerald-500 font-bold text-[10px] uppercase tracking-wider">Restock</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsCorrectionOpen(true)}
                        className="flex-1 bg-amber-500/10 h-12 rounded-xl items-center justify-center flex-row gap-1.5 border border-amber-500/20 active:bg-amber-500/20"
                    >
                        <Icon as={Wrench} size={14} className="text-amber-500" />
                        <Text className="text-amber-500 font-bold text-[10px] uppercase tracking-wider">Fix</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsTransferOpen(true)}
                        className="flex-1 bg-blue-500/10 h-12 rounded-xl items-center justify-center flex-row gap-1.5 border border-blue-500/20 active:bg-blue-500/20"
                    >
                        <Icon as={ArrowRightLeft} size={14} className="text-blue-500" />
                        <Text className="text-blue-500 font-bold text-[10px] uppercase tracking-wider">Transfer</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setIsStartCycleOpen(true)}
                        className="flex-1 bg-primary/10 h-12 rounded-xl items-center justify-center flex-row gap-1.5 border border-primary/20 active:bg-primary/20"
                    >
                        <Icon as={Plus} size={14} className="text-primary" />
                        <Text className="text-primary font-bold text-[10px] uppercase tracking-wider">Cycle</Text>
                    </Pressable>
                </View>

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
                                            onAction={handleCycleAction}
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
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Fetching Sales</Text>
                                    </View>
                                ) : salesData?.length ? (
                                    renderSalesCards ? (
                                        salesData.map((sale: any) => (
                                            <SaleEventCard key={sale.id} sale={sale} isLatest={false} />
                                        ))
                                    ) : (
                                        <View className="py-20 items-center justify-center">
                                            <BirdyLoader size={48} color="#10b981" />
                                            <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Cards</Text>
                                        </View>
                                    )
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
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Fetching History</Text>
                                    </View>
                                ) : archivedCycles.length > 0 ? (
                                    renderHistoryCards ? (
                                        archivedCycles.map((cycle: any) => (
                                            <CycleCard
                                                key={cycle.id}
                                                cycle={cycle as any}
                                                onPress={() => router.push(`/cycle/${cycle.id}` as any)}
                                                onAction={handleCycleAction}
                                            />
                                        ))
                                    ) : (
                                        <View className="py-20 items-center justify-center">
                                            <BirdyLoader size={48} color="#10b981" />
                                            <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Cards</Text>
                                        </View>
                                    )
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
                                <Text className="text-lg font-black text-foreground">Stock Ledger</Text>
                            </View>
                            <Icon as={ledgerExpanded ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {ledgerExpanded && (
                            <View className="pb-5">
                                <View className="flex-row items-center justify-between mb-4 bg-muted/10 p-3 rounded-xl border border-border/30">
                                    <Text className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Main Stock</Text>
                                    <View className="flex-row items-baseline gap-1">
                                        <Text className="text-xl font-black text-foreground">{farmer.mainStock.toFixed(2) || 0}</Text>
                                        <Text className="text-xs font-medium text-muted-foreground">b</Text>
                                    </View>
                                </View>
                                {ledgerLoading ? (
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Fetching Ledger</Text>
                                    </View>
                                ) : ledgerData && ledgerData.length > 0 ? (
                                    renderLedgerCards ? (
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
                                        <View className="py-20 items-center justify-center">
                                            <BirdyLoader size={48} color="#10b981" />
                                            <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Logs</Text>
                                        </View>
                                    )
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
                        onPress={() => setIsDeleteOpen(true)}
                        className="h-14 flex-row items-center justify-center gap-2"
                    >
                        <Icon as={Trash2} size={18} className="text-destructive" />
                        <Text className="text-destructive font-bold">Delete Farmer Profile</Text>
                    </Button>
                </View>
            </ScrollView>

            {/* Farmer-level Modals */}
            <RestockModal
                open={isRestockOpen}
                onOpenChange={setIsRestockOpen}
                farmerId={farmer.id}
                farmerName={farmer.name}
                onSuccess={() => {
                    refetchAll();
                }}
            />
            <StockCorrectionModal
                open={isCorrectionOpen}
                onOpenChange={setIsCorrectionOpen}
                farmerId={farmer.id}
                farmerName={farmer.name}
                onSuccess={() => {
                    refetchAll();
                }}
            />
            <SecurityMoneyModal
                open={isSecurityOpen}
                onOpenChange={setIsSecurityOpen}
                farmer={farmer}
                onSuccess={refetchAll}
            />
            <EditFarmerModal
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                farmer={farmer}
                onSuccess={refetchAll}
            />
            <StartCycleModal
                open={isStartCycleOpen}
                onOpenChange={setIsStartCycleOpen}
                farmer={farmer}
                onSuccess={refetchAll}
            />
            <DeleteFarmerModal
                open={isDeleteOpen}
                onOpenChange={setIsDeleteOpen}
                farmerId={farmer.id}
                organizationId={farmer.organizationId}
                farmerName={farmer.name}
            />
            <TransferStockModal
                open={isTransferOpen}
                onOpenChange={setIsTransferOpen}
                sourceFarmerId={farmer.id}
                sourceFarmerName={farmer.name}
                availableStock={availableStock}
                onSuccess={() => {
                    refetchAll();
                    utils.officer.stock.getAllFarmersStock.invalidate();
                    utils.management.stock.getAllFarmersStock.invalidate();
                }}
            />

            {/* Cycle-level Modals */}
            {selectedCycle && (
                <>
                    <SellModal
                        cycleId={selectedCycle.id}
                        farmerId={selectedCycle.farmerId || farmer.id}
                        cycleName={selectedCycle.name}
                        farmerName={selectedCycle.farmerName || farmer.name}
                        farmerLocation={selectedCycle.farmerLocation || farmer.location || ''}
                        farmerMobile={selectedCycle.farmerMobile || farmer.mobile || ''}
                        cycleAge={selectedCycle.age || 0}
                        doc={selectedCycle.doc}
                        mortality={selectedCycle.mortality || 0}
                        birdsSold={selectedCycle.birdsSold || 0}
                        intake={parseFloat(String(selectedCycle.intake || 0))}
                        startDate={selectedCycle.createdAt ? new Date(selectedCycle.createdAt) : new Date()}
                        open={isSellOpen}
                        onOpenChange={setIsSellOpen}
                        onSuccess={refetchAll}
                    />

                    <AddMortalityModal
                        cycleId={selectedCycle.id}
                        startDate={selectedCycle.createdAt ? new Date(selectedCycle.createdAt) : null}
                        farmerName={selectedCycle.farmerName || farmer.name}
                        open={isAddMortalityOpen}
                        onOpenChange={setIsAddMortalityOpen}
                        onSuccess={refetchAll}
                    />

                    <CorrectDocModal
                        cycleId={selectedCycle.id}
                        currentDoc={parseInt(String(selectedCycle.doc || 0))}
                        open={isEditDocOpen}
                        onOpenChange={setIsEditDocOpen}
                        onSuccess={refetchAll}
                    />

                    <CorrectAgeModal
                        cycleId={selectedCycle.id}
                        currentAge={selectedCycle.age}
                        open={isEditAgeOpen}
                        onOpenChange={setIsEditAgeOpen}
                        onSuccess={refetchAll}
                    />

                    <CorrectMortalityModal
                        cycleId={selectedCycle.id}
                        open={isCorrectMortalityOpen}
                        onOpenChange={setIsCorrectMortalityOpen}
                        onSuccess={refetchAll}
                    />

                    <EndCycleModal
                        cycle={selectedCycle}
                        farmerName={selectedCycle.farmerName || farmer.name}
                        open={isEndCycleOpen}
                        onOpenChange={setIsEndCycleOpen}
                        onRecordSale={() => setIsSellOpen(true)}
                        onSuccess={refetchAll}
                    />

                    <ReopenCycleModal
                        open={isReopenModalOpen}
                        onOpenChange={setIsReopenModalOpen}
                        historyId={selectedCycle.id}
                        cycleName={selectedCycle.cycle?.name || selectedCycle.name || "Unknown Cycle"}
                        onSuccess={refetchAll}
                    />

                    <DeleteCycleModal
                        open={isDeleteCycleOpen}
                        onOpenChange={setIsDeleteCycleOpen}
                        historyId={selectedCycle.id}
                        cycleName={selectedCycle.cycle?.name || selectedCycle.name || "Unknown Cycle"}
                        onSuccess={refetchAll}
                    />
                </>
            )}
        </View>
    );
}
