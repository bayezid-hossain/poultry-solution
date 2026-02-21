import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { CheckCircle2, ChevronDown, ChevronUp, Edit } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AdjustSaleModal } from "./adjust-sale-modal";

interface SaleEventCardProps {
    sale: any;
    isLatest?: boolean;
}

export function SaleEventCard({ sale, isLatest = false }: SaleEventCardProps) {
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [showAllVersions, setShowAllVersions] = useState(false);

    const hasReports = sale.reports && sale.reports.length > 0;
    const sortedReports = hasReports
        ? [...sale.reports].sort((a: any, b: any) => b.version - a.version)
        : [];

    const activeReport = sale.activeReportId
        ? sortedReports.find((r: any) => r.id === sale.activeReportId) || sortedReports[0]
        : sortedReports[0];

    // Filter to only approved/latest for non-expanded view
    const visibleReports = showAllVersions ? sortedReports : [activeReport].filter(Boolean);

    return (
        <Card className="mb-4 overflow-hidden border-border/50">
            <CardContent className="p-0">
                <View className="px-4 py-3 bg-muted/30 border-b border-border/50 flex-row items-center justify-between">
                    <View>
                        <View className="flex-row items-center gap-2 mb-1">
                            <Text className="font-bold text-base">
                                {format(new Date(sale.saleDate), "dd MMM yyyy")}
                            </Text>
                            {isLatest && (
                                <Badge variant="outline" className="border-emerald-500 bg-emerald-500/10 py-0 h-5 px-1.5">
                                    <Text className="text-emerald-600 text-[10px] font-bold uppercase">Latest</Text>
                                </Badge>
                            )}
                        </View>
                        <Text className="text-xs text-muted-foreground">{sale.location}</Text>
                    </View>

                    {isLatest && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 border-primary/20 bg-primary/5 flex-row gap-1.5"
                            onPress={() => setIsAdjustModalOpen(true)}
                        >
                            <Icon as={Edit} size={14} className="text-primary" />
                            <Text className="text-primary font-bold text-xs">Adjust</Text>
                        </Button>
                    )}
                </View>

                <View className="p-4 gap-3">
                    {visibleReports.map((report: any) => (
                        <View
                            key={report.id}
                            className={`p-3 rounded-lg border ${report.id === activeReport?.id
                                ? 'bg-primary/5 border-primary/20'
                                : 'bg-muted/30 border-border/50'
                                }`}
                        >
                            <View className="flex-row justify-between items-center mb-2">
                                <View className="flex-row items-center gap-2">
                                    <View className={`w-6 h-6 rounded-full items-center justify-center ${report.id === activeReport?.id ? 'bg-primary/20' : 'bg-muted'}`}>
                                        <Text className={`text-xs font-bold ${report.id === activeReport?.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                            v{report.version}
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-muted-foreground">
                                        {format(new Date(report.createdAt), "HH:mm a, d MMM")}
                                    </Text>
                                </View>
                                {report.id === activeReport?.id && (
                                    <View className="flex-row items-center gap-1">
                                        <Icon as={CheckCircle2} size={12} className="text-primary" />
                                        <Text className="text-[10px] font-bold text-primary uppercase">Active Version</Text>
                                    </View>
                                )}
                            </View>

                            <View className="flex-row justify-between pt-2 border-t border-border/30">
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Birds</Text>
                                    <Text className="font-bold">{report.birdsSold}</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Weight</Text>
                                    <Text className="font-bold">{report.totalWeight} kg</Text>
                                </View>
                                <View>
                                    <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Amount</Text>
                                    <Text className="font-bold text-primary">৳{report.totalAmount}</Text>
                                </View>
                            </View>

                            {report.adjustmentNote && (
                                <View className="mt-3 p-2 bg-background border border-border/50 rounded-md">
                                    <Text className="text-[10px] font-bold text-muted-foreground mb-1 uppercase">Reason</Text>
                                    <Text className="text-xs text-foreground italic">{report.adjustmentNote}</Text>
                                </View>
                            )}
                        </View>
                    ))}

                    {sortedReports.length > 1 && (
                        <Pressable
                            onPress={() => setShowAllVersions(!showAllVersions)}
                            className="flex-row items-center justify-center py-2"
                        >
                            <Text className="text-xs text-primary font-bold mr-1">
                                {showAllVersions ? "Hide older versions" : `Show ${sortedReports.length - 1} older version(s)`}
                            </Text>
                            <Icon as={showAllVersions ? ChevronUp : ChevronDown} size={14} className="text-primary" />
                        </Pressable>
                    )}
                </View>

                {isAdjustModalOpen && (
                    <AdjustSaleModal
                        open={isAdjustModalOpen}
                        onOpenChange={setIsAdjustModalOpen}
                        saleEvent={sale}
                        latestReport={activeReport}
                    />
                )}
            </CardContent>
        </Card>
    );
}
