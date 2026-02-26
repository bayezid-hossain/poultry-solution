import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import * as ExpoClipboard from 'expo-clipboard';
import { AlertTriangle, CheckCircle2, Edit2, History, Plus, Sparkles, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { AppModal } from "../ui/app-modal";
import { ConfirmModal } from "./confirm-modal";

interface ParsedItem {
    id: string; // Internal ID
    cleanName: string;
    rawName: string;
    doc: number;
    birdType: string | null;
    matchedFarmerId: string | null;
    matchedName: string | null;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    suggestions?: { id: string; name: string }[];
    isDuplicate?: boolean;
    location?: string | null;
    mobile?: string | null;
    startDate?: Date | null;
}

interface BulkImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}

export function BulkImportModal({ open, onOpenChange, orgId, onSuccess }: BulkImportModalProps) {
    const [step, setStep] = useState<"INPUT" | "REVIEW">("INPUT");
    const [inputText, setInputText] = useState("");
    const [orderDate, setOrderDate] = useState<Date | null>(null);
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [loadingRowIds, setLoadingRowIds] = useState<Set<string>>(new Set());
    const [isCreatingAll, setIsCreatingAll] = useState(false);
    const [isUpdatingProfiles, setIsUpdatingProfiles] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<ParsedItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const trpcContext = trpc.useUtils();

    const { data: farmersList } = trpc.officer.farmers.listWithStock.useQuery({
        orgId,
        page: 1,
        pageSize: 1000
    }, { enabled: open });

    const extractMutation = trpc.ai.extractCycleOrders.useMutation();

    const createFarmerMutation = trpc.officer.farmers.create.useMutation({
        onSuccess: (data: any) => {
            trpcContext.officer.farmers.listWithStock.invalidate();
            handleFarmerCreated(data.name, data.id);
        },
        onError: (err: any) => {
            toast.error(`Failed to create farmer: ${err.message}`);
        }
    });

    const createBulkFarmersMutation = trpc.officer.farmers.createBulk.useMutation({
        onSuccess: (data: any) => {
            trpcContext.officer.farmers.listWithStock.invalidate();

            // Update matched rows for all created farmers
            setParsedData(prev => {
                return prev.map(p => {
                    const created = data.find((c: any) => c.name.toUpperCase() === p.cleanName.toUpperCase());
                    if (created && !p.matchedFarmerId) {
                        return {
                            ...p,
                            matchedFarmerId: created.id,
                            matchedName: created.name,
                            confidence: "HIGH"
                        } as ParsedItem;
                    }
                    return p;
                });
            });
            toast.success(`Created ${data.length} farmers`);
        },
        onError: (err: any) => toast.error(`Failed to create farmers: ${err.message}`)
    });

    const bulkAddMutation = trpc.officer.cycles.createBulk.useMutation({
        onSuccess: (data: any) => {
            if (data.created > 0) {
                toast.success(`Successfully started ${data.created} cycles.`);
                onOpenChange(false);
                setStep("INPUT");
                setInputText("");
                setParsedData([]);
                setOrderDate(null);
                onSuccess?.();
            }
            if (data.errors && data.errors.length > 0) {
                toast.error(`Failed to start ${data.errors.length} cycles. Check valid matches.`);
                console.error(data.errors);
            }
        },
        onError: (err: any) => toast.error(`Failed to import: ${err.message}`)
    });

    const updateProfileMutation = trpc.officer.farmers.updateProfile.useMutation();

    const calculateDuplicates = (items: ParsedItem[]): ParsedItem[] => {
        return items.map(item => ({ ...item, isDuplicate: false }));
    };

    const handleFarmerCreated = (name: string, newId: string) => {
        setParsedData(prev => {
            const updatedItems = prev.map(p => {
                if (p.cleanName.toLowerCase() === name.toLowerCase()) {
                    return {
                        ...p,
                        matchedFarmerId: newId,
                        matchedName: name,
                        confidence: "HIGH"
                    } as ParsedItem;
                }
                return p;
            });
            return calculateDuplicates(updatedItems);
        });
    };

    const handleCreateClick = async (item: ParsedItem) => {
        if (!item.cleanName) return;

        setLoadingRowIds(prev => new Set(prev).add(item.id));
        try {
            await createFarmerMutation.mutateAsync({
                name: item.cleanName,
                initialStock: 0,
                orgId: orgId,
                location: item.location,
                mobile: item.mobile
            });
            toast.success(`Farmer "${item.cleanName}" created!`);
        } catch (error) {
            // Error handled by mutation
        } finally {
            setLoadingRowIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
        }
    };

    const handleCreateAllFarmers = async () => {
        const missing = parsedData.filter(p => !p.matchedFarmerId && p.cleanName);
        if (missing.length === 0) return;

        setIsCreatingAll(true);
        try {
            await createBulkFarmersMutation.mutateAsync({
                farmers: missing.map(item => ({
                    name: item.cleanName,
                    initialStock: 0,
                    location: item.location,
                    mobile: item.mobile
                })),
                orgId: orgId
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreatingAll(false);
        }
    };

    const handleSuggestionClick = (rowId: string, suggestion: { id: string, name: string }) => {
        setParsedData(prev => {
            const updatedItems = prev.map(p => {
                if (p.id !== rowId) return p;
                return {
                    ...p,
                    matchedFarmerId: suggestion.id,
                    matchedName: suggestion.name,
                    confidence: "HIGH",
                    suggestions: []
                } as ParsedItem;
            });
            return calculateDuplicates(updatedItems);
        });
    };

    const handleNameEdit = (id: string, newName: string) => {
        setParsedData(prev => prev.map(p => p.id === id ? { ...p, cleanName: newName } : p));
    };

    const handleLocationEdit = (id: string, newLocation: string) => {
        setParsedData(prev => prev.map(p => p.id === id ? { ...p, location: newLocation } : p));
    };

    const handleMobileEdit = (id: string, newMobile: string) => {
        setParsedData(prev => prev.map(p => p.id === id ? { ...p, mobile: newMobile } : p));
    };

    const handleDocEdit = (id: string, newDoc: string) => {
        const val = parseInt(newDoc) || 0;
        setParsedData(prev => prev.map(p => p.id === id ? { ...p, doc: val } : p));
    };

    const handleExtract = async () => {
        if (!inputText.trim()) {
            toast.error("Please paste your orders text first.");
            return;
        }

        setIsExtracting(true);
        try {
            const result = await extractMutation.mutateAsync({
                text: inputText,
                orgId: orgId
            });

            if (result.orderDate) {
                setOrderDate(new Date(result.orderDate));
            } else {
                setOrderDate(new Date());
            }

            const rows: ParsedItem[] = (result.items as any[]).map((item: any, index: number) => {
                return {
                    id: `row-${index}`,
                    cleanName: item.name,
                    rawName: item.name,
                    doc: item.doc,
                    birdType: item.birdType,
                    matchedFarmerId: item.matchedId,
                    matchedName: item.matchedName,
                    confidence: item.confidence,
                    suggestions: item.suggestions || [],
                    isDuplicate: false,
                    location: item.location,
                    mobile: item.mobile,
                    startDate: result.orderDate ? new Date(result.orderDate) : new Date()
                };
            });

            if (rows.length === 0) {
                toast.warning("No cycle data found in the text.");
                setIsExtracting(false);
                return;
            }

            setParsedData(calculateDuplicates(rows));
            setStep("REVIEW");
        } catch (err: any) {
            console.error(err);
            toast.error("Extraction failed.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRemove = (id: string) => {
        setParsedData(prev => calculateDuplicates(prev.filter(p => p.id !== id)));
    };

    const performImport = async () => {
        const validItems = parsedData.filter(p => p.matchedFarmerId && p.doc > 0);

        if (validItems.length === 0) {
            toast.error("No valid matches found to import.");
            return;
        }

        if (!orderDate) {
            toast.error("Order date is missing.");
            return;
        }

        try {
            await bulkAddMutation.mutateAsync({
                orgId: orgId,
                cycles: validItems.map(item => ({
                    farmerId: item.matchedFarmerId!,
                    doc: item.doc,
                    birdType: item.birdType || "BROILER",
                    startDate: item.startDate || orderDate
                }))
            });
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleSubmit = async () => {
        const validItems = parsedData.filter(p => p.matchedFarmerId && p.doc > 0);

        if (validItems.length === 0) {
            toast.error("No valid matches found to import.");
            return;
        }

        if (orderDate) {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const fortyDaysAgo = new Date();
            fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
            fortyDaysAgo.setHours(0, 0, 0, 0);

            if (orderDate < fortyDaysAgo) {
                toast.error("Dates older than 40 days are not allowed");
                return;
            }
        }

        const updatesNeeded = validItems.filter(item => {
            const currentFarmer = farmersList?.items.find((f: any) => f.id === item.matchedFarmerId);
            if (!currentFarmer) return false;

            const locationChanged = item.location && item.location !== currentFarmer.location;
            const mobileChanged = item.mobile && item.mobile !== currentFarmer.mobile;

            return locationChanged || mobileChanged;
        });

        if (updatesNeeded.length > 0) {
            setPendingUpdates(updatesNeeded);
            setShowConfirmModal(true);
            return;
        }

        performImport();
    };

    const handleConfirmUpdate = async (update: boolean) => {
        setShowConfirmModal(false);

        if (update) {
            setIsUpdatingProfiles(true);
            try {
                toast.info("Updating profiles...");
                await Promise.all(pendingUpdates.map(item =>
                    updateProfileMutation.mutateAsync({
                        id: item.matchedFarmerId!,
                        orgId: orgId,
                        name: item.matchedName || item.cleanName,
                        location: item.location || undefined,
                        mobile: item.mobile || undefined
                    })
                ));
                toast.success("Profiles updated.");
                performImport();
            } catch (error) {
                toast.error("Failed to update some profiles, but proceeding with import.");
                performImport();
            } finally {
                setIsUpdatingProfiles(false);
                setPendingUpdates([]);
            }
        } else {
            performImport();
            setPendingUpdates([]);
        }
    };

    return (
        <AppModal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => onOpenChange(false)}
        >
            <View className="flex-1 bg-black/60">
                <Pressable className="flex-1" onPress={() => onOpenChange(false)} />
                <View className="bg-background w-full h-[90%] rounded-t-[40px] overflow-hidden border-t border-border shadow-2xl">
                    {/* Header */}
                    <View className="p-6 border-b border-border flex-row justify-between items-center bg-card">
                        <View className="flex-row items-center gap-4">
                            <View className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
                                <Icon as={Sparkles} size={22} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-black text-foreground uppercase tracking-tight">Bulk Cycle Import</Text>
                                <View className="flex-row items-center gap-1.5">
                                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Powered Extraction</Text>
                                </View>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted/50 active:scale-90 transition-all"
                        >
                            <Icon as={X} size={20} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    <View className="flex-1">
                        {step === "INPUT" ? (
                            <View className="flex-1 p-6">
                                <View className="flex-1 bg-muted/30 border border-border rounded-3xl p-2 mb-6 shadow-inner relative">
                                    <View className="flex flex-row gap-2 w-full items-end justify-end">
                                        {inputText.length > 0 && (
                                            <Pressable onPress={() => setInputText("")} className="bg-background/80 flex-row items-center gap-1.5 px-3 py-2 rounded-xl border border-border active:opacity-70">
                                                <Icon as={X} size={14} className="text-muted-foreground" />
                                                <Text className="text-xs font-bold text-muted-foreground">Clear</Text>
                                            </Pressable>
                                        )}
                                        <Pressable onPress={async () => { const text = await ExpoClipboard.getStringAsync(); setInputText(text); }} className="bg-background/80 flex-row items-center gap-1.5 px-3 py-2 rounded-xl border border-border active:opacity-70">
                                            <Icon as={History} size={14} className="text-foreground" />
                                            <Text className="text-xs font-bold text-foreground">Paste</Text>
                                        </Pressable>
                                    </View>
                                    <TextInput
                                        multiline
                                        placeholder={`Paste daily reports here...\n\nExample:\nDate: 26 Feb 2026\n\nFarm 01\nHashem Ali\n2000 pcs\nRoss A\nLoc: Gazipur\nPh: 017...`}
                                        className="flex-1 text-foreground text-sm leading-relaxed font-medium pb-12"
                                        style={{ textAlignVertical: 'top' }}
                                        value={inputText}
                                        onChangeText={setInputText}
                                        placeholderTextColor="rgba(128,128,128,0.5)"
                                    />

                                </View>
                                <Button
                                    onPress={handleExtract}
                                    disabled={isExtracting}
                                    className="h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex-row items-center justify-center gap-3 overflow-hidden"
                                >
                                    {isExtracting ? (
                                        <ActivityIndicator color={"#ffffff"} />
                                    ) : (
                                        <>
                                            <Icon as={Sparkles} size={20} className="text-white" />
                                            <Text className="text-white font-black text-base uppercase tracking-widest">Analyze Report</Text>
                                        </>
                                    )}
                                </Button>
                            </View>
                        ) : (
                            <View className="flex-1">
                                <ScrollView className="flex-1 p-5" contentContainerStyle={{ paddingBottom: 40 }}>
                                    <View className="flex-row items-center justify-between mb-6 px-1">
                                        <View>
                                            <Text className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Extraction Result</Text>
                                            {orderDate && (
                                                <View className="flex-row items-center gap-1.5 mt-1">
                                                    <Icon as={History} size={12} className="text-primary" />
                                                    <Text className="text-xs font-bold text-foreground">
                                                        {orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View className="bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                                            <Text className="text-[10px] font-black text-primary uppercase">{parsedData.length} Items</Text>
                                        </View>
                                    </View>

                                    <View className="gap-4">
                                        {parsedData.map((item) => (
                                            <View
                                                key={item.id}
                                                className={`
                                                    relative overflow-hidden rounded-[32px] border
                                                    ${item.matchedFarmerId
                                                        ? 'bg-card border-emerald-500/20'
                                                        : 'bg-amber-500/5 border-amber-500/20'
                                                    }
                                                `}
                                            >
                                                {/* Header / Name */}
                                                <View className="p-5 flex-row justify-between items-start">
                                                    <View className="flex-1">
                                                        {editingId === item.id ? (
                                                            <View className="gap-3 pr-4">
                                                                <TextInput
                                                                    value={item.cleanName}
                                                                    onChangeText={(text) => handleNameEdit(item.id, text)}
                                                                    className="bg-muted text-foreground px-3 py-2 rounded-xl border border-border text-base font-bold"
                                                                    placeholder="Farmer Name"
                                                                    placeholderTextColor="rgba(128,128,128,0.5)"
                                                                    autoFocus
                                                                />
                                                                <View className="flex-row gap-2">
                                                                    <TextInput
                                                                        value={item.location || ""}
                                                                        onChangeText={(text) => handleLocationEdit(item.id, text)}
                                                                        className="flex-1 bg-muted text-foreground px-3 py-2 rounded-xl border border-border text-xs"
                                                                        placeholder="Location"
                                                                        placeholderTextColor="rgba(128,128,128,0.5)"
                                                                    />
                                                                    <TextInput
                                                                        value={item.mobile || ""}
                                                                        onChangeText={(text) => handleMobileEdit(item.id, text)}
                                                                        className="flex-1 bg-muted text-foreground px-3 py-2 rounded-xl border border-border text-xs"
                                                                        placeholder="Mobile"
                                                                        placeholderTextColor="rgba(128,128,128,0.5)"
                                                                        keyboardType="phone-pad"
                                                                    />
                                                                </View>
                                                                <Button size="sm" variant="secondary" className="h-8 rounded-lg" onPress={() => setEditingId(null)}>
                                                                    <Text className="text-[10px] font-black uppercase">Done</Text>
                                                                </Button>
                                                            </View>
                                                        ) : (
                                                            <View>
                                                                <View className="flex-row items-center gap-2 mb-1">
                                                                    <Text className="text-foreground font-black text-lg tracking-tight leading-6">{item.cleanName}</Text>
                                                                    {item.matchedFarmerId && <Icon as={CheckCircle2} size={14} className="text-emerald-500" />}
                                                                    <Pressable onPress={() => setEditingId(item.id)} className="p-1 opacity-40">
                                                                        <Icon as={Edit2} size={12} className="text-foreground" />
                                                                    </Pressable>
                                                                </View>

                                                                {(item.location || item.mobile) && (
                                                                    <View className="gap-0.5 mt-1">
                                                                        {item.location && (
                                                                            <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
                                                                                📍 {item.location}
                                                                            </Text>
                                                                        )}
                                                                        {item.mobile && (
                                                                            <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
                                                                                📞 {item.mobile}
                                                                            </Text>
                                                                        )}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        )}
                                                    </View>

                                                    <Pressable
                                                        onPress={() => handleRemove(item.id)}
                                                        className="h-8 w-8 items-center justify-center rounded-full bg-muted/50"
                                                    >
                                                        <Icon as={Trash2} size={14} className="text-destructive/60" color={"red"} />
                                                    </Pressable>
                                                </View>

                                                {/* Footer / Match Info */}
                                                <View className="px-5 py-4 bg-muted/30 flex-row items-center justify-between border-t border-border">
                                                    <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                                                        {item.matchedFarmerId ? (
                                                            <View className="flex-row items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                                                <Text className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">READY: {item.matchedName}</Text>
                                                            </View>
                                                        ) : (
                                                            <View className="flex-row items-center gap-2">
                                                                <View className="flex-row items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                                                                    <Icon as={AlertTriangle} size={10} className="text-amber-600 dark:text-amber-500" />
                                                                    <Text className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">NO MATCH</Text>
                                                                </View>
                                                                <Pressable
                                                                    onPress={() => handleCreateClick(item)}
                                                                    disabled={loadingRowIds.has(item.id)}
                                                                    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl ${loadingRowIds.has(item.id) ? 'bg-blue-500/20' : 'bg-blue-600 active:scale-95'}`}
                                                                >
                                                                    {loadingRowIds.has(item.id) ? (
                                                                        <ActivityIndicator size={10} color="#fff" />
                                                                    ) : (
                                                                        <Icon as={Plus} size={12} className="text-white" />
                                                                    )}
                                                                    <Text className="text-[9px] font-black text-white uppercase tracking-wider">Create</Text>
                                                                </Pressable>
                                                            </View>
                                                        )}

                                                        {!item.matchedFarmerId && item.suggestions && item.suggestions.length > 0 && (
                                                            <View className="w-full mt-3 pt-3 border-t border-border">
                                                                <Text className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-2">Suggestions</Text>
                                                                <View className="flex-row flex-wrap gap-2">
                                                                    {item.suggestions.map(s => (
                                                                        <Pressable
                                                                            key={s.id}
                                                                            onPress={() => handleSuggestionClick(item.id, s)}
                                                                            className="bg-muted px-3 py-1.5 rounded-lg border border-border active:opacity-70"
                                                                        >
                                                                            <Text className="text-[10px] font-bold text-foreground">{s.name}</Text>
                                                                        </Pressable>
                                                                    ))}
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View className="items-end ml-4">
                                                        <TextInput
                                                            value={String(item.doc)}
                                                            onChangeText={(text) => handleDocEdit(item.id, text)}
                                                            keyboardType="numeric"
                                                            className="text-2xl font-black text-foreground tracking-tight p-0"
                                                        />
                                                        <Text className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em] -mt-1">{item.birdType || 'Birds'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>

                                {/* Review Actions */}
                                <View className="p-6 border-t border-border bg-card">
                                    <View className="flex-row gap-3">
                                        <Button
                                            variant="outline"
                                            onPress={() => setStep("INPUT")}
                                            className="w-14 h-16 rounded-2xl"
                                        >
                                            <Icon as={X} size={20} className="text-foreground" />
                                        </Button>

                                        {parsedData.some(p => !p.matchedFarmerId) && (
                                            <Button
                                                onPress={handleCreateAllFarmers}
                                                disabled={isCreatingAll}
                                                className="flex-1 h-16 rounded-2xl bg-secondary border border-border flex-row gap-2"
                                            >
                                                {isCreatingAll ? (
                                                    <ActivityIndicator color={"#fff"} />
                                                ) : (
                                                    <>
                                                        <Icon as={Plus} size={18} className="text-primary" />
                                                        <Text className="text-primary font-black text-xs uppercase tracking-widest">Create All</Text>
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        <Button
                                            onPress={handleSubmit}
                                            disabled={bulkAddMutation.isPending || isUpdatingProfiles || parsedData.filter(p => p.matchedFarmerId).length === 0}
                                            className="flex-[2] h-16 rounded-2xl bg-primary shadow-lg shadow-primary/20"
                                        >
                                            {bulkAddMutation.isPending || isUpdatingProfiles ? (
                                                <ActivityIndicator color={"#ffffff"} />
                                            ) : (
                                                <Text className="text-white font-black text-base uppercase tracking-widest">
                                                    Start {parsedData.filter(p => p.matchedFarmerId).length} Cycles
                                                </Text>
                                            )}
                                        </Button>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <ConfirmModal
                visible={showConfirmModal}
                title="Update Profiles?"
                description={`This import includes new location/mobile info for ${pendingUpdates.length} farmer(s). Sync profiles or import only?`}
                confirmText="Update & Import"
                cancelText="Import Only"
                onConfirm={() => handleConfirmUpdate(true)}
                onCancel={() => handleConfirmUpdate(false)}
            />
        </AppModal>
    );
}
