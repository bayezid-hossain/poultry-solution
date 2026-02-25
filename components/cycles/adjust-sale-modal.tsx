import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Banknote, Bird, Box, FileText, Settings, ShoppingCart, Truck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from "react-native";
import { toast, Toaster } from "sonner-native";
import { z } from "zod";
import { SaleDetailsContent } from "./sale-details-content";
import { FarmerInfoHeader, FeedFieldArray, SaleMetricsBar } from "./sale-form-sections";

const ensureB1B2 = (feed: any[]) => {
    if (!feed || !Array.isArray(feed) || feed.length === 0) {
        return [{ type: "B1", bags: 0 }, { type: "B2", bags: 0 }];
    }
    const hasB1 = feed.some(f => (f.type || "").toUpperCase() === "B1");
    const hasB2 = feed.some(f => (f.type || "").toUpperCase() === "B2");
    const result = [...feed];
    if (!hasB1) result.unshift({ type: "B1", bags: 0 });
    if (!hasB2) result.push({ type: "B2", bags: 0 });
    return result;
};

const feedItemSchema = z.object({
    type: z.string().min(1, "Type is required"),
    bags: z.number().min(0, "Amount must be >= 0"),
});

const adjustSaleSchema = z.object({
    birdsSold: z.coerce.number().int().positive("Must be at least 1 bird"),
    totalMortality: z.coerce.number().int().min(0, "Cannot be negative"),
    totalWeight: z.coerce.number().positive("Weight must be positive"),
    pricePerKg: z.coerce.number().positive("Price must be positive"),

    cashReceived: z.coerce.number().min(0, "Cannot be negative"),
    depositReceived: z.coerce.number().min(0, "Cannot be negative"),
    medicineCost: z.coerce.number().min(0, "Cannot be negative"),

    feedConsumed: z.array(feedItemSchema).min(1, "At least one feed entry required"),
    feedStock: z.array(feedItemSchema),

    location: z.string().min(1, "Location is required"),
    party: z.string().optional(),
    farmerMobile: z.string().optional(),
    adjustmentNote: z.string().min(0, "Please provide a more detailed reason for this adjustment"),
    recoveryPrice: z.coerce.number().positive().optional(),
    feedPricePerBag: z.coerce.number().positive().optional(),
    docPricePerBird: z.coerce.number().positive().optional(),
});

type FormValues = z.infer<typeof adjustSaleSchema>;

interface AdjustSaleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleEvent: any;
    latestReport?: any | null;
    onSuccess?: () => void;
}

