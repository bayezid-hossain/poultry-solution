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
import { ArrowLeft, History, Landmark, Pencil, RotateCcw, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";

export default function FarmerLedgerScreen() {
    const utils = trpc.useUtils();
    const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: "stock" | "security" }>();
    const [tab, setTab] = useState<"stock" | "security">(initialTab || "stock");

    // Modal States
    const [editingLog, setEditingLog] = useState<any | null>(null);
    const [revertingLog, setRevertingLog] = useState<any | null>(null);
    const [revertingTransfer, setRevertingTransfer] = useState<{ id: string; note: string | null } | null>(null);

    const { data: farmer } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id }
    );

    const stockQuery = trpc.officer.stock.getHistory.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id && tab === "stock" }
    );

    const securityQuery = trpc.officer.farmers.getSecurityMoneyHistory.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id && tab === "security" }
    );

    const historyData = tab === "stock" ? stockQuery.data || [] : securityQuery.data || [];
    const isLoading = tab === "stock" ? stockQuery.isLoading : securityQuery.isLoading;

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

        return (
            <Card className={`mb-3 border-border/50 bg-card ${isReverted ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-row gap-3 flex-1">
                            <View className={`w-10 h-10 rounded-full items-center justify-center ${parseFloat(item.amount) > 0 ? "bg-emerald-500/10" : "bg-orange-500/10"
                                }`}>
                                <Icon
                                    as={Wheat}
                                    size={18}
                                    className={parseFloat(item.amount) > 0 ? "text-emerald-500" : "text-orange-500"}
                                />
                            </View>
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                    <Text className={`font-bold text-foreground ${isReverted ? 'line-through decoration-muted-foreground' : ''}`}>
                                        {item.type}
                                    </Text>
                                    <Badge variant="outline" className="h-5 px-2 border-border/50">
                                        <Text className="text-[10px] text-muted-foreground uppercase font-bold">
                                            {format(new Date(item.createdAt), "MMM d")}
                                        </Text>
                                    </Badge>
                                    {isReverted && (
                                        <Badge variant="destructive" className="h-5 px-1.5 bg-destructive/10 border-destructive/20">
                                            <Text className="text-[8px] text-destructive uppercase font-bold">Reverted</Text>
                                        </Badge>
                                    )}
                                </View>
                                <Text className="text-sm text-muted-foreground mt-1" numberOfLines={2}>{item.note || "No notes provided"}</Text>
                            </View>
                        </View>
                        <View className="items-end">
                            <Text className={`text-lg font-bold ${parseFloat(item.amount) > 0 ? "text-emerald-500" : "text-orange-500"
                                } ${isReverted ? 'line-through opacity-50' : ''}`}>
                                {parseFloat(item.amount) > 0 ? "+" : ""}{item.amount}
                            </Text>
                            <Text className="text-[10px] text-muted-foreground uppercase font-bold">Bags</Text>
                        </View>
                    </View>

                    {/* Actions Row */}
                    {!isCorrection && !isCycleClose && !isReverted && (
                        <View className="flex-row justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                            {isTransfer ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 flex-row gap-2 rounded-lg bg-destructive/5"
                                    onPress={() => setRevertingTransfer({ id: item.referenceId, note: item.note })}
                                >
                                    <Icon as={RotateCcw} size={12} className="text-destructive" />
                                    <Text className="text-[10px] font-bold text-destructive uppercase">Revert Transfer</Text>
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 flex-row gap-2 rounded-lg bg-primary/5"
                                        onPress={() => setEditingLog(item)}
                                    >
                                        <Icon as={Pencil} size={12} className="text-primary" />
                                        <Text className="text-[10px] font-bold text-primary uppercase">Edit</Text>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 flex-row gap-2 rounded-lg bg-destructive/5"
                                        onPress={() => setRevertingLog(item)}
                                    >
                                        <Icon as={RotateCcw} size={12} className="text-destructive" />
                                        <Text className="text-[10px] font-bold text-destructive uppercase">Revert</Text>
                                    </Button>
                                </>
                            )}
                        </View>
                    )}
                </CardContent>
            </Card>
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
            <View className="p-4 bg-muted/20 border-b border-border/50">
                <Text className="text-xl font-bold text-foreground">{farmer?.name}</Text>
                <Text className="text-sm text-muted-foreground">Historical transaction logs</Text>
            </View>

            {/* Summary Stats (Only for Stock tab) */}
            {tab === "stock" && (
                <View className="px-4 pt-4 flex-row gap-3">
                    <View className="flex-1 bg-card p-3 rounded-2xl border border-border/50 items-center justify-center">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Stock</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-base font-bold text-primary">{Number(farmer?.mainStock ?? 0).toFixed(1)}</Text>
                            <Text className="text-[10px] text-muted-foreground">bags</Text>
                        </View>
                    </View>
                    <View className="flex-1 bg-card p-3 rounded-2xl border border-border/50 items-center justify-center">
                        <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Consumed</Text>
                        <View className="flex-row items-baseline gap-1">
                            <Text className="text-base font-bold text-red-500">{Number(farmer?.totalConsumed ?? 0).toFixed(1)}</Text>
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
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                </View>
            ) : (
                <FlatList
                    data={historyData}
                    renderItem={tab === "stock" ? renderStockLog : renderSecurityLog}
                    keyExtractor={(item) => item.id}
                    contentContainerClassName="p-4 pt-0 pb-10"
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

            {/* Modals */}
            {editingLog && (
                <EditStockLogModal
                    open={!!editingLog}
                    onOpenChange={(open) => !open && setEditingLog(null)}
                    log={editingLog}
                    onSuccess={() => {
                        stockQuery.refetch();
                        farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                    }}
                />
            )}

            <RevertStockLogModal
                open={!!revertingLog}
                onOpenChange={(open) => !open && setRevertingLog(null)}
                log={revertingLog}
                onSuccess={() => {
                    stockQuery.refetch();
                    farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                }}
            />

            <RevertTransferModal
                open={!!revertingTransfer}
                onOpenChange={(open) => !open && setRevertingTransfer(null)}
                referenceId={revertingTransfer?.id || null}
                note={revertingTransfer?.note}
                onSuccess={() => {
                    stockQuery.refetch();
                    farmer?.id && utils.officer.farmers.getDetails.invalidate({ farmerId: farmer.id });
                }}
            />
        </View>
    );
}
