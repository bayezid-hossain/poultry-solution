/// <reference types="nativewind/types" />
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Search, Sparkles, Trash2, Truck, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";

interface ParsedItem {
    id: string;
    rawName: string;
    cleanName: string;
    amount: number;
    matchedFarmerId: string | null;
    matchedName: string | null;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    isDuplicate?: boolean;
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
    const [driverName, setDriverName] = useState("");
    const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);

    const { data: farmersList } = trpc.officer.farmers.listWithStock.useQuery({
        orgId,
        page: 1,
        pageSize: 1000
    }, { enabled: open });

    const extractMutation = trpc.ai.extractFarmers.useMutation();
    const bulkAddMutation = trpc.officer.stock.bulkAddStock.useMutation({
        onSuccess: (data: any) => {
            toast.success(`Successfully added stock to ${data.count} farmers.`);
            onOpenChange(false);
            setStep("INPUT");
            setInputText("");
            setDriverName("");
            setParsedData([]);
            onSuccess?.();
        },
        onError: (err: any) => toast.error(`Failed to import: ${err.message}`)
    });

    const calculateDuplicates = (items: ParsedItem[]): ParsedItem[] => {
        return items.map(item => {
            const count = items.filter(r => {
                if (item.matchedFarmerId && r.matchedFarmerId === item.matchedFarmerId) return true;
                if (!item.matchedFarmerId && !r.matchedFarmerId && r.cleanName.toLowerCase() === item.cleanName.toLowerCase()) return true;
                return false;
            }).length;
            return { ...item, isDuplicate: count > 1 };
        });
    };

    const handleExtract = async () => {
        if (!inputText.trim()) {
            toast.error("Please paste your report text first.");
            return;
        }

        setIsExtracting(true);
        try {
            const candidates = (farmersList?.items || []).map((f: any) => ({ id: f.id, name: f.name }));
            const extractedData = await extractMutation.mutateAsync({
                text: inputText,
                candidates: candidates
            });

            const results: ParsedItem[] = (extractedData as any[]).map((item: any, index: number) => {
                const nameCandidate = item.name.trim();
                const totalAmount = item.amount;
                const matchedId = item.matchedId;

                const matchedFarmer = matchedId ? farmersList?.items.find((f: any) => f.id === matchedId) : null;

                let finalMatchedId = null;
                let finalMatchedName = null;

                if (matchedFarmer && matchedFarmer.name.toLowerCase().trim() === nameCandidate.toLowerCase()) {
                    finalMatchedId = matchedFarmer.id;
                    finalMatchedName = matchedFarmer.name;
                }

                return {
                    id: `row-${index}`,
                    rawName: nameCandidate,
                    cleanName: nameCandidate,
                    amount: totalAmount,
                    matchedFarmerId: finalMatchedId,
                    matchedName: finalMatchedName,
                    confidence: finalMatchedId ? "HIGH" : "LOW",
                };
            });

            if (results.length === 0) {
                toast.warning("No farmer data found in the text.");
                setIsExtracting(false);
                return;
            }

            setParsedData(calculateDuplicates(results));
            setStep("REVIEW");
        } catch (err) {
            console.error(err);
            toast.error("Extraction failed.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRemove = (id: string) => {
        setParsedData(prev => calculateDuplicates(prev.filter(p => p.id !== id)));
    };

    const handleSubmit = () => {
        const payload = {
            driverName: driverName.trim() || undefined,
            items: parsedData
                .filter(p => p.matchedFarmerId)
                .map(p => ({
                    farmerId: p.matchedFarmerId!,
                    amount: p.amount,
                    note: `Bulk Import: ${p.matchedName || p.cleanName}`
                }))
        };

        if (payload.items.length === 0) {
            toast.error("No valid matches found to import.");
            return;
        }

        bulkAddMutation.mutate(payload);
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="slide"
            onRequestClose={() => onOpenChange(false)}
        >
            <View className="flex-1 bg-black/60 justify-end">
                <View className="bg-background w-full h-[90%] rounded-t-3xl overflow-hidden border-t border-border/50 shadow-2xl">
                    {/* Header */}
                    <View className="p-6 border-b border-border/50 flex-row justify-between items-center bg-muted/20">
                        <View className="flex-row items-center gap-3">
                            <View className="p-2 bg-primary/10 rounded-lg">
                                <Icon as={Sparkles} size={20} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground font-black uppercase">Bulk Import</Text>
                                <Text className="text-xs text-muted-foreground">AI Powered Extraction</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-10 w-10 items-center justify-center rounded-full bg-muted/50 active:bg-muted"
                        >
                            <Icon as={X} size={20} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    <View className="flex-1">
                        {step === "INPUT" ? (
                            <View className="flex-1 p-6">
                                <View className="flex-1 bg-muted/30 border border-border/50 rounded-2xl p-4 mb-6">
                                    <TextInput
                                        multiline
                                        placeholder={`Example:\nFarm No 1\nFarmer: Rabby Traders\nB2: 15 Bags\n\nFarm No 02\nAbdul Hamid...`}
                                        className="flex-1 text-foreground text-sm leading-relaxed"
                                        style={{ textAlignVertical: 'top' }}
                                        value={inputText}
                                        onChangeText={setInputText}
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                    />
                                </View>
                                <Button
                                    onPress={handleExtract}
                                    disabled={isExtracting}
                                    className="h-16 rounded-2xl bg-primary active:opacity-90 flex-row items-center justify-center gap-3"
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
                                <ScrollView className="flex-1 p-6">
                                    <View className="mb-6">
                                        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">Driver Name</Text>
                                        <View className="flex-row items-center bg-muted/30 border border-border/50 rounded-2xl px-3 h-14">
                                            <Icon as={Truck} size={18} className="text-muted-foreground mr-3" />
                                            <TextInput
                                                placeholder="Driver Name (Optional)"
                                                value={driverName}
                                                onChangeText={setDriverName}
                                                className="flex-1 text-foreground text-sm font-medium"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                            />
                                        </View>
                                    </View>

                                    <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1">Import Items</Text>
                                    <View className="space-y-3 pb-8">
                                        {parsedData.map((item) => (
                                            <View
                                                key={item.id}
                                                className={`p-4 rounded-2xl border ${item.isDuplicate ? 'bg-destructive/5 border-destructive/20' : item.matchedFarmerId ? 'bg-card border-border/50' : 'bg-amber-500/5 border-amber-500/20'}`}
                                            >
                                                <View className="flex-row justify-between items-start mb-3">
                                                    <View className="flex-1">
                                                        <Text className="text-foreground font-bold text-base">{item.cleanName}</Text>
                                                        <Text className="text-[10px] text-muted-foreground italic">Raw: "{item.rawName}"</Text>
                                                    </View>
                                                    <Pressable onPress={() => handleRemove(item.id)}>
                                                        <Icon as={Trash2} size={16} className="text-destructive/50" />
                                                    </Pressable>
                                                </View>

                                                <View className="flex-row items-center justify-between border-t border-border/20 pt-3">
                                                    <View className="flex-row items-center gap-2">
                                                        {item.matchedFarmerId ? (
                                                            <View className="flex-row items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-md">
                                                                <Icon as={CheckCircle2} size={12} className="text-primary" />
                                                                <Text className="text-[10px] font-bold text-primary uppercase">{item.matchedName}</Text>
                                                            </View>
                                                        ) : (
                                                            <View className="flex-row items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-md">
                                                                <Icon as={Search} size={12} className="text-amber-600" />
                                                                <Text className="text-[10px] font-bold text-amber-600 uppercase">No Match</Text>
                                                            </View>
                                                        )}
                                                        {item.isDuplicate && (
                                                            <View className="bg-destructive/10 px-2 py-1 rounded-md">
                                                                <Text className="text-[10px] font-bold text-destructive uppercase">Duplicate</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <View className="flex-row items-baseline gap-1">
                                                        <Text className="text-lg font-black text-foreground">+{item.amount}</Text>
                                                        <Text className="text-[10px] text-muted-foreground">bags</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                                <View className="p-6 border-t border-border/50 bg-muted/20">
                                    <View className="flex-row gap-3">
                                        <Button
                                            variant="secondary"
                                            onPress={() => setStep("INPUT")}
                                            className="flex-1 h-16 rounded-2xl bg-muted/50"
                                        >
                                            <Text className="font-bold uppercase text-foreground">Back</Text>
                                        </Button>
                                        <Button
                                            onPress={handleSubmit}
                                            disabled={bulkAddMutation.isPending || parsedData.filter(p => p.matchedFarmerId).length === 0}
                                            className="flex-[2] h-16 rounded-2xl bg-primary"
                                        >
                                            {bulkAddMutation.isPending ? (
                                                <ActivityIndicator color={"#ffffff"} />
                                            ) : (
                                                <Text className="text-white font-black text-base uppercase tracking-widest">
                                                    Import {parsedData.filter(p => p.matchedFarmerId).length} Items
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
        </Modal>
    );
}
