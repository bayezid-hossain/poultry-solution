import { AddMortalityModal } from "@/components/cycles/add-mortality-modal";
import { AnalysisContent } from "@/components/cycles/analysis-content";
import { CorrectAgeModal } from "@/components/cycles/correct-age-modal";
import { CorrectDocModal } from "@/components/cycles/correct-doc-modal";
import { CorrectMortalityModal } from "@/components/cycles/correct-mortality-modal";
import { DeleteCycleModal } from "@/components/cycles/delete-cycle-modal";
import { EndCycleModal } from "@/components/cycles/end-cycle-modal";
import { LogsTimeline } from "@/components/cycles/logs-timeline";
import { ReopenCycleModal } from "@/components/cycles/reopen-cycle-modal";
import { SalesHistoryList } from "@/components/cycles/sales-history-list";
import { SellModal } from "@/components/cycles/sell-modal";
import { ProAccessModal } from "@/components/pro-access-modal";
import { ProBlocker } from "@/components/pro-blocker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { Activity, Archive, ArrowLeft, Bird, ChevronDown, ChevronUp, LineChart, MoreHorizontal, Package, Pencil, Power, RotateCcw, ShoppingCart, Skull, Trash2, Wheat } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";

export default function CycleDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
    const [isEndCycleOpen, setIsEndCycleOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [isMortalityCorrectionOpen, setIsMortalityCorrectionOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Accordions
    const [openSection, setOpenSection] = useState<'activity' | 'sales' | 'other' | 'insights' | null>(null);
    const [renderSection, setRenderSection] = useState<'activity' | 'sales' | 'other' | 'insights' | null>(null);
    const [proModal, setProModal] = useState<{ open: boolean, feature: string }>({ open: false, feature: "" });

    const { data: membership } = trpc.auth.getMyMembership.useQuery();

    useEffect(() => {
        if (openSection) {
            const timer = setTimeout(() => {
                setRenderSection(openSection);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setRenderSection(null);
        }
    }, [openSection]);

    // Action Menu
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { data: response, isLoading, error, refetch } = trpc.officer.cycles.getDetails.useQuery({ id: id as string });

    if (isLoading) {
        return (
            <View className="flex-1 bg-background items-center justify-center">
                <BirdyLoader size={48} color={"#10b981"} />
                <Text className="mt-4 text-muted-foreground font-medium uppercase tracking-widest text-xs">Fetching Details...</Text>
            </View>
        );
    }

    if (error || !response) {
        return (
            <View className="flex-1 bg-background items-center justify-center p-6">
                <Text className="text-destructive font-bold text-lg mb-2">Error</Text>
                <Text className="text-muted-foreground text-center mb-6">
                    {error?.message || "Failed to load cycle details"}
                </Text>
                <Button onPress={() => router.back()}>
                    <Text className="text-primary-foreground font-bold">Go Back</Text>
                </Button>
            </View>
        );
    }

    const { data: cycle, farmerContext: farmer, logs } = response;

    // Status setup check - ensure we correctly map historical tags
    const isArchived = response.type === 'history';

    const docValue = cycle.doc ?? 0;
    const mortalityValue = cycle.mortality ?? 0;
    const soldValue = cycle.birdsSold ?? 0;
    const liveBirds = Math.max(0, docValue - mortalityValue - soldValue);

    const survivalRate = docValue > 0 ? (((docValue - mortalityValue) / docValue) * 100).toFixed(2) : "0.00";

    const feedIntake = Number(cycle.intake ?? 0).toFixed(2);
    const startDateFormatted = cycle.createdAt ? format(new Date(cycle.createdAt), "dd MMM yyyy") : "";

    const toggleSection = (section: 'activity' | 'sales' | 'other' | 'insights') => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <View className="flex-1 bg-background">
            <ScrollView contentContainerClassName="p-4 pt-12 pb-20 gap-4">

                {/* 1. Header Card */}
                <Card className="bg-card/70 border-border/20 rounded-[20px] p-5 shadow-sm">
                    <View className="flex-row items-start gap-4 mb-3">
                        <Pressable onPress={() => router.back()} className="mt-1">
                            <Icon as={ArrowLeft} size={20} className="text-foreground" />
                        </Pressable>
                        <Pressable className="flex-1" onPress={() => router.push(`/farmer/${farmer.id}` as any)}>
                            <Text className="text-xl font-bold text-foreground uppercase tracking-tight leading-tight">
                                {farmer.name}
                            </Text>
                        </Pressable>
                    </View>

                    <View className="ml-9 flex-row items-center gap-2 mb-6">
                        {isArchived ? (
                            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10">
                                <Icon as={Archive} size={12} className="text-amber-500" />
                                <Text className="text-xs font-bold text-amber-500">History Cycle</Text>
                            </View>
                        ) : (
                            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                                <Icon as={Activity} size={12} className="text-emerald-500" />
                                <Text className="text-xs font-bold text-emerald-500">Active Cycle</Text>
                            </View>
                        )}

                        {cycle.birdType && (
                            <View className="px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/10">
                                <Text className="text-xs font-bold text-amber-600 uppercase tracking-wider">{cycle.birdType}</Text>
                            </View>
                        )}
                    </View>

                    <View className="ml-9 flex-row justify-between items-end">
                        <View className="bg-background/50 rounded-lg p-2.5 px-3">
                            <Text className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 tracking-wider">Started</Text>
                            <Text className="font-bold text-foreground">{startDateFormatted}</Text>
                        </View>

                        <Pressable
                            className="bg-background/50 border border-border/30 h-10 w-12 rounded-xl items-center justify-center active:bg-muted/50"
                            onPress={() => setIsMenuOpen(true)}
                        >
                            <Icon as={MoreHorizontal} size={20} className="text-foreground" />
                        </Pressable>
                    </View>
                </Card>

                {/* 2. Cycle Summary */}
                <Card className="bg-card border-border/40 rounded-[20px] overflow-hidden">
                    <View className="p-4 border-b border-border/20">
                        <Text className="text-lg font-bold text-foreground">Cycle Summary</Text>
                    </View>
                    <View className="p-4">
                        <View className="flex-row justify-between items-center py-3 border-b border-border/10">
                            <Text className="text-sm text-muted-foreground font-medium">Cycle Age</Text>
                            <Text className="text-lg font-bold text-foreground">{cycle.age} Days</Text>
                        </View>

                        <View className="flex-row justify-between items-center py-3 border-b border-border/10">
                            <Text className="text-sm text-muted-foreground font-medium">Birds Status</Text>
                            <View className="items-end">
                                <Text className="text-lg font-bold text-foreground">{liveBirds.toLocaleString()}</Text>
                                <Text className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">OF {docValue.toLocaleString()} DOC</Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between items-center py-3 border-b border-border/10">
                            <Text className="text-sm text-muted-foreground font-medium">Birds Sold</Text>
                            <Text className="text-[15px] font-bold text-foreground">{soldValue.toLocaleString()} birds</Text>
                        </View>

                        <View className="flex-row justify-between items-center py-3 border-b border-border/10">
                            <Text className="text-sm text-muted-foreground font-medium">Mortality</Text>
                            <Text className="text-[15px] font-bold text-foreground">{mortalityValue.toLocaleString()} birds</Text>
                        </View>

                        <View className="flex-row justify-between items-center pt-3 pb-1">
                            <Text className="text-sm text-muted-foreground font-medium">Survival Rate</Text>
                            <Text className="text-[15px] font-bold text-emerald-500">{survivalRate}%</Text>
                        </View>
                    </View>
                </Card>

                {/* 3. Consumption */}
                <Card className="bg-[#2A1B0E] border-[#4A2D12] overflow-hidden rounded-[20px]">
                    <View className="p-5 relative">
                        <View className="flex-row items-center gap-2 mb-6">
                            <Icon as={Wheat} size={18} className="text-[#FF9900]" />
                            <Text className="text-sm font-bold text-[#FF9900]">Consumption</Text>
                        </View>

                        <View className="flex-row items-baseline gap-2 mb-2">
                            <Text className="text-4xl font-black text-[#FF9900] tracking-tight">{feedIntake}</Text>
                            <Text className="text-sm text-[#FF9900]/70 font-medium">Bags</Text>
                        </View>

                        <Text className="text-xs text-[#FF9900]/60 font-medium">
                            Total current consumption records found.
                        </Text>
                    </View>
                </Card>

                {/* 4. Accordions */}
                <View className="space-y-3 gap-y-2 mt-2">
                    {/* Activity Logs */}
                    <View className="bg-card w-full border border-border/30 rounded-[16px] overflow-hidden">
                        <Pressable
                            className="flex-row justify-between items-center p-4 active:bg-muted/30"
                            onPress={() => toggleSection('activity')}
                        >
                            <View className="flex-row items-center gap-3">
                                <Icon as={Archive} size={18} className="text-foreground" />
                                <Text className="font-bold text-lg text-foreground">Activity Logs</Text>
                            </View>
                            <Icon as={openSection === 'activity' ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {openSection === 'activity' && (
                            <View className="p-4 border-t border-border/20">
                                {renderSection === 'activity' ? (
                                    <LogsTimeline logs={logs as any} onRefresh={refetch} />
                                ) : (
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} color="#10b981" />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Activity</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Sales History */}
                    <View className="bg-card w-full border border-border/30 rounded-[16px] overflow-hidden">
                        <Pressable
                            className="flex-row justify-between items-center p-4 active:bg-muted/30"
                            onPress={() => toggleSection('sales')}
                        >
                            <View className="flex-row items-center gap-3">
                                <Icon as={ShoppingCart} size={18} className="text-foreground" />
                                <Text className="font-bold text-lg text-foreground">Sales History</Text>
                            </View>
                            <Icon as={openSection === 'sales' ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {openSection === 'sales' && (
                            <View className="p-4 border-t border-border/20">
                                {renderSection === 'sales' ? (
                                    <SalesHistoryList
                                        cycleId={isArchived ? undefined : (id as string)}
                                        historyId={isArchived ? (id as string) : undefined}
                                    />
                                ) : (
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} color="#10b981" />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Sales</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Other Cycles */}
                    <View className="bg-card w-full border border-border/30 rounded-[16px] overflow-hidden">
                        <Pressable
                            className="flex-row justify-between items-center p-4 active:bg-muted/30"
                            onPress={() => toggleSection('other')}
                        >
                            <View className="flex-row items-center gap-3">
                                <Icon as={Package} size={18} className="text-foreground" />
                                <Text className="font-bold text-lg text-foreground">Other Cycles</Text>
                            </View>
                            <Icon as={openSection === 'other' ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {openSection === 'other' && (
                            <View className="p-4 border-t border-border/20">
                                {renderSection === 'other' ? (
                                    <Text className="text-muted-foreground italic text-center text-sm py-4">No other cycles found to display.</Text>
                                ) : (
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} color="#10b981" />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Cycles</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Analysis Insights */}
                    <View className="bg-card w-full border border-border/30 rounded-[16px] overflow-hidden">
                        <Pressable
                            className="flex-row justify-between items-center p-4 active:bg-muted/30"
                            onPress={() => toggleSection('insights')}
                        >
                            <View className="flex-row items-center gap-3">
                                <Icon as={LineChart} size={18} className="text-foreground" />
                                <Text className="font-bold text-lg text-foreground">Analysis Insights</Text>
                            </View>
                            <Icon as={openSection === 'insights' ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                        </Pressable>
                        {openSection === 'insights' && (
                            <View className="p-4 border-t border-border/20">
                                {renderSection === 'insights' ? (
                                    membership?.isPro ? (
                                        <AnalysisContent cycle={cycle as any} history={(response.history || []).filter((h: any) => h.id !== cycle.id) as any} />
                                    ) : (
                                        <ProBlocker feature="Analysis Insights" description="Automated insights and historical benchmarking are Pro features. Upgrade to gain actionable intelligence." />
                                    )
                                ) : (
                                    <View className="py-20 items-center justify-center">
                                        <BirdyLoader size={48} color="#10b981" />
                                        <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-4 opacity-50">Rendering Insights</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Action Menu Bottom Sheet */}
            <Modal
                transparent={true}
                visible={isMenuOpen}
                animationType="fade"
                onRequestClose={() => setIsMenuOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/60 justify-end"
                    onPress={() => setIsMenuOpen(false)}
                >
                    <Pressable
                        className="bg-card dark:bg-zinc-900 rounded-t-3xl pt-2 pb-8 px-4"
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="w-12 h-1.5 bg-muted rounded-full self-center mb-6" />

                        <Text className="text-lg font-bold text-foreground mb-4 px-2">Cycle Actions</Text>

                        {!isArchived ? (
                            <View className="">
                                <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => {
                                    setIsMenuOpen(false);
                                    if (!membership?.isPro) { setProModal({ open: true, feature: "Sell Birds" }); return; }
                                    setIsSellModalOpen(true);
                                }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={ShoppingCart} size={20} className="text-primary" />
                                    </View>
                                    <Text className="font-medium text-foreground text-base flex-1">Sell Birds</Text>
                                </Pressable>
                                <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsMenuOpen(false); setIsMortalityModalOpen(true); }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Skull} size={20} className="text-foreground" />
                                    </View>
                                    <Text className="font-medium text-foreground text-base flex-1">Add Mortality</Text>
                                </Pressable>
                                <Pressable
                                    className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`}
                                    onPress={() => {
                                        if (soldValue > 0) return;
                                        setIsMenuOpen(false);
                                        if (!membership?.isPro) { setProModal({ open: true, feature: "Edit Initial Birds (DOC)" }); return; }
                                        setIsDocModalOpen(true);
                                    }}
                                >
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Bird} size={20} className={soldValue > 0 ? "text-muted-foreground" : "text-foreground"} />
                                    </View>
                                    <Text className={`font-medium text-base flex-1 ${soldValue > 0 ? 'text-muted-foreground' : 'text-foreground'}`}>Edit Initial Birds (DOC)</Text>
                                </Pressable>
                                <Pressable
                                    className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`}
                                    onPress={() => {
                                        if (soldValue > 0) return;
                                        setIsMenuOpen(false);
                                        if (!membership?.isPro) { setProModal({ open: true, feature: "Edit Age" }); return; }
                                        setIsAgeModalOpen(true);
                                    }}
                                >
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Activity} size={20} className={soldValue > 0 ? "text-muted-foreground" : "text-foreground"} />
                                    </View>
                                    <Text className={`font-medium text-base flex-1 ${soldValue > 0 ? 'text-muted-foreground' : 'text-foreground'}`}>Edit Age</Text>
                                </Pressable>
                                <Pressable
                                    className={`flex-row items-center py-4 border-b border-border/30 active:bg-muted/50 ${soldValue > 0 ? 'opacity-50' : ''}`}
                                    onPress={() => {
                                        if (soldValue > 0) return;
                                        setIsMenuOpen(false);
                                        if (!membership?.isPro) { setProModal({ open: true, feature: "Correct Total Mortality" }); return; }
                                        setIsMortalityCorrectionOpen(true);
                                    }}
                                >
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Pencil} size={20} className={soldValue > 0 ? "text-muted-foreground" : "text-foreground"} />
                                    </View>
                                    <Text className={`font-medium text-base flex-1 ${soldValue > 0 ? 'text-muted-foreground' : 'text-foreground'}`}>Correct Total Mortality</Text>
                                </Pressable>
                                <Pressable className="flex-row items-center py-4 mt-2 active:bg-red-500/10 rounded-xl" onPress={() => { setIsMenuOpen(false); setIsEndCycleOpen(true); }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Power} size={20} className="text-destructive" />
                                    </View>
                                    <Text className="font-bold text-destructive text-base flex-1">End Cycle</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View className="">
                                <Pressable className="flex-row items-center py-4 border-b border-border/30 active:bg-muted/50" onPress={() => { setIsMenuOpen(false); setIsReopenModalOpen(true); }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={RotateCcw} size={20} className="text-foreground" />
                                    </View>
                                    <Text className="font-medium text-foreground text-base flex-1">Reopen Cycle</Text>
                                </Pressable>
                                <Pressable className="flex-row items-center py-4 mt-2 active:bg-red-500/10 rounded-xl" onPress={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}>
                                    <View className="w-8 items-center justify-center mr-3">
                                        <Icon as={Trash2} size={20} className="text-destructive" />
                                    </View>
                                    <Text className="font-bold text-destructive text-base flex-1">Delete Record</Text>
                                </Pressable>
                            </View>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Modals — Only rendered for active cycles */}
            {!isArchived && (
                <>
                    <AddMortalityModal
                        open={isMortalityModalOpen}
                        onOpenChange={setIsMortalityModalOpen}
                        cycleId={cycle.id}
                        startDate={cycle.createdAt ? new Date(cycle.createdAt) : null}
                        farmerName={farmer.name}
                        onSuccess={refetch}
                    />

                    <ReopenCycleModal
                        open={isReopenModalOpen}
                        onOpenChange={setIsReopenModalOpen}
                        historyId={cycle.id}
                        cycleName={farmer.name}
                        onSuccess={() => refetch()}
                    />

                    <DeleteCycleModal
                        open={isDeleteModalOpen}
                        onOpenChange={setIsDeleteModalOpen}
                        historyId={cycle.id}
                        cycleName={farmer.name}
                        onSuccess={() => router.back()}
                    />
                    <EndCycleModal
                        open={isEndCycleOpen}
                        onOpenChange={setIsEndCycleOpen}
                        cycle={{
                            id: cycle.id,
                            name: cycle.name,
                            intake: Number(cycle.intake)
                        }}
                        farmerName={farmer.name}
                        onRecordSale={() => {
                            if (!membership?.isPro) {
                                setProModal({ open: true, feature: "Sell Birds" });
                                return;
                            }
                            setIsSellModalOpen(true);
                        }}
                        onSuccess={() => {
                            refetch();
                        }}
                    />

                    <CorrectDocModal
                        open={isDocModalOpen}
                        onOpenChange={setIsDocModalOpen}
                        cycleId={cycle.id}
                        currentDoc={cycle.doc}
                        onSuccess={refetch}
                    />

                    <CorrectAgeModal
                        open={isAgeModalOpen}
                        onOpenChange={setIsAgeModalOpen}
                        cycleId={cycle.id}
                        currentAge={cycle.age}
                        onSuccess={refetch}
                    />

                    <CorrectMortalityModal
                        open={isMortalityCorrectionOpen}
                        onOpenChange={setIsMortalityCorrectionOpen}
                        cycleId={cycle.id}
                        onSuccess={refetch}
                    />

                    <SellModal
                        open={isSellModalOpen}
                        onOpenChange={setIsSellModalOpen}
                        cycleId={cycle.id}
                        farmerId={farmer.id}
                        cycleName={cycle.name}
                        farmerName={farmer.name}
                        farmerLocation={farmer.location}
                        farmerMobile={farmer.mobile}
                        cycleAge={cycle.age}
                        doc={cycle.doc}
                        mortality={cycle.mortality || 0}
                        birdsSold={cycle.birdsSold || 0}
                        intake={Number(cycle.intake || 0)}
                        startDate={new Date(cycle.startDate)}
                    />
                </>
            )}

            <ProAccessModal
                open={proModal.open}
                onOpenChange={(open) => setProModal(prev => ({ ...prev, open }))}
                feature={proModal.feature}
            />
        </View>
    );
}
