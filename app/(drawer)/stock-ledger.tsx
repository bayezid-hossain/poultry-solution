/// <reference types="nativewind/types" />
import { OfficerSelector } from "@/components/dashboard/officer-selector";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useGlobalFilter } from "@/context/global-filter-context";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Link, router } from "expo-router";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronDown, ChevronUp, ClipboardList, Package, RotateCcw, User, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";

export default function StockLedgerScreen() {
    const [tab, setTab] = useState<"stock" | "imports">("stock");
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const { selectedOfficerId } = useGlobalFilter();

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Stock Ledger and Import History" />

            <View className="bg-card border-b border-border/50 px-4 pb-3 pt-2">
                {isManagement && (
                    <View className="mb-3">
                        <OfficerSelector orgId={membership?.orgId ?? ""} />
                    </View>
                )}
                <View className="flex-row gap-2">
                    <Pressable
                        onPress={() => setTab("stock")}
                        className={`flex-1 h-10 rounded-xl items-center justify-center ${tab === "stock" ? "bg-primary" : "bg-muted/30 border border-border/50"}`}
                    >
                        <Text className={`text-sm font-bold ${tab === "stock" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            Current Stock
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setTab("imports")}
                        className={`flex-1 h-10 rounded-xl items-center justify-center ${tab === "imports" ? "bg-primary" : "bg-muted/30 border border-border/50"}`}
                    >
                        <Text className={`text-sm font-bold ${tab === "imports" ? "text-primary-foreground" : "text-muted-foreground"}`}>
                            Import History
                        </Text>
                    </Pressable>
                </View>
            </View>

            {tab === "stock" ? <StockTab isManagement={isManagement} officerId={isManagement ? (selectedOfficerId || undefined) : undefined} orgId={membership?.orgId ?? ""} /> : <ImportHistoryTab isManagement={isManagement} officerId={isManagement ? (selectedOfficerId || undefined) : undefined} orgId={membership?.orgId ?? ""} />}
        </View>
    );
}

function StockTab({ isManagement, officerId, orgId }: { isManagement: boolean; officerId?: string; orgId: string }) {
    const officerQuery = trpc.officer.stock.getAllFarmersStock.useQuery(
        { limit: 100, cursor: 0 },
        { enabled: !isManagement }
    );
    const mgmtQuery = trpc.management.stock.getAllFarmersStock.useQuery(
        { orgId, limit: 100, cursor: 0, officerId },
        { enabled: isManagement }
    );
    const data = isManagement ? mgmtQuery.data : officerQuery.data;
    const isLoading = isManagement ? mgmtQuery.isLoading : officerQuery.isLoading;
    const refetch = isManagement ? mgmtQuery.refetch : officerQuery.refetch;

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="hsl(var(--primary))" />
            </View>
        );
    }

    const items = data?.items ?? [];
    const totalStock = items.reduce((acc: number, f: { mainStock: number | null; }) => acc + Number(f.mainStock ?? 0), 0);

    return (
        <ScrollView
            contentContainerClassName="p-4 pb-20"
            className="flex-1"
            refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={refetch} />
            }
        >
            {/* Total Summary */}
            <Card className="mb-6 border-border/50 bg-primary/5">
                <CardContent className="p-4 items-center">
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mb-2">
                        <Icon as={Wheat} size={24} className="text-primary" />
                    </View>
                    <Text className="text-3xl font-black text-primary tracking-tight">
                        {totalStock.toFixed(1)}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Total Feed Stock (bags)</Text>
                </CardContent>
            </Card>

            {/* Per-Farmer Stock */}
            <View className="flex-row items-center gap-2 mb-3 px-1">
                <Icon as={ClipboardList} size={16} className="text-primary" />
                <Text className="text-base font-bold text-foreground">By Farmer</Text>
                <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                    <Text className="text-[10px] text-primary font-bold">{items.length}</Text>
                </Badge>
            </View>

            {items.map((item: any) => (
                <FarmerStockRow key={item.id} farmer={item} isManagement={isManagement} orgId={orgId} />
            ))}

            {items.length === 0 && (
                <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                    <CardContent className="flex-1 items-center justify-center">
                        <Text className="text-muted-foreground">No stock data</Text>
                    </CardContent>
                </Card>
            )}
        </ScrollView>
    );
}

function FarmerStockRow({ farmer, isManagement, orgId }: { farmer: { id: string; name: string; mainStock: number; updatedAt: Date | null }; isManagement: boolean; orgId: string }) {
    const [expanded, setExpanded] = useState(false);

    const stockHistoryProcedure = isManagement ? trpc.management.stock.getHistory : trpc.officer.stock.getHistory;
    const { data: history, isLoading } = (stockHistoryProcedure as any).useQuery(
        { farmerId: farmer.id, orgId: isManagement ? orgId : undefined },
        { enabled: expanded && (isManagement ? !!orgId : true) }
    );

    const typeIcon = (type: string) => {
        switch (type) {
            case "RESTOCK": return { icon: ArrowDownLeft, color: "text-emerald-500", bg: "bg-emerald-500/10" };
            case "TRANSFER_IN": return { icon: ArrowDownLeft, color: "text-blue-500", bg: "bg-blue-500/10" };
            case "TRANSFER_OUT": return { icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10" };
            case "CORRECTION": return { icon: RotateCcw, color: "text-destructive", bg: "bg-destructive/10" };
            default: return { icon: Wheat, color: "text-muted-foreground", bg: "bg-muted/10" };
        }
    };

    return (
        <Card className="mb-2 border-border/50 overflow-hidden">
            <CardContent className="p-0 flex-row items-center justify-between">
                <Pressable
                    className="flex-1 p-3 active:bg-muted/30"
                    onPress={() => router.push(`/farmer/${farmer.id}` as any)}
                    hitSlop={{ top: 25, bottom: 25, left: 20, right: 20 }}
                    style={{ backgroundColor: 'transparent' }}
                >
                    <View pointerEvents="none">
                        <Text className="font-bold text-foreground active:opacity-70">
                            {farmer.name}
                        </Text>
                    </View>
                </Pressable>
                <Pressable
                    className="flex-row items-center gap-2 p-3 active:bg-muted/30 border-l border-border/10"
                    onPress={() => setExpanded(!expanded)}
                >
                    <Text className="font-bold text-primary" pointerEvents="none">{Number(farmer.mainStock).toFixed(1)} bags</Text>
                    <Icon as={expanded ? ChevronUp : ChevronDown} size={16} className="text-muted-foreground" />
                </Pressable>
            </CardContent>

            {expanded && (
                <View className="border-t border-border/50 bg-muted/5 pb-2">
                    <View className="mb-2 bg-muted/10 p-3 rounded-xl border border-border/30 mx-3 mt-3 flex-row items-center justify-between">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Main Stock</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-xl font-black text-foreground">{farmer.mainStock || 0}</Text>
                            <Text className="text-[10px] font-medium text-muted-foreground">b</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center bg-muted/20 px-4 py-2 mb-1 border-y border-border/10">
                        <Text className="w-12 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Date</Text>
                        <Text className="flex-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Type</Text>
                        <Text className="flex-[1.2] text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Note</Text>
                        <Text className="w-14 text-right text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Change</Text>
                    </View>

                    {isLoading ? (
                        <View className="py-6 items-center">
                            <ActivityIndicator size="small" color="hsl(var(--primary))" />
                        </View>
                    ) : history && history.length > 0 ? (
                        history.slice(0, 10).map((log: any) => {
                            const ti = typeIcon(log.type);
                            const amount = Number(log.amount);
                            const isReverted = false; // Simplified for this view

                            return (
                                <View key={log.id} className="flex-row items-center py-3 border-b border-border/5 px-4">
                                    <Text className="w-12 text-[10px] text-muted-foreground font-medium">
                                        {format(new Date(log.createdAt), "dd MMM")}
                                    </Text>

                                    <View className="flex-1 flex-row items-center gap-1.5 pl-1">
                                        <View className={`w-4 h-4 rounded items-center justify-center ${ti.bg}`}>
                                            <Icon as={ti.icon} size={10} className={ti.color} />
                                        </View>
                                        <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                                            {log.type.replace(/_/g, ' ').replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())}
                                        </Text>
                                    </View>

                                    <View className="flex-[1.2] pr-2 justify-center">
                                        {log.type === "CORRECTION" && log.referenceId ? (() => {
                                            const originalLog = history.find((l: any) => l.id === log.referenceId);
                                            if (originalLog) {
                                                const origAmt = parseFloat(originalLog.amount);
                                                const deltaAmt = parseFloat(log.amount);
                                                const newAmt = origAmt + deltaAmt;
                                                return (
                                                    <View className="flex-row items-center gap-1 opacity-80">
                                                        <Text className="text-[9px] text-muted-foreground line-through">{origAmt > 0 ? "+" : ""}{origAmt}</Text>
                                                        <Text className="text-[9px] text-muted-foreground">→</Text>
                                                        <Text className={`text-[9px] font-bold ${newAmt > 0 ? 'text-emerald-500' : 'text-orange-500'}`}>{newAmt > 0 ? "+" : ""}{newAmt}</Text>
                                                    </View>
                                                );
                                            }
                                            return <Text className="text-[10px] text-muted-foreground" numberOfLines={2}>{log.note || "-"}</Text>;
                                        })() : (
                                            <Text className="text-[10px] text-muted-foreground" numberOfLines={2}>
                                                {log.note || "-"}
                                            </Text>
                                        )}
                                    </View>

                                    <View className="items-end w-14">
                                        <Text className={`text-xs font-bold ${amount >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                            {amount >= 0 ? "+" : ""}{amount.toFixed(1)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <View className="px-3 py-6 items-center">
                            <Text className="text-xs text-muted-foreground">No logs found</Text>
                        </View>
                    )}

                    <View className="px-4 py-3 bg-muted/10 border-t border-border/10">
                        <Link href={`/farmer/${farmer.id}/ledger` as any} asChild>
                            <Pressable className="h-10 rounded-xl bg-background border border-border/50 items-center justify-center flex-row gap-2">
                                <Text className="text-sm font-bold text-foreground">View Full Ledger</Text>
                                <Icon as={ArrowRight} size={14} className="text-muted-foreground" />
                            </Pressable>
                        </Link>
                    </View>
                </View>
            )}
        </Card>
    );
}