export const AdjustSaleModal = ({ open, onOpenChange, saleEvent, latestReport, onSuccess }: AdjustSaleModalProps) => {
    const utils = trpc.useUtils();
    const [step, setStep] = useState<"form" | "preview">("form");
    const [previewData, setPreviewData] = useState<any | null>(null);

    const defaultValues: FormValues = {
        birdsSold: latestReport ? latestReport.birdsSold : saleEvent.birdsSold,
        totalMortality: latestReport
            ? (latestReport.totalMortality ?? saleEvent.totalMortality ?? 0)
            : (saleEvent.totalMortality ?? 0),
        totalWeight: parseFloat(latestReport ? latestReport.totalWeight : saleEvent.totalWeight),
        pricePerKg: parseFloat(latestReport ? latestReport.pricePerKg : saleEvent.pricePerKg),

        cashReceived: parseFloat(latestReport?.cashReceived ?? saleEvent.cashReceived ?? "0"),
        depositReceived: parseFloat(latestReport?.depositReceived ?? saleEvent.depositReceived ?? "0"),
        medicineCost: parseFloat(latestReport?.medicineCost ?? saleEvent.medicineCost ?? "0"),

        feedConsumed: ensureB1B2(
            latestReport && latestReport.feedConsumed
                ? (typeof latestReport.feedConsumed === 'string' ? JSON.parse(latestReport.feedConsumed) : latestReport.feedConsumed)
                : (typeof saleEvent.feedConsumed === 'string' ? JSON.parse(saleEvent.feedConsumed) : saleEvent.feedConsumed)
        ),
        feedStock: ensureB1B2(
            latestReport && latestReport.feedStock
                ? (typeof latestReport.feedStock === 'string' ? JSON.parse(latestReport.feedStock) : latestReport.feedStock)
                : (typeof saleEvent.feedStock === 'string' ? JSON.parse(saleEvent.feedStock) : saleEvent.feedStock)
        ),

        location: saleEvent.location || "",
        party: saleEvent.party || "",
        farmerMobile: saleEvent.farmerMobile || "",
        adjustmentNote: "",
        recoveryPrice: typeof saleEvent.cycleContext?.recoveryPrice === 'number' ? saleEvent.cycleContext.recoveryPrice : undefined,
        feedPricePerBag: typeof saleEvent.cycleContext?.feedPriceUsed === 'number' ? saleEvent.cycleContext.feedPriceUsed : undefined,
        docPricePerBird: typeof saleEvent.cycleContext?.docPriceUsed === 'number' ? saleEvent.cycleContext.docPriceUsed : undefined,
    };

    const form = useForm<FormValues>({
        resolver: zodResolver(adjustSaleSchema as any),
        defaultValues,
    });

    const locationRef = useRef<TextInput>(null);
    const partyRef = useRef<TextInput>(null);
    const birdsSoldRef = useRef<TextInput>(null);
    const totalMortalityRef = useRef<TextInput>(null);
    const totalWeightRef = useRef<TextInput>(null);
    const pricePerKgRef = useRef<TextInput>(null);
    const adjustmentNoteRef = useRef<TextInput>(null);
    const recoveryPriceRef = useRef<TextInput>(null);
    const feedPriceRef = useRef<TextInput>(null);
    const docPriceRef = useRef<TextInput>(null);

    const feedConsumedArray = useFieldArray({
        control: form.control,
        name: "feedConsumed",
    });

    const feedStockArray = useFieldArray({
        control: form.control,
        name: "feedStock",
    });

    const wWeight = form.watch("totalWeight");
    const wPrice = form.watch("pricePerKg");
    const wBirdsSold = form.watch("birdsSold");
    const wMortality = form.watch("totalMortality");

    const calculatedTotal = (wWeight || 0) * (wPrice || 0);

    // Sync cash received
    useEffect(() => {
        if (calculatedTotal > 0 && calculatedTotal !== form.getValues("cashReceived")) {
            form.setValue("cashReceived", calculatedTotal, { shouldValidate: true });
        }
    }, [calculatedTotal, form]);

    const handleFeedAdjustment = (index: number, newBags: number) => {
        const currentType = (form.getValues(`feedConsumed.${index}.type`) || "").toUpperCase().trim();
        if (!currentType) return;

        const baselineConsumedRaw = latestReport && latestReport.feedConsumed
            ? (typeof latestReport.feedConsumed === 'string' ? JSON.parse(latestReport.feedConsumed) : latestReport.feedConsumed)
            : (typeof saleEvent.feedConsumed === 'string' ? JSON.parse(saleEvent.feedConsumed) : saleEvent.feedConsumed);

        const baselineStockRaw = latestReport && latestReport.feedStock
            ? (typeof latestReport.feedStock === 'string' ? JSON.parse(latestReport.feedStock) : latestReport.feedStock)
            : (typeof saleEvent.feedStock === 'string' ? JSON.parse(saleEvent.feedStock) : saleEvent.feedStock);

        const baselineConsumed = ensureB1B2(baselineConsumedRaw || []);
        const baselineStock = ensureB1B2(baselineStockRaw || []);

        const baseline = baselineConsumed.find((b: any) => (b.type || "").toUpperCase().trim() === currentType);
        const baselineBags = Number(baseline?.bags || 0);
        const consumedDelta = newBags - baselineBags;

        const currentStock = [...form.getValues("feedStock")];
        const stockIndex = currentStock.findIndex((s: any) => (s.type || "").toUpperCase().trim() === currentType);

        if (stockIndex > -1) {
            const bStock = baselineStock.find((bs: any) => (bs.type || "").toUpperCase().trim() === currentType);
            const baselineStockBags = Number(bStock?.bags || 0);
            const newStockBags = Math.max(0, baselineStockBags - consumedDelta);

            if (Number(currentStock[stockIndex].bags) !== newStockBags) {
                currentStock[stockIndex] = { ...currentStock[stockIndex], bags: newStockBags };
                form.setValue("feedStock", currentStock, { shouldValidate: true, shouldDirty: true });
            }
        }
    };

    // Reset on open
    useEffect(() => {
        if (open) {
            setStep("form");
            setPreviewData(null);
            form.reset(defaultValues);
        }
    }, [open, saleEvent, latestReport]);


    const generateReport = trpc.officer.sales.generateReport.useMutation({
        onSuccess: () => {
            toast.success("Sale adjustment saved successfully!");
            onSuccess?.();
            utils.officer.sales.invalidate();
            utils.officer.sales.getRecentSales.invalidate();
            utils.management.sales.getRecentSales.invalidate();
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error(err.message || "Failed to make adjustment.");
        }
    });

    const previewMutation = trpc.officer.sales.previewSale.useMutation({
        onSuccess: (data) => {
            setPreviewData(data);
            setStep("preview");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to preview.");
        }
    });

    const handlePreview = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            toast.error("Please check the form for errors before previewing.");
            return;
        }

        const values = form.getValues();
        previewMutation.mutate({
            cycleId: saleEvent.cycleId || "",
            birdsSold: values.birdsSold,
            totalMortality: values.totalMortality,
            totalWeight: values.totalWeight,
            pricePerKg: values.pricePerKg,
            cashReceived: values.cashReceived,
            depositReceived: values.depositReceived,
            medicineCost: values.medicineCost,
            feedConsumed: values.feedConsumed as any,
            feedStock: values.feedStock as any,
            location: values.location,
            party: values.party,
            houseBirds: saleEvent.houseBirds,
            mortalityChange: values.totalMortality - (latestReport ? (latestReport.totalMortality ?? saleEvent.totalMortality ?? 0) : (saleEvent.totalMortality ?? 0)),
            farmerMobile: values.farmerMobile || "",
            excludeSaleId: saleEvent.id,
            historyId: saleEvent.historyId || null,
            saleDate: saleEvent.saleDate,
            recoveryPrice: values.recoveryPrice,
            feedPricePerBag: values.feedPricePerBag,
            docPricePerBird: values.docPricePerBird,
        });
    };

    const onSubmit = (values: FormValues) => {
        generateReport.mutate({
            saleEventId: saleEvent.id,
            birdsSold: values.birdsSold,
            totalMortality: values.totalMortality,
            totalWeight: values.totalWeight,
            pricePerKg: values.pricePerKg,

            cashReceived: values.cashReceived,
            depositReceived: values.depositReceived,
            medicineCost: values.medicineCost,

            feedConsumed: values.feedConsumed as any,
            feedStock: values.feedStock as any,

            location: values.location,
            party: values.party,
            adjustmentNote: values.adjustmentNote,
            recoveryPrice: values.recoveryPrice,
            feedPricePerBag: values.feedPricePerBag,
            docPricePerBird: values.docPricePerBird,
        });
    };

    const remainingBirdsAfterAdjustment = Math.max(0,
        (saleEvent.cycleContext?.doc || saleEvent.houseBirds || 0) -
        ((saleEvent.cycleContext?.cumulativeBirdsSold || saleEvent.birdsSold) - saleEvent.birdsSold) -
        wBirdsSold -
        wMortality
    );

    const isLatest = saleEvent.isLatestInCycle || false;
    const cumulativeWeight = saleEvent.cycleContext?.totalWeight || 0;
    const cumulativeBirdsSold = saleEvent.cycleContext?.cumulativeBirdsSold || 0;

    const avgWeightDisplay = (isLatest && cumulativeWeight > 0 && cumulativeBirdsSold > 0)
        ? (cumulativeWeight / cumulativeBirdsSold).toFixed(2)
        : (wBirdsSold > 0 ? (wWeight / wBirdsSold).toFixed(2) : "0.00");


    return (
        <Modal
            visible={open}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => onOpenChange(false)}
        >

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                className="flex-1 bg-background"
            >
                <View className="px-4 py-3 border-b border-border/50 bg-card/50 flex-row items-center justify-between">
                    <Text className="text-lg font-bold">Adjust Sale</Text>
                    <Button variant="ghost" className="h-8 px-2" onPress={() => onOpenChange(false)}>
                        <Text className="text-primary font-bold">Close</Text>
                    </Button>
                </View>

                {step === "preview" && previewData ? (
                    <View className="flex-1">
                        <ScrollView className="flex-1" contentContainerClassName="p-4 pb-8">
                            <View className="mb-4 bg-muted/50 p-4 rounded-xl border border-border/50 items-center">
                                <Text className="text-sm text-center text-muted-foreground leading-5">
                                    Please review the adjusted details below.{"\n"}
                                    <Text className="font-bold text-foreground">This is just a preview.</Text> Click confirm to save.
                                </Text>
                            </View>

                            <SaleDetailsContent
                                sale={previewData}
                                isLatest={true}

                                displayBirdsSold={previewData.birdsSold}
                                displayTotalWeight={previewData.totalWeight}
                                displayAvgWeight={previewData.avgWeight}
                                displayPricePerKg={previewData.pricePerKg}
                                displayTotalAmount={previewData.totalAmount}
                                displayMortality={previewData.totalMortality}
                                selectedReport={null}
                            />
                        </ScrollView>

                        <View className="p-4 border-t border-border/50 bg-card flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 flex-row gap-2"
                                onPress={() => setStep("form")}
                            >
                                <Icon as={ArrowLeft} className="text-foreground" size={16} />
                                <Text className="font-bold">Back to Edit</Text>
                            </Button>
                            <Button
                                className="flex-1 h-12 flex-row gap-2 bg-emerald-600 active:bg-emerald-700"
                                onPress={form.handleSubmit((values: any) => onSubmit(values as FormValues))}
                                disabled={generateReport.isPending}
                            >
                                {generateReport.isPending ? (
                                    <ActivityIndicator color={"#ffffff"} />
                                ) : (
                                    <>
                                        <Icon as={ShoppingCart} className="text-white" size={16} />
                                        <Text className="text-white font-bold">Save Changes</Text>
                                    </>
                                )}
                            </Button>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1">
                        <ScrollView className="flex-1" contentContainerClassName="p-4 pb-8 gap-6">
                            <FarmerInfoHeader
                                farmerName={saleEvent.farmerName || "Farmer"}
                                farmerLocation={saleEvent.location}
                                farmerMobile={form.getValues("farmerMobile")}
                                cycleAge={saleEvent.cycleContext?.age || 0}
                                colorScheme="orange"
                            />

                            <View className="space-y-4 gap-y-2">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Icon as={Truck} size={16} className="text-muted-foreground" />
                                    <Text className="font-bold text-muted-foreground">Sale Details</Text>
                                </View>

                                <View className="flex-row gap-3">
                                    <Controller
                                        control={form.control}
                                        name="location"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Sale Location</Text>
                                                <Input
                                                    ref={locationRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="e.g. Bhaluka"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => partyRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="party"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Party Name</Text>
                                                <Input
                                                    ref={partyRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="e.g. Habib"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => birdsSoldRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                </View>

                                <View className="flex-row gap-3">
                                    <Controller
                                        control={form.control}
                                        name="birdsSold"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Birds Sold</Text>
                                                <Input
                                                    ref={birdsSoldRef}
                                                    keyboardType="numeric"
                                                    value={value?.toString()}
                                                    onChangeText={(v) => onChange(parseInt(v) || 0)}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => totalMortalityRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="totalMortality"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Total Mortality</Text>
                                                <Input
                                                    ref={totalMortalityRef}
                                                    keyboardType="numeric"
                                                    value={value?.toString()}
                                                    onChangeText={(v) => onChange(parseInt(v) || 0)}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => totalWeightRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                </View>

                                <View className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex-row items-center gap-3">
                                    <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center">
                                        <Icon as={Bird} size={20} className="text-orange-600" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-orange-700">Remaining Birds</Text>
                                        <Text className="text-xs text-orange-600/80">After adjustment: {remainingBirdsAfterAdjustment}</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="space-y-4 gap-y-2">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Icon as={Banknote} size={16} className="text-muted-foreground" />
                                    <Text className="font-bold text-muted-foreground">Finance</Text>
                                </View>

                                <View className="flex-row gap-3">
                                    <Controller
                                        control={form.control}
                                        name="totalWeight"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Total Wt (kg)</Text>
                                                <Input
                                                    ref={totalWeightRef}
                                                    keyboardType="decimal-pad"
                                                    value={value?.toString()}
                                                    onChangeText={(v) => onChange(parseFloat(v) || 0)}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => pricePerKgRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="pricePerKg"
                                        render={({ field: { onChange, value } }) => (
                                            <View className="flex-1">
                                                <Text className="text-sm font-medium mb-1.5 ml-1">Price/kg (৳)</Text>
                                                <Input
                                                    ref={pricePerKgRef}
                                                    keyboardType="decimal-pad"
                                                    value={value?.toString()}
                                                    onChangeText={(v) => onChange(parseFloat(v) || 0)}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => adjustmentNoteRef.current?.focus()}
                                                />
                                            </View>
                                        )}
                                    />
                                </View>

                                <SaleMetricsBar
                                    avgWeight={avgWeightDisplay}
                                    totalAmount={calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                />
                            </View>

                            <View className="space-y-4 gap-y-2">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Icon as={Box} size={16} className="text-muted-foreground" />
                                    <Text className="font-bold text-muted-foreground">Inventory</Text>
                                </View>

                                {remainingBirdsAfterAdjustment === 0 && (
                                    <View className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                                        <Text className="font-bold text-red-600 text-sm mb-1">Cycle Closing Warning:</Text>
                                        <Text className="text-red-600/80 text-xs">
                                            This is the last sale. Please enter the TOTAL feed consumed for the ENTIRE cycle below.
                                        </Text>
                                    </View>
                                )}

                                <FeedFieldArray
                                    control={form.control}
                                    fieldArray={feedConsumedArray}
                                    namePrefix="feedConsumed"
                                    label={remainingBirdsAfterAdjustment === 0 ? "FINAL Cycle Consumption" : "Feed Consumed"}
                                    description="Amount of feed consumed during this transaction."
                                    onBagsChange={handleFeedAdjustment}
                                />

                                <View className="mt-4 pt-4 border-t border-border/50">
                                    <FeedFieldArray
                                        control={form.control}
                                        fieldArray={feedStockArray}
                                        namePrefix="feedStock"
                                        label="Remaining Feed Stock"
                                        description="Stock left from the current supplies."
                                    />
                                </View>
                            </View>

                            {/* SECTION 4: CONSTANTS (ONLY IF CLOSING) */}
                            {remainingBirdsAfterAdjustment === 0 && (
                                <View className="space-y-4 gap-y-2">
                                    <View className="flex-row items-center gap-2 ml-1 mb-2">
                                        <Icon as={Settings} size={16} className="text-muted-foreground" />
                                        <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cycle Constants</Text>
                                    </View>
                                    <View className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                                        <View className="grid grid-cols-3 gap-2">
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Rec. Price</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="recoveryPrice"
                                                    render={({ field: { onChange, value } }) => (
                                                        <Input
                                                            ref={recoveryPriceRef}
                                                            value={value?.toString() || ""}
                                                            onChangeText={(t) => onChange(t === "" ? undefined : parseFloat(t) || undefined)}
                                                            keyboardType="decimal-pad"
                                                            placeholder="141"
                                                            className="h-10 bg-amber-500/5 border-amber-500/20 text-sm font-mono"
                                                        />
                                                    )}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Feed/Bag</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="feedPricePerBag"
                                                    render={({ field: { onChange, value } }) => (
                                                        <Input
                                                            ref={feedPriceRef}
                                                            value={value?.toString() || ""}
                                                            onChangeText={(t) => onChange(t === "" ? undefined : parseFloat(t) || undefined)}
                                                            keyboardType="decimal-pad"
                                                            placeholder="3220"
                                                            className="h-10 bg-amber-500/5 border-amber-500/20 text-sm font-mono"
                                                        />
                                                    )}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">DOC/Bird</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="docPricePerBird"
                                                    render={({ field: { onChange, value } }) => (
                                                        <Input
                                                            ref={docPriceRef}
                                                            value={value?.toString() || ""}
                                                            onChangeText={(t) => onChange(t === "" ? undefined : parseFloat(t) || undefined)}
                                                            keyboardType="decimal-pad"
                                                            placeholder="41.5"
                                                            className="h-10 bg-amber-500/5 border-amber-500/20 text-sm font-mono"
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View className="space-y-4">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <Icon as={FileText} size={16} className="text-muted-foreground" />
                                    <Text className="font-bold text-muted-foreground">Adjustment Details</Text>
                                </View>
                                <Controller
                                    control={form.control}
                                    name="adjustmentNote"
                                    render={({ field: { onChange, value } }) => (
                                        <View>
                                            <Text className="text-sm font-medium mb-1.5 ml-1">Reason for adjustment</Text>
                                            <Input
                                                ref={adjustmentNoteRef}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="e.g. Buyer disputed weight"
                                                returnKeyType="next"
                                                onSubmitEditing={remainingBirdsAfterAdjustment === 0 ? handlePreview : form.handleSubmit((values: any) => onSubmit(values as FormValues))}
                                            />
                                        </View>
                                    )}
                                />
                            </View>
                        </ScrollView>

                        <View className="p-4 border-t border-border/50 bg-card">
                            <Button
                                className="h-14 flex-row gap-2 bg-emerald-600 active:bg-emerald-700"
                                onPress={remainingBirdsAfterAdjustment === 0 ? handlePreview : form.handleSubmit((values: any) => onSubmit(values as FormValues))}
                                disabled={generateReport.isPending || previewMutation.isPending}
                            >
                                <Icon as={ShoppingCart} className="text-white" size={20} />
                                <Text className="text-white font-bold text-lg">
                                    {remainingBirdsAfterAdjustment === 0 ? "Preview & Close Batch" : "Confirm Adjustment"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
};
