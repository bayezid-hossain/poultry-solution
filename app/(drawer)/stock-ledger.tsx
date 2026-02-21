/// <reference types="nativewind/types" />
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, ClipboardList, Package, RotateCcw, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

export default function StockLedgerScreen() {
    const [tab, setTab] = useState<"stock" | "imports">("stock");

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Stock Ledger" />

            <View className="bg-card border-b border-border/50 px-4 pb-3 pt-2">
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

            {tab === "stock" ? <StockTab /> : <ImportHistoryTab />}
        </View>
    );
}

function StockTab() {
    const { data, isLoading } = trpc.officer.stock.getAllFarmersStock.useQuery({
        limit: 100,
        cursor: 0,
    });

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
        <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
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
                <FarmerStockRow key={item.id} farmer={item} />
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

function FarmerStockRow({ farmer }: { farmer: { id: string; name: string; mainStock: number; updatedAt: Date | null } }) {
    const [expanded, setExpanded] = useState(false);

    const { data: history, isLoading } = trpc.officer.stock.getHistory.useQuery(
        { farmerId: farmer.id },
        { enabled: expanded }
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
            <Pressable onPress={() => setExpanded(!expanded)} className="active:bg-muted/30">
                <CardContent className="p-3 flex-row items-center justify-between">
                    <Text className="font-bold text-foreground flex-1">{farmer.name}</Text>
                    <View className="flex-row items-center gap-2">
                        <Text className="font-bold text-primary">{Number(farmer.mainStock).toFixed(1)} bags</Text>
                        <Icon as={expanded ? ChevronUp : ChevronDown} size={16} className="text-muted-foreground" />
                    </View>
                </CardContent>
            </Pressable>

            {expanded && (
                <View className="border-t border-border/50 bg-muted/5">
                    {isLoading ? (
                        <View className="py-6 items-center">
                            <ActivityIndicator size="small" color="hsl(var(--primary))" />
                        </View>
                    ) : history && history.length > 0 ? (
                        history.slice(0, 10).map((log: any) => {
                            const ti = typeIcon(log.type);
                            const amount = Number(log.amount);
                            return (
                                <View key={log.id} className="px-3 py-2.5 border-b border-border/20 flex-row items-center gap-3">
                                    <View className={`w-7 h-7 rounded-lg items-center justify-center ${ti.bg}`}>
                                        <Icon as={ti.icon} size={14} className={ti.color} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-xs font-medium text-foreground">{log.note || log.type}</Text>
                                        <Text className="text-[9px] text-muted-foreground">
                                            {format(new Date(log.createdAt), "dd MMM, h:mm a")}
                                        </Text>
                                    </View>
                                    <Text className={`text-sm font-bold ${amount >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                                        {amount >= 0 ? "+" : ""}{amount.toFixed(1)}
                                    </Text>
                                </View>
                            );
                        })
                    ) : (
                        <View className="px-3 py-4 items-center">
                            <Text className="text-xs text-muted-foreground">No logs</Text>
                        </View>
                    )}
                </View>
            )}
        </Card>
    );
}

function ImportHistoryTab() {
    const { data, isLoading } = trpc.officer.stock.getImportHistory.useQuery({
        limit: 50,
        cursor: 0,
    });

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="hsl(var(--primary))" />
            </View>
        );
    }

    const batches = data?.items ?? [];

    return (
        <ScrollView contentContainerClassName="p-4 pb-20" className="flex-1">
            <View className="flex-row items-center gap-2 mb-4 px-1">
                <Icon as={Package} size={16} className="text-primary" />
                <Text className="text-base font-bold text-foreground">Bulk Imports</Text>
                <Badge variant="outline" className="ml-auto border-primary/30 h-6 px-2.5">
                    <Text className="text-[10px] text-primary font-bold">{batches.length}</Text>
                </Badge>
            </View>

            {batches.map((batch: any) => (
                <Card key={batch.batchId} className="mb-3 border-border/50">
                    <CardContent className="p-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center gap-2">
                                <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center">
                                    <Icon as={Package} size={16} className="text-primary" />
                                </View>
                                <View>
                                    <Text className="text-xs font-bold text-foreground">
                                        {format(new Date(batch.createdAt), "dd MMM yyyy, h:mm a")}
                                    </Text>
                                    {batch.driverName && (
                                        <Text className="text-[10px] text-muted-foreground">
                                            Driver: {batch.driverName}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                        <View className="flex-row gap-4">
                            <Text className="text-xs text-muted-foreground">
                                {batch.count} farmer{batch.count !== 1 ? "s" : ""}
                            </Text>
                            <Text className="text-xs font-bold text-primary">
                                +{batch.totalAmount.toFixed(1)} bags
                            </Text>
                        </View>
                    </CardContent>
                </Card>
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