function ImportHistoryTab({ isManagement, officerId, orgId }: { isManagement: boolean; officerId?: string; orgId: string }) {
    const officerQuery = trpc.officer.stock.getImportHistory.useQuery(
        { limit: 50, cursor: 0 },
        { enabled: !isManagement }
    );
    const mgmtQuery = trpc.management.stock.getImportHistory.useQuery(
        { orgId, limit: 50, cursor: 0, officerId },
        { enabled: isManagement }
    );
    const data = isManagement ? mgmtQuery.data : officerQuery.data;
    const isLoading = isManagement ? mgmtQuery.isLoading : officerQuery.isLoading;
    const refetch = isManagement ? mgmtQuery.refetch : officerQuery.refetch;

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="hsl(var(--primary))" />
            </View>
        );
    }

    const batches = data?.items ?? [];

    return (
        <ScrollView
            contentContainerClassName="p-4 pb-20"
            className="flex-1"
            refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={refetch} />
            }
        >
            <View className="flex-row items-center gap-2 mb-4 px-1">
                <Icon as={Package} size={16} className="text-primary" />
                <Text className="text-base font-bold text-foreground">Bulk Imports</Text>
                <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                    <Text className="text-[10px] text-primary font-bold">{batches.length}</Text>
                </Badge>
            </View>

            {batches.map((batch: any) => (
                <BatchHistoryRow key={batch.batchId} batch={batch} isManagement={isManagement} orgId={orgId} />
            ))}

            {batches.length === 0 && (
                <Card className="border-dashed border-border/50 bg-muted/10 h-32">
                    <CardContent className="flex-1 items-center justify-center">
                        <Text className="text-muted-foreground">No import history</Text>
                    </CardContent>
                </Card>
            )}
        </ScrollView>
    );
}

