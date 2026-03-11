import { EditStockLogModal } from "@/components/farmers/edit-stock-log-modal";
import { RevertStockLogModal } from "@/components/farmers/revert-stock-log-modal";
import { RevertTransferModal } from "@/components/farmers/revert-transfer-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, History, Landmark, Pencil, RotateCcw, Wheat } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

export default function FarmerLedgerScreen() {
    const utils = trpc.useUtils();
    const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: "stock" | "security" }>();
    const [tab, setTab] = useState<"stock" | "security">(initialTab || "stock");

    // Modal States
    const [editingLog, setEditingLog] = useState<any | null>(null);
    const [revertingLog, setRevertingLog] = useState<any | null>(null);
    const [revertingTransfer, setRevertingTransfer] = useState<{ id: string; note: string | null } | null>(null);

    // Highlighting State
    const flatListRef = useRef<FlatList>(null);
    const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null);

    const scrollToAndHighlight = (targetId: string) => {
        const index = historyData.findIndex((log: any) => log.id === targetId);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            setHighlightedLogId(targetId);
            setTimeout(() => setHighlightedLogId(null), 2000);
        }
    };

    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";

    const detailProcedure = isManagement ? trpc.management.farmers.getDetails : trpc.officer.farmers.getDetails;
    const { data: farmer } = (detailProcedure as any).useQuery(
        { farmerId: id ?? "", orgId: membership?.orgId ?? "" },
        { enabled: !!id && (isManagement ? !!membership?.orgId : true) }
    );

    const stockHistoryProcedure = isManagement ? trpc.management.stock.getHistory : trpc.officer.stock.getHistory;
    const stockQuery = (stockHistoryProcedure as any).useQuery(
        { farmerId: id ?? "", orgId: membership?.orgId ?? "" },
        { enabled: !!id && tab === "stock" && (isManagement ? !!membership?.orgId : true) }
    );

    const securityHistoryProcedure = isManagement ? trpc.management.farmers.getSecurityMoneyHistory : trpc.officer.farmers.getSecurityMoneyHistory;
    const securityQuery = (securityHistoryProcedure as any).useQuery(
        { farmerId: id ?? "", orgId: membership?.orgId ?? "" },
        { enabled: !!id && tab === "security" && (isManagement ? !!membership?.orgId : true) }
    );

    const historyData = tab === "stock" ? stockQuery.data || [] : securityQuery.data || [];
    const isLoading = tab === "stock" ? stockQuery.isLoading : securityQuery.isLoading;

    const activeCycles = farmer?.cycles?.filter((c: any) => c.status === 'active') || [];
    const mainStock = Number(farmer?.mainStock ?? 0);
    const activeConsumption = activeCycles.reduce((acc: number, c: any) => acc + (parseFloat(c.intake) || 0), 0);
    const availableStock = mainStock - activeConsumption;

    // Derived state: Identify logs that have been reverted
    const revertedLogIds = new Set(
        historyData
            .filter((item: any) => item.type === "CORRECTION" && item.referenceId)
            .map((item: any) => item.referenceId)
    );



    const renderStockLog = ({ item }: { item: any }) => {
        const isCorrection = item.type === "CORRECTION";
        const isTransfer = item.type === "TRANSFER_IN" || item.type === "TRANSFER_OUT";
        const isCycleClose = item.type === "CYCLE_CLOSE";
        const isReverted = revertedLogIds.has(item.id);
        const isHighlighted = item.id === highlightedLogId;

        return (
            <View className={`flex-row items-center py-4 border-b border-border/10 px-1 ${isHighlighted ? 'bg-primary/20 rounded-xl' : ''}`}>
                {/* Date Column */}
                <View className="w-14 items-center justify-center">
                    <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                        {format(new Date(item.createdAt), "dd")}
                    </Text>
                    <Text className="text-[9px] text-muted-foreground/60 font-bold uppercase">
                        {format(new Date(item.createdAt), "MMM")}
                    </Text>
                </View>

                {/* Type Column */}
                <View className="flex-[1.2] flex-row items-center gap-2 pl-1">
                    <View className={`w-6 h-6 rounded-full items-center justify-center ${parseFloat(item.amount) > 0 ? "bg-emerald-500/10" : "bg-orange-500/10"}`}>
                        <Icon as={parseFloat(item.amount) > 0 ? ArrowUpRight : ArrowDownLeft} size={14} className={parseFloat(item.amount) > 0 ? "text-emerald-500" : "text-orange-500"} />
                    </View>
                    <Text className={`text-[12px] font-bold text-foreground flex-1`}>
                        {item.type === 'CORRECTION' ? 'Adjustment' : item.type.replace(/_/g, ' ').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())}
                    </Text>
                </View>

                {/* Note/Details Column */}
                <View className="flex-1 px-2 justify-center">
                    {isCorrection && item.referenceId ? (() => {
                        const originalLog = historyData.find((l: any) => l.id === item.referenceId);
                        if (originalLog) {
                            const origAmt = parseFloat(originalLog.amount);
                            const priorCorrections = historyData.filter((l: any) =>
                                l.type === "CORRECTION" &&
                                l.referenceId === item.referenceId &&
                                new Date(l.createdAt).getTime() < new Date(item.createdAt).getTime()
                            );
                            const priorDeltaSum = priorCorrections.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);

                            const currentBaseAmt = origAmt + priorDeltaSum;
                            const newAmt = currentBaseAmt + parseFloat(item.amount);
                            return (
                                <View>
                                    <View className="flex-row items-center gap-1 opacity-80">
                                        <Text className="text-[10px] text-muted-foreground line-through">{currentBaseAmt > 0 ? "+" : ""}{currentBaseAmt}</Text>
                                        <Text className="text-[10px] text-muted-foreground">→</Text>
                                        <Text className={`text-[10px] font-bold ${newAmt > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>{newAmt > 0 ? "+" : ""}{newAmt}</Text>
                                    </View>
                                    <Pressable onPress={() => scrollToAndHighlight(item.referenceId)} className="mt-0.5">
                                        <Text className="text-[10px] text-primary font-bold">
                                            View Original
                                        </Text>
                                    </Pressable>
                                </View>
                            );
                        }
                        return (
                            <Text className="text-[10px] text-muted-foreground font-medium">
                                {item.note || "-"}
                            </Text>
                        );
                    })() : (
                        <Text className="text-[10px] text-muted-foreground font-medium">
                            {item.note || "-"}
                        </Text>
                    )}
                </View>

                {/* Change & Balance Column */}
                <View className="w-24 items-end pr-1">
                    <Text className={`text-sm font-black ${parseFloat(item.amount) > 0 ? "text-emerald-500" : "text-orange-500"}`}>
                        {parseFloat(item.amount) > 0 ? "+" : ""}{parseFloat(item.amount).toFixed(1)}
                    </Text>
                    {item.balanceAfter != null && (
                        <View className="flex-row items-center gap-0.5 mt-0.5">
                            <Text className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-tighter">Bal:</Text>
                            <Text className="text-[10px] text-muted-foreground font-black">
                                {Number(item.balanceAfter).toFixed(1)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Actions Column */}
                <View className="w-8 items-end justify-center">
                    {!isCorrection && !isCycleClose && !isReverted && item.type !== "ADJUSTMENT" && item.type !== "CYCLE_CONSUMPTION" ? (
                        <View className="gap-1">
                            {!isTransfer ? (
                                <View className="gap-0.5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-lg"
                                        onPress={() => setEditingLog(item)}
                                    >
                                        <Icon as={Pencil} size={12} className="text-muted-foreground" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-lg"
                                        onPress={() => setRevertingLog(item)}
                                    >
                                        <Icon as={RotateCcw} size={12} className="text-orange-500" />
                                    </Button>
                                </View>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-lg"
                                    onPress={() => setRevertingTransfer({ id: item.referenceId, note: item.note })}
                                >
                                    <Icon as={RotateCcw} size={12} className="text-orange-500" />
                                </Button>
                            )}
                        </View>
                    ) : (
                        <View className="w-8" />
                    )}
                </View>
            </View>
        );
    };

    const renderSecurityLog = ({ item }: { item: any }) => (
        <Card className="mb-3 border-border/50 bg-card">
            <CardContent className="p-4">
                <View className="flex-row justify-between items-start">
                    <View className="flex-row gap-3 flex-1">
                        <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                            <Icon as={Landmark} size={18} className="text-blue-500" />
                        </View>
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                                <Text className="font-bold text-foreground">Update</Text>
                                <Badge variant="outline" className="h-5 px-2 border-border/50">
                                    <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                                        {format(new Date(item.changedAt), "MMM d, h:mm a")}
                                    </Text>
                                </Badge>
                            </View>
                            <Text className="text-sm text-muted-foreground mt-1">{item.reason || "Standard Update"}</Text>
                            <Text className="text-[10px] text-muted-foreground mt-1">By: {item.editor?.name || "System"}</Text>
                        </View>
                    </View>
                    <View className="items-end">
                        <Text className="text-lg font-bold text-blue-500">
                            ৳{Number(item.newAmount).toLocaleString()}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                            Prev: ৳{Number(item.previousAmount).toLocaleString()}
                        </Text>
                    </View>
                </View>
            </CardContent>
        </Card>
    );

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title="Farmer Ledger"
                leftElement={
                    <Pressable onPress={() => router.back()} className="p-2 -ml-2">
                        <Icon as={ArrowLeft} size={24} className="text-foreground" />
                    </Pressable>
                }
            />

            {/* Header Info */}
            <View className="px-4 py-3 bg-muted/20 border-b border-border/50">
                <Pressable
                    onPress={() => router.push(`/farmer/${id}` as any)}
                    hitSlop={{ top: 25, bottom: 25, left: 20, right: 20 }}
                    style={{ backgroundColor: 'transparent' }}
                >
                    <View pointerEvents="none">
                        <Text
                            className="text-xl font-black text-foreground active:opacity-70 uppercase tracking-tight"
                        >
                            {farmer?.name}
                        </Text>
                    </View>
                </Pressable>
                <Text className="text-xs text-muted-foreground font-medium mt-1">Stock Ledger • Historical Transaction Logs</Text>
            </View>

            {/* Summary Stats (Only for Stock tab) */}
            {tab === "stock" && (
                <View className="px-4 pt-4 flex-row gap-2">
                    <View className="flex-[1.2] bg-card p-3 rounded-2xl border border-border/50 items-center justify-center">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1 text-center">Provisioned</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-base font-bold text-foreground">{mainStock.toFixed(1)}</Text>
                            <Text className="text-[10px] text-muted-foreground">bags</Text>
                        </View>
                    </View>
                    <View className="flex-1 bg-card p-3 rounded-2xl border border-border/50 items-center justify-center">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Consumed</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-base font-bold text-orange-500">{activeConsumption.toFixed(1)}</Text>
                            <Text className="text-[10px] text-muted-foreground">bags</Text>
                        </View>
                    </View>
                    <View className="flex-1 bg-card p-3 rounded-2xl border border-border/50 items-center justify-center">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Stock</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-base font-bold text-emerald-500">{availableStock.toFixed(1)}</Text>
                            <Text className="text-[10px] text-muted-foreground">bags</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View className="flex-row p-4 gap-2">
                <Button
                    variant={tab === "stock" ? "default" : "outline"}
                    className="flex-1 h-11 flex-row gap-2 rounded-xl"
                    onPress={() => setTab("stock")}
                >
                    <Icon as={Wheat} size={14} className={tab === "stock" ? "text-primary-foreground" : "text-muted-foreground"} />
                    <Text className={tab === "stock" ? "text-primary-foreground font-bold" : "text-muted-foreground"}>Feed Stock</Text>
                </Button>
                <Button
                    variant={tab === "security" ? "default" : "outline"}
                    className="flex-1 h-11 flex-row gap-2 rounded-xl"
                    onPress={() => setTab("security")}
                >
                    <Icon as={Landmark} size={14} className={tab === "security" ? "text-primary-foreground" : "text-muted-foreground"} />
                    <Text className={tab === "security" ? "text-primary-foreground font-bold" : "text-muted-foreground"}>Security</Text>
                </Button>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Syncing Ledger</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={historyData}
                    extraData={highlightedLogId}
                    renderItem={tab === "stock" ? renderStockLog : renderSecurityLog}
                    keyExtractor={(item) => item.id}
                    contentContainerClassName="px-4 pb-[100px]"
                    ListHeaderComponent={tab === "stock" && historyData.length > 0 ? (
                        <View className="flex-row py-3 border-y border-border/20 items-center bg-muted/5">
                            <Text className="w-14 text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Date</Text>
                            <View className="flex-[1.2] flex-row items-center">
                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</Text>
                            </View>
                            <Text className="flex-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Transaction Details</Text>
                            <View className="w-24 items-end pr-1">
                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Change / Bal</Text>
                            </View>
                            <View className="w-8" />
                        </View>
                    ) : null}
                    ListEmptyComponent={
                        <View className="items-center justify-center p-10 opacity-50">
                            <Icon as={History} size={48} className="text-muted-foreground mb-4" />
                            <Text className="text-center text-lg font-medium">No records found</Text>
                            <Text className="text-center text-sm text-muted-foreground">
                                {tab === "stock" ? "Stock movements will appear here" : "Security money updates will appear here"}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Bottom Sticky Summary (Stock only) */}
            {tab === "stock" && !isLoading && historyData.length > 0 && (
                <View className="absolute bottom-0 right-0 left-0 flex-row items-center justify-end p-2 gap-3 w-full bg-card">
                    <Text className="text-[10px] font-black text-muted-foreground tracking-widest uppercase pb-1">Main Stock</Text>
                    <View className="bg-card border border-border/50 rounded-2xl px-5 py-3 shadow-lg flex-row items-baseline gap-1">
                        <Text className="text-2xl font-black text-foreground">{mainStock}</Text>
                        <Text className="text-sm font-medium text-muted-foreground">b</Text>
                    </View>
                </View>
            )}

            {/* Modals */}
            {editingLog && (
                <EditStockLogModal
                    open={!!editingLog}
                    onOpenChange={(open) => !open && setEditingLog(null)}
                    log={editingLog}
                    onSuccess={() => {
                        stockQuery.refetch();
                        utils.officer.stock.getAllFarmersStock.invalidate();
                        utils.officer.stock.getImportHistory.invalidate();
                        utils.management.stock.getAllFarmersStock.invalidate();
                        utils.management.stock.getImportHistory.invalidate();
                        farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                        farmer?.id && utils.management.farmers.getDetails.invalidate({ farmerId: farmer.id });
                    }}
                />
            )}

            <RevertStockLogModal
                open={!!revertingLog}
                onOpenChange={(open) => !open && setRevertingLog(null)}
                log={revertingLog}
                onSuccess={() => {
                    stockQuery.refetch();
                    utils.officer.stock.getAllFarmersStock.invalidate();
                    utils.officer.stock.getImportHistory.invalidate();
                    utils.management.stock.getAllFarmersStock.invalidate();
                    utils.management.stock.getImportHistory.invalidate();
                    farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                    farmer?.id && utils.management.farmers.getDetails.invalidate({ farmerId: farmer.id });
                }}
            />

            <RevertTransferModal
                open={!!revertingTransfer}
                onOpenChange={(open) => !open && setRevertingTransfer(null)}
                referenceId={revertingTransfer?.id || null}
                note={revertingTransfer?.note}
                onSuccess={() => {
                    stockQuery.refetch();
                    utils.officer.stock.getAllFarmersStock.invalidate();
                    utils.officer.stock.getImportHistory.invalidate();
                    farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                }}
            />
        </View>
    );
}
