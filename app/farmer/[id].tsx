/// <reference types="nativewind/types" />
import { CycleCard } from "@/components/cycles/cycle-card";
import { DeleteFarmerModal } from "@/components/farmers/delete-farmer-modal";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { SecurityMoneyModal } from "@/components/farmers/security-money-modal";
import { StartCycleModal } from "@/components/farmers/start-cycle-modal";
import { StockCorrectionModal } from "@/components/farmers/stock-correction-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, ArrowLeft, Bird, ChevronRight, Landmark, List, MapPin, Pencil, Plus, Trash2, Wheat } from "lucide-react-native";
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

    const { data: farmer, isLoading, refetch } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id }
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

    return (
        <View className="flex-1 bg-background">
            <ScreenHeader
                title={farmer.name}
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
                {/* Farmer Info Card */}
                <Card className="mb-6 border-border/50 bg-card overflow-hidden">
                    <CardContent className="p-6">
                        <View className="flex-row justify-between items-start mb-6">
                            <View className="flex-1">
                                <Text className="text-2xl font-bold text-foreground">{farmer.name}</Text>
                                <View className="flex-row items-center gap-2 mt-1">
                                    <Icon as={MapPin} size={14} className="text-muted-foreground" />
                                    <Text className="text-sm text-muted-foreground">{farmer.location || "No location"}</Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={() => setIsEditOpen(true)}
                                className="h-10 w-10 rounded-full bg-muted items-center justify-center"
                            >
                                <Icon as={Pencil} size={18} className="text-muted-foreground" />
                            </Pressable>
                        </View>

                        <View className="flex-row gap-4 mb-4">
                            <View className="flex-1 h-14 bg-muted/30 rounded-2xl items-center justify-center border border-border/50">
                                <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Stock</Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-lg font-bold text-primary">{Number(farmer.mainStock ?? 0).toFixed(1)}</Text>
                                    <Text className="text-[10px] text-muted-foreground">bags</Text>
                                </View>
                            </View>
                            <View className="flex-1 h-14 bg-muted/30 rounded-2xl items-center justify-center border border-border/50">
                                <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Consumption</Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-lg font-bold text-emerald-500">{Number(farmer.totalConsumed ?? 0).toFixed(1)}</Text>
                                    <Text className="text-[10px] text-muted-foreground">bags</Text>
                                </View>
                            </View>
                            <View className="flex-1 h-14 bg-muted/30 rounded-2xl items-center justify-center border border-border/50">
                                <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Security</Text>
                                <View className="flex-row items-baseline gap-1">
                                    <Text className="text-lg font-bold text-blue-500">{Number(farmer.securityMoney ?? 0).toLocaleString()}</Text>
                                    <Text className="text-[10px] text-muted-foreground">৳</Text>
                                </View>
                            </View>
                        </View>

                        <Button
                            variant="ghost"
                            className="h-10 border border-border/10 bg-muted/20 rounded-xl flex-row items-center justify-center gap-2"
                            onPress={() => router.push(`/farmer/${farmer.id}/ledger` as any)}
                        >
                            <Icon as={List} size={20} className="text-muted-foreground" />
                            <Text className="text-xs font-bold text-muted-foreground uppercase">View History Ledger</Text>
                            <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Primary Actions Row */}
                <View className="flex-row gap-3 mb-3">
                    <Button
                        className="flex-1 h-14 bg-primary rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
                        onPress={() => setIsRestockOpen(true)}
                    >
                        <Icon as={Wheat} size={20} className="text-primary-foreground" />
                        <Text className="text-primary-foreground font-bold">Restock</Text>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-2 border-primary/20 bg-primary/5"
                        onPress={() => setIsStartCycleOpen(true)}
                    >
                        <Icon as={Plus} size={20} className="text-primary" />
                        <Text className="text-primary font-bold">Start Cycle</Text>
                    </Button>
                </View>

                {/* Secondary Actions */}
                <View className="flex-row gap-3 mb-8">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2 border-orange-500/20 bg-orange-500/5"
                        onPress={() => setIsCorrectionOpen(true)}
                    >
                        <Icon as={AlertCircle} size={16} className="text-orange-500" />
                        <Text className="text-orange-500 text-xs font-bold">Correction</Text>
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl flex-row items-center justify-center gap-2 border-blue-500/20 bg-blue-500/5"
                        onPress={() => setIsSecurityOpen(true)}
                    >
                        <Icon as={Landmark} size={16} className="text-blue-500" />
                        <Text className="text-blue-500 text-xs font-bold">Security</Text>
                    </Button>
                </View>

                {/* Active Cycles Header */}
                <View className="flex-row items-center justify-between mb-4 px-1">
                    <View className="flex-row items-center gap-2">
                        <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                            <Icon as={List} size={16} className="text-primary" />
                        </View>
                        <Text className="text-xl font-bold text-foreground">Active Batches</Text>
                    </View>
                    <Badge variant="outline" className="border-primary/30 h-7 px-3">
                        <Text className="text-[10px] text-primary font-bold uppercase">{activeCycles.length} Total</Text>
                    </Badge>
                </View>

                {/* Active Cycles List */}
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
                    <Card className="border-dashed border-border/50 bg-muted/10 h-40">
                        <CardContent className="flex-1 items-center justify-center gap-2">
                            <Icon as={Bird} size={40} className="text-muted-foreground/20" />
                            <Text className="text-muted-foreground text-sm font-medium">No active cycles for this farmer</Text>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onPress={() => setIsStartCycleOpen(true)}
                            >
                                <Text className="text-primary font-bold">Launch First Batch</Text>
                            </Button>
                        </CardContent>
                    </Card>
                )}

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
