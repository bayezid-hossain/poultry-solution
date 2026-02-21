import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, Search, Trash2, User } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";

export default function SalesScreen() {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const isManagement = membership?.activeMode === "MANAGEMENT";
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch farmers First
    const { data: farmers, isLoading: farmersLoading, refetch } = trpc.officer.farmers.listWithStock.useQuery(
        { orgId: membership?.orgId ?? "", pageSize: 100 },
        { enabled: !!membership?.orgId }
    );

    const filteredFarmers = useMemo(() => {
        if (!farmers?.items) return [];
        if (!searchQuery) return farmers.items;
        const lowerSearch = searchQuery.toLowerCase();
        return farmers.items.filter((f: any) =>
            f.name.toLowerCase().includes(lowerSearch) ||
            (f.location && f.location.toLowerCase().includes(lowerSearch))
        );
    }, [farmers?.items, searchQuery]);

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader title="Sales" />

            <View className="p-4 pb-2">
                {/* Search Bar */}
                <View className="relative">
                    <View className="absolute z-10 left-3 top-0 bottom-0 justify-center">
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

            {farmersLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="hsl(var(--primary))" />
                    <Text className="mt-4 text-muted-foreground">Loading farmers...</Text>
                </View>
            ) : (
                <ScrollView contentContainerClassName="p-4 pb-20 gap-4" className="flex-1">
                    {filteredFarmers.length > 0 ? (
                        filteredFarmers.map((farmer: any) => (
                            <FarmerSalesAccordion
                                key={farmer.id}
                                farmerId={farmer.id}
                                farmerName={farmer.name}
                                onRefresh={refetch}
                            />
                        ))
                    ) : (
                        <View className="flex-1 items-center justify-center py-20 opacity-50">
                            <Icon as={FileText} size={48} className="text-muted-foreground mb-4" />
                            <Text className="text-muted-foreground font-medium">No active farmers found.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

function FarmerSalesAccordion({ farmerId, farmerName, onRefresh }: { farmerId: string, farmerName: string, onRefresh: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const trpcContext = trpc.useUtils();

    const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.officer.sales.getSaleEvents.useQuery(
        { farmerId },
        { enabled: !!farmerId && isOpen } // Only load when opened, to save requests initially, or load all if we prefer?
    );

    const deleteMutation = trpc.officer.sales.delete.useMutation({
        onSuccess: () => {
            refetchEvents();
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

    // Group sales for this farmer by cycle
    const cycleList = useMemo(() => {
        if (!events) return [];
        const groups: Record<string, any> = {};

        events.forEach((sale: any) => {
            const cKey = sale.cycleId || sale.historyId || "unknown";
            const cName = sale.cycleName || "Unknown Cycle";

            if (!groups[cKey]) {
                groups[cKey] = {
                    id: cKey,
                    name: cName,
                    sales: [sale],
                    doc: sale.cycleContext?.doc || 0,
                    age: sale.cycleContext?.age || 0,
                    totalSold: sale.cycleContext?.cumulativeBirdsSold || sale.birdsSold || 0,
                    isEnded: !!sale.historyId
                };
            } else {
                groups[cKey].sales.push(sale);
                groups[cKey].totalSold = Math.max(
                    groups[cKey].totalSold,
                    sale.cycleContext?.cumulativeBirdsSold || 0
                );
            }
        });
        return Object.values(groups);
    }, [events]);

    return (
        <Card className="bg-card border-border/40 rounded-2xl overflow-hidden">
            <Pressable
                className="p-4 flex-row items-center justify-between active:bg-muted/30"
                onPress={() => setIsOpen(!isOpen)}
            >
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 rounded-full bg-muted items-center justify-center">
                        <Icon as={User} size={20} className="text-foreground/70" />
                    </View>
                    <View>
                        <Text className="text-base font-bold text-foreground uppercase tracking-tight">{farmerName}</Text>
                        <Text className="text-xs text-muted-foreground font-medium">Sales Records</Text>
                    </View>
                </View>
                {eventsLoading ? (
                    <ActivityIndicator size="small" color="hsl(var(--muted-foreground))" />
                ) : (
                    <Icon as={isOpen ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                )}
            </Pressable>

            {isOpen && (
                <View className="border-t border-border/20 px-4 pb-2">
                    {cycleList.length === 0 && !eventsLoading ? (
                        <View className="py-4 items-center">
                            <Text className="text-xs text-muted-foreground">No sales recorded for this farmer.</Text>
                        </View>
                    ) : cycleList.map((cycle: any, index: number) => (
                        <View
                            key={cycle.id}
                            className={`py-4 flex-row items-center justify-between ${index !== cycleList.length - 1 ? 'border-b border-border/10' : ''}`}
                        >
                            <View className="flex-row items-center gap-1.5 flex-1 p-1">
                                <Icon as={CheckCircle2} size={14} className="text-emerald-500" />
                                <Text className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                                    {cycle.sales.length} {cycle.sales.length === 1 ? 'Sale' : 'Sales'}
                                </Text>
                            </View>

                            <View className="flex-1 items-center px-1">
                                <Text className="text-xs font-black text-foreground">{cycle.age}d</Text>
                            </View>

                            <View className="flex-1 items-center px-1">
                                <Text className="text-xs font-black text-foreground">{cycle.doc.toLocaleString()}</Text>
                            </View>

                            <View className="flex-1 items-end px-1">
                                <Text className="text-xs font-black text-emerald-500">{cycle.totalSold.toLocaleString()}</Text>
                            </View>

                            <View className="w-8 items-end justify-center pl-2">
                                <Pressable
                                    className="p-1 active:bg-destructive/10 rounded-full"
                                    onPress={() => handleDeleteClick(cycle.sales[0].id, cycle.sales[0].historyId)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <ActivityIndicator size="small" color="hsl(var(--destructive))" />
                                    ) : (
                                        <Icon as={Trash2} size={14} className="text-destructive/80" />
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </Card>
    );
}
