import { SaleEventCard } from "@/components/cycles/sale-event-card";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useFocusEffect, useRouter } from "expo-router";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, RefreshCw, Search, Trash2, User } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";

export default function SalesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: recentSales, isLoading: salesLoading, error: salesError, refetch } = trpc.officer.sales.getRecentSales.useQuery(
        { limit: 100, search: searchQuery },
        { enabled: !!membership?.orgId }
    );

    useFocusEffect(
        useCallback(() => {
            if (membership?.orgId) {
                refetch();
            }
        }, [membership?.orgId, refetch])
    );

    const groupedData = useMemo(() => {
        if (!recentSales) return [];

        const farmers: Record<string, { id: string; name: string; cycles: Record<string, any> }> = {};

        recentSales.forEach((sale: any) => {
            const fId = sale.cycle?.farmer?.id || sale.history?.farmer?.id || "unknown";
            const fName = sale.farmerName || sale.cycle?.farmer?.name || sale.history?.farmer?.name || "Unknown Farmer";

            if (!farmers[fId]) {
                farmers[fId] = { id: fId, name: fName, cycles: {} };
            }

            const cKey = sale.cycleId || sale.historyId || "unknown";
            const cName = sale.cycleName || "Unknown Cycle";

            if (!farmers[fId].cycles[cKey]) {
                farmers[fId].cycles[cKey] = {
                    id: cKey,
                    name: cName,
                    sales: [sale],
                    doc: sale.cycleContext?.doc || Number(sale.cycle?.doc) || 0,
                    age: sale.cycleContext?.age || 0,
                    totalSold: sale.cycleContext?.cumulativeBirdsSold || sale.birdsSold || 0,
                    isEnded: !!sale.historyId
                };
            } else {
                farmers[fId].cycles[cKey].sales.push(sale);
                farmers[fId].cycles[cKey].totalSold = Math.max(
                    farmers[fId].cycles[cKey].totalSold,
                    sale.cycleContext?.cumulativeBirdsSold || 0
                );
            }
        });

        return Object.values(farmers).sort((a, b) => a.name.localeCompare(b.name));
    }, [recentSales]);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Sales" />

            <View className="p-4 pb-2">
                <View className="relative">
                    <View className="absolute z-10 left-3 top-1/2 -translate-y-1/2 bottom-0 justify-center">
                        <Icon as={Search} size={18} className="text-muted-foreground" />
                    </View>
                    <Input
                        placeholder="Search by farmer or location..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="pl-10 h-12 bg-card/60 border-border/30 rounded-xl"
                    />
                </View>
            </View>

            {salesLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground">Loading sales data...</Text>
                </View>
            ) : salesError ? (
                <View className="flex-1 items-center justify-center p-8">
                    <Icon as={FileText} size={48} className="text-destructive mb-4" />
                    <Text className="text-destructive font-bold text-lg text-center mb-2">Failed to load sales</Text>
                    <Text className="text-muted-foreground text-center">{salesError.message}</Text>
                </View>
            ) : (
                <ScrollView contentContainerClassName="p-4 pb-20 gap-4" className="flex-1">
                    {groupedData.length > 0 ? (
                        groupedData.map((farmerGroup) => (
                            <FarmerSalesAccordion
                                key={farmerGroup.id}
                                farmer={farmerGroup}
                                onRefresh={refetch}
                            />
                        ))
                    ) : (
                        <View className="flex-1 items-center justify-center py-20 opacity-50">
                            <Icon as={FileText} size={48} className="text-muted-foreground mb-4" />
                            <Text className="text-muted-foreground font-medium">No sales found.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

function FarmerSalesAccordion({ farmer, onRefresh }: { farmer: any, onRefresh: () => void }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);
    const cycleList = Object.values(farmer.cycles);

    return (
        <Card className="bg-card border-border/40 rounded-lg overflow-hidden">
            <Pressable
                className="p-3 flex-row items-center justify-between active:bg-muted/30 border-b border-border/10"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 rounded-full bg-muted items-center justify-center">
                        <Icon as={User} size={20} className="text-foreground/70" />
                    </View>
                    <View>
                        <Pressable
                            className="active:opacity-70"
                            onPress={() => router.push({ pathname: "/farmer/[id]", params: { id: farmer.id } } as any)}
                        >
                            <Text className="text-sm font-bold text-foreground uppercase tracking-tight active:text-primary">{farmer.name}</Text>
                        </Pressable>
                        <Text className="text-xs text-muted-foreground font-medium">{cycleList.length} Cycles</Text>
                    </View>
                </View>
                <Icon as={isOpen ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
            </Pressable>

            {isOpen && (
                <View className="pb-1">
                    {cycleList.map((cycle: any, index: number) => (
                        <CycleRowAccordion
                            key={cycle.id}
                            cycle={cycle}
                            isLast={index === cycleList.length - 1}
                            onRefresh={onRefresh}
                        />
                    ))}
                </View>
            )}
        </Card>
    );
}

function CycleRowAccordion({ cycle, isLast, onRefresh }: { cycle: any, isLast: boolean, onRefresh: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const trpcContext = trpc.useUtils();

    const deleteMutation = trpc.officer.sales.delete.useMutation({
        onSuccess: () => {
            onRefresh();
            trpcContext.officer.cycles.listActive.invalidate();
            trpcContext.officer.farmers.listWithStock.invalidate();
        },
        onError: (err) => {
            Alert.alert("Error", err.message || "Failed to delete sales record.");
        }
    });

    const handleDeleteClick = (firstSaleId: string, historyId?: string) => {
        Alert.alert(
            "Delete Sales",
            "This will delete ALL sales records for this cycle and revert stats. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteMutation.mutate({
                            saleEventId: firstSaleId,
                            historyId: historyId
                        });
                    }
                }
            ]
        );
    };

    return (
        <View className={`${!isLast ? 'border-b border-border/10' : ''}`}>
            <Pressable
                className="py-3 px-3 flex-row items-center justify-between active:bg-muted/10 transition-colors"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-1.5 flex-[1.5]">
                    <Icon as={cycle.isEnded ? CheckCircle2 : RefreshCw} size={14} className={cycle.isEnded ? "text-emerald-500" : "text-amber-500"} />
                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                        {cycle.sales.length} {cycle.sales.length === 1 ? 'SALE' : 'SALES'}
                    </Text>
                </View>

                <View className="flex-1 items-center">
                    <Text className="text-xs font-black text-foreground">{cycle.age}d</Text>
                </View>

                <View className="flex-[1.5] items-center">
                    <Text className="text-xs font-black text-foreground">{cycle.doc.toLocaleString()}</Text>
                </View>

                <View className="flex-[1.5] items-center">
                    <Text className="text-xs font-black text-emerald-500">{cycle.totalSold.toLocaleString()}</Text>
                </View>

                <View className="flex-row items-center flex-1 justify-end gap-2">
                    <Pressable
                        className="p-1 active:bg-destructive/10 rounded-full"
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(cycle.sales[0].id, cycle.sales[0].historyId);
                        }}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? (
                            <ActivityIndicator size="small" color="hsl(var(--destructive))" />
                        ) : (
                            <Icon as={Trash2} size={14} className="text-destructive/80" />
                        )}
                    </Pressable>
                    <Icon as={isOpen ? ChevronUp : ChevronDown} size={16} className="text-muted-foreground/70" />
                </View>
            </Pressable>

            {isOpen && (
                <View className="bg-muted/10 px-2 pt-3 pb-1 border-t border-border/10">
                    {cycle.sales.sort((a: any, b: any) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).map((event: any, sIdx: number) => (
                        <SaleEventCard
                            key={event.id}
                            sale={event}
                            isLatest={sIdx === 0}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
