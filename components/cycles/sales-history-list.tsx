import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { FileText } from "lucide-react-native";
import { View } from "react-native";
import { SaleEventCard } from "./sale-event-card";

interface SalesHistoryListProps {
    cycleId?: string;
    historyId?: string;
}

export function SalesHistoryList({ cycleId, historyId }: SalesHistoryListProps) {
    const { data: sales, isLoading, error } = trpc.officer.sales.getSaleEvents.useQuery(
        { cycleId, historyId },
        { enabled: !!cycleId || !!historyId }
    );

    if (isLoading) {
        return (
            <View className="py-8 items-center justify-center">
                <BirdyLoader size={48} />
                <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Fetching Sales</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="py-8 items-center justify-center">
                <Text className="text-destructive font-bold">Failed to load sales</Text>
                <Text className="text-muted-foreground">{error.message}</Text>
            </View>
        );
    }

    if (!sales || sales.length === 0) {
        return (
            <View className="py-8 items-center justify-center p-6 bg-muted/30 rounded-xl border border-border/50 border-dashed">
                <View className="w-12 h-12 rounded-full bg-muted items-center justify-center mb-3">
                    <Icon as={FileText} size={24} className="text-muted-foreground/50" />
                </View>
                <Text className="text-muted-foreground font-medium text-center">No sales recorded yet</Text>
            </View>
        );
    }

    // Sort by sale date descending, ensure valid dates
    const validSales = sales.filter((s: any) => s && s.saleDate);

    // Fall back to id or a stable sort if dates are equal to ensure the first element is the 'latest' visually
    const sortedSales = validSales.sort((a: any, b: any) => {
        const dateScoreA = new Date(a.saleDate).getTime() || 0;
        const dateScoreB = new Date(b.saleDate).getTime() || 0;
        if (dateScoreB !== dateScoreA) return dateScoreB - dateScoreA;
        return (b.id || "").localeCompare(a.id || "");
    });

    // Mark the absolute first item in the sorted array as 'latest' primarily to allow 'adjusting' the most recent sale
    // (In reality, backend `isLatestInCycle` flag might exist, but we enforce it visually here too)
    const latestSaleId = sortedSales.length > 0 ? sortedSales[0].id : null;

    return (
        <View className="gap-2">
            {sortedSales.map((sale: any) => (
                <SaleEventCard
                    key={sale.id}
                    sale={sale}
                    isLatest={sale.isLatestInCycle || sale.id === latestSaleId}
                />
            ))}
        </View>
    );
}