function BatchHistoryRow({ batch, isManagement, orgId }: { batch: any; isManagement: boolean; orgId: string }) {
    const [expanded, setExpanded] = useState(false);

    const batchDetailsProcedure = isManagement ? trpc.management.stock.getBatchDetails : trpc.officer.stock.getBatchDetails;
    const { data: details, isLoading } = (batchDetailsProcedure as any).useQuery(
        { batchId: batch.batchId, orgId: isManagement ? orgId : undefined },
        { enabled: expanded && (isManagement ? !!orgId : true) }
    );

    return (
        <View className="mb-4 border border-border/70 rounded-2xl bg-card/60 p-4">
            <View className="p-4 flex-row gap-4">
                <Pressable
                    onPress={() => setExpanded(!expanded)}
                    className="w-12 h-12 rounded-full bg-muted/40 items-center justify-center -ml-1 border border-border/90 bg-card/60"
                >
                    <Icon as={expanded ? ChevronUp : ChevronDown} size={20} className="text-foreground" />
                </Pressable>

                <View className="flex-1">
                    <View className="flex-row justify-between items-start mb-6">
                        <View>
                            <Text className="text-xl font-bold text-foreground tracking-tight">Import</Text>
                            <Text className="text-xl font-bold text-foreground tracking-tight mb-1">
                                #{batch.batchId?.slice(0, 8)}
                            </Text>
                            <Text className="text-sm text-muted-foreground mt-0.5">
                                {format(new Date(batch.createdAt), "dd/MM/yyyy 'at' \nh:mm a")}
                            </Text>
                        </View>

                        <View className="items-end gap-2.5">
                            <Badge variant="outline" className="border-border/30 bg-muted/10 h-7 px-3.5 rounded-full">
                                <Text className="text-xs font-bold text-foreground tracking-wide">{batch.count} Farmers</Text>
                            </Badge>
                            {batch.driverName && (
                                <Badge variant="outline" className="border-border/30 bg-muted/10 h-7 px-3 rounded-full flex-row items-center gap-1.5">
                                    <Icon as={User} size={12} className="text-foreground" />
                                    <Text className="text-[11px] font-medium text-foreground tracking-wide ml-0.5">Driver: {batch.driverName}</Text>
                                </Badge>
                            )}
                        </View>
                    </View>

                    <View>
                        <Text className="text-lg font-black text-foreground">
                            {batch.totalAmount.toLocaleString()} Bags
                        </Text>
                        <Text className="text-[13px] text-muted-foreground mt-0.5">Total Added</Text>
                    </View>
                </View>
            </View>

            {expanded && (
                <View className="mt-4 border-t border-border/20 pt-4 px-1">
                    {/* Premium Table Header */}
                    <View className="flex-row items-center bg-muted/30 rounded-xl px-4 py-3 mb-2">
                        <Text className="flex-[2] text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Farmer Name</Text>
                        <Text className="flex-1 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right pr-2">Quantity</Text>
                    </View>

                    {isLoading ? (
                        <View className="py-12 items-center justify-center">
                            <ActivityIndicator size="small" color="hsl(var(--primary))" />
                        </View>
                    ) : details && details.length > 0 ? (
                        <View className="bg-card/40 rounded-2xl border border-border/10 overflow-hidden">
                            {details.map((item: any, index: number) => {
                                const amount = Number(item.amount);
                                return (
                                    <View
                                        key={item.logId}
                                        className={`flex-row items-center px-4 py-4 ${index !== details.length - 1 ? "border-b border-border/5" : ""}`}
                                    >
                                        <View className="flex-[2]">
                                            <Pressable
                                                onPress={() => router.push(`/farmer/${item.farmerId}` as any)}
                                                hitSlop={{ top: 25, bottom: 25, left: 20, right: 20 }}
                                                style={{ backgroundColor: 'transparent' }}
                                            >
                                                <View pointerEvents="none">
                                                    <Text
                                                        className="text-[15px] font-bold text-foreground active:opacity-70 tracking-tight"
                                                        numberOfLines={2}
                                                    >
                                                        {item.farmerName}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                            <View className="flex-row items-center gap-1.5 mt-1">
                                                <View className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                <Text className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-wrap flex-1" pointerEvents="none">Confirmed Receipt</Text>
                                            </View>
                                        </View>

                                        <View className="flex-1 items-end">
                                            <View className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
                                                <Text className="text-sm font-black text-primary">
                                                    +{amount.toFixed(0)} <Text className="text-[10px] font-medium opacity-60">bags</Text>
                                                </Text>
                                            </View>
                                            <Link href={`/farmer/${item.farmerId}/ledger` as any} asChild>
                                                <Pressable className="mt-2.5 flex-row items-center gap-1.5 opacity-80 active:opacity-100">
                                                    <Text className="text-[10px] text-primary font-bold tracking-widest uppercase">Details</Text>
                                                    <Icon as={ArrowRight} size={10} className="text-primary" />
                                                </Pressable>
                                            </Link>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="py-10 items-center justify-center bg-muted/10 rounded-2xl border border-dashed border-border/30">
                            <Text className="text-xs text-muted-foreground italic font-medium">No details found for this batch</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
