import { CycleCard } from "@/components/cycles/cycle-card";
import { EditFarmerModal } from "@/components/farmers/edit-farmer-modal";
import { RestockModal } from "@/components/farmers/restock-modal";
import { StartCycleModal } from "@/components/farmers/start-cycle-modal";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Bird, List, MapPin, Pencil, Plus, Trash2, Wheat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";

export default function FarmerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isRestockOpen, setIsRestockOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStartCycleOpen, setIsStartCycleOpen] = useState(false);

    const { data: farmer, isLoading, refetch } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: id ?? "" },
        { enabled: !!id }
    );

    const deleteMutation = trpc.officer.farmers.delete.useMutation({
        onSuccess: () => {
            Alert.alert("Success", "Farmer profile deleted successfully");
            router.back();
        },
        onError: (err: any) => {
            Alert.alert("Error", err.message);
        }
    });

    const handleDelete = () => {
        Alert.alert(
            "Delete Farmer",
            "Are you sure you want to delete this farmer? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate({ id: id as string, orgId: farmer?.organizationId as string })
                }
            ]
        );
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
                                    <MapPin size={14} className="text-muted-foreground" />
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

                        <View className="flex-row gap-4">
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
                        </View>
                    </CardContent>
                </Card>

                {/* Primary Actions Row */}
                <View className="flex-row gap-3 mb-8">
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
        </View>
    );
}
