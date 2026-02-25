import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import { Activity, Archive, Bird, ChevronRight, User, Wheat } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, View } from "react-native";

// --- Subcomponents for Accordion behavior ---

const FarmerAccordionItem = ({ farmer }: { farmer: any }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <View className="border border-border/50 rounded-xl overflow-hidden bg-muted/20 mb-3">
            <Pressable
                className="px-4 py-3 flex-row items-center justify-between"
                onPress={() => setIsOpen(!isOpen)}
                android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            >
                <View className="flex-row items-center gap-3 flex-1">
                    <View className="h-8 w-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                        <Icon as={Bird} size={16} color="#10b981" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-foreground text-sm" numberOfLines={1}>{farmer.name}</Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                            <Icon as={Wheat} size={10} color="#9ca3af" />
                            <Text className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                {farmer.mainStock.toFixed(2)} Bags
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row items-center gap-2">
                    {farmer.activeCycles?.length > 0 && (
                        <View className="bg-primary px-1.5 py-0.5 rounded">
                            <Text className="text-primary-foreground font-bold text-[9px] uppercase tracking-widest">
                                {farmer.activeCycles.length} Live
                            </Text>
                        </View>
                    )}
                    <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                        <Icon as={ChevronRight} size={16} color="#9ca3af" />
                    </View>
                </View>
            </Pressable>

            {isOpen && (
                <View className="p-4 bg-card border-t border-border/50">

                    {/* Active Cycles */}
                    <View className="mb-4">
                        <View className="flex-row items-center gap-2 mb-3">
                            <Icon as={Activity} size={14} color="#16a34a" />
                            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Active Cycles
                            </Text>
                        </View>

                        {farmer.activeCycles?.length > 0 ? (
                            <View className="rounded-lg border border-border/50 overflow-hidden">
                                <View className="flex-row bg-muted/50 p-2 border-b border-border/50">
                                    <Text className="flex-1 text-[9px] font-bold uppercase text-muted-foreground">Cycle</Text>
                                    <Text className="w-8 text-[9px] font-bold uppercase text-muted-foreground">Age</Text>
                                    <Text className="w-12 text-[9px] font-bold uppercase text-muted-foreground">DOC</Text>
                                    <Text className="w-14 text-[9px] font-bold uppercase text-muted-foreground text-right">Intake</Text>
                                </View>
                                {farmer.activeCycles.map((cycle: any, index: number) => (
                                    <Pressable
                                        key={cycle.id}
                                        className={`flex-row p-2 items-center ${index !== farmer.activeCycles.length - 1 ? 'border-b border-border/50' : ''}`}
                                        onPress={() => router.push(`/cycles/${cycle.id}` as any)}
                                    >
                                        <Text className="flex-1 text-xs font-bold text-foreground underline" numberOfLines={1}>{cycle.name}</Text>
                                        <Text className="w-8 text-xs text-muted-foreground">{cycle.age}d</Text>
                                        <Text className="w-12 text-xs font-mono">{cycle.doc}</Text>
                                        <Text className="w-14 text-xs font-bold text-primary text-right">{cycle.intake?.toFixed(1) || 0}b</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-xs text-muted-foreground italic ml-2 mt-1 mb-2">No active cycles.</Text>
                        )}
                    </View>

                    {/* Past Cycles */}
                    <View>
                        <View className="flex-row items-center gap-2 mb-3">
                            <Icon as={Archive} size={14} color="#9ca3af" />
                            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Past Cycles
                            </Text>
                        </View>

                        {farmer.pastCycles?.length > 0 ? (
                            <View className="rounded-lg border border-border/50 overflow-hidden">
                                <View className="flex-row bg-muted/50 p-2 border-b border-border/50">
                                    <Text className="flex-1 text-[9px] font-bold uppercase text-muted-foreground">Cycle</Text>
                                    <Text className="w-14 text-[9px] font-bold uppercase text-muted-foreground text-right">Mortality</Text>
                                </View>
                                {farmer.pastCycles.map((cycle: any, index: number) => (
                                    <Pressable
                                        key={cycle.id}
                                        className={`flex-row p-2 items-center ${index !== farmer.pastCycles.length - 1 ? 'border-b border-border/50' : ''}`}
                                        onPress={() => router.push(`/cycles/${cycle.id}` as any)}
                                    >
                                        <Text className="flex-1 text-xs text-foreground/80 underline" numberOfLines={1}>{cycle.cycleName}</Text>
                                        <Text className="w-14 text-xs font-bold text-destructive text-right">{cycle.mortality}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-xs text-muted-foreground italic ml-2 mt-1">No past records.</Text>
                        )}
                    </View>

                </View>
            )}
        </View>
    );
};

const OfficerAccordionItem = ({ officer }: { officer: any }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card className="rounded-[2rem] border border-border/50 bg-card shadow-sm overflow-hidden mb-4">
            <Pressable
                className="px-5 py-4 flex-row items-center justify-between"
                onPress={() => setIsOpen(!isOpen)}
                android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
            >
                <View className="flex-row items-center gap-4 flex-1">
                    <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                        <Icon as={User} size={20} color="#16a34a" />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2 mb-1">
                            <Text className="font-bold text-foreground text-base shrink">{officer.name}</Text>
                            <View className="bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                <Text className="text-primary font-bold text-[9px]">{officer.farmers?.length || 0} Farmers</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                                <Text className="text-[8px] uppercase font-bold tracking-widest text-muted-foreground">{officer.role}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                    <Icon as={ChevronRight} size={20} color="#9ca3af" />
                </View>
            </Pressable>

            {isOpen && (
                <View className="px-5 pb-5 pt-2">
                    <View className="pl-4 border-l-2 border-border/50 space-y-3">
                        {officer.farmers?.length === 0 ? (
                            <Text className="text-sm text-muted-foreground italic py-2 ml-4">No farmers assigned.</Text>
                        ) : (
                            <View className="ml-4 mt-2">
                                {officer.farmers.map((farmer: any) => (
                                    <FarmerAccordionItem key={farmer.id} farmer={farmer} />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            )}
        </Card>
    );
};

// --- Main component ---

export const ManagementProductionTree = ({ orgId }: { orgId: string }) => {
    const { data: tree, isLoading } = trpc.management.officers.getProductionTree.useQuery(
        { orgId },
        { enabled: !!orgId }
    );

    if (isLoading) {
        return (
            <View className="py-8 items-center justify-center">
                <BirdyLoader size={48} color={"#10b981"} />
                <Text className="text-muted-foreground mt-4 text-sm font-bold uppercase tracking-widest">Loading production data...</Text>
            </View>
        );
    }

    if (!tree || tree.length === 0) {
        return (
            <View className="py-8 items-center justify-center border-2 border-border/50 border-dashed rounded-[2rem] bg-muted/30 mt-4 mx-4 p-8">
                <Icon as={Wheat} size={40} color="#9ca3af" className="mb-3 opacity-50" />
                <Text className="text-muted-foreground text-center font-medium">No production data found for this organization.</Text>
            </View>
        );
    }

    return (
        <View className="mt-4">
            {tree.map((officer: any) => (
                <OfficerAccordionItem key={officer.id} officer={officer} />
            ))}
        </View>
    );
};
