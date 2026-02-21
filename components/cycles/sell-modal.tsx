import { RestockModal } from "@/components/farmers/restock-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Bird,
    Box,
    Check,
    ShoppingCart,
    Truck
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from "react-native";
import { z } from "zod";
import { SaleDetailsContent } from "./sale-details-content";
import { FarmerInfoHeader, FeedFieldArray, SaleMetricsBar } from "./sale-form-sections";

// Redefine here to avoid circular or missing imports
const feedItemSchema = z.object({
    type: z.string().min(1, "Type is required"),
    bags: z.number().min(0, "Amount must be >= 0"),
});

const formSchema = z.object({
    saleDate: z.string().min(1, "Sale date is required"),
    location: z.string().min(1, "Location is required"),
    party: z.string().optional(),
    farmerMobile: z.string().optional(),
    birdsSold: z.number().int().positive("Must sell at least 1 bird"),
    mortalityChange: z.number().int(),
    totalWeight: z.number().positive("Weight must be greater than 0"),
    pricePerKg: z.number().positive("Price must be greater than 0"),
    cashReceived: z.number().min(0),
    depositReceived: z.number().min(0),
    feedConsumed: z.array(feedItemSchema).min(1, "At least one feed entry required"),
    feedStock: z.array(feedItemSchema),
    medicineCost: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface SellModalProps {
    cycleId: string;
    farmerId: string;
    cycleName: string;
    farmerName: string;
    farmerLocation?: string | null;
    farmerMobile?: string | null;
    cycleAge: number;
    doc: number;
    mortality: number;
    birdsSold: number;
    intake: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    startDate?: Date; // Optional for now
}

export const SellModal = ({
    cycleId,
    farmerId,
    cycleName,
    farmerName,
    farmerLocation,
    farmerMobile,
    cycleAge,
    doc,
    mortality,
    birdsSold,
    intake,
    open,
    onOpenChange,
    startDate
}: SellModalProps) => {
    // Initial remaining birds for default value calculation
    const initialRemainingBirds = doc - mortality - birdsSold;

    const [generalError, setGeneralError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            saleDate: format(new Date(), "yyyy-MM-dd"),
            location: farmerLocation || "",
            farmerMobile: farmerMobile || "",
            birdsSold: initialRemainingBirds, // Use initial calculation for default
            mortalityChange: 0,
            totalWeight: 0,
            pricePerKg: 0,
            cashReceived: 0,
            depositReceived: 0,
            feedConsumed: [
                { type: "B1", bags: intake || 0 },
                { type: "B2", bags: 0 }
            ],
            feedStock: [
                { type: "B1", bags: 0 },
                { type: "B2", bags: 0 }
            ],
            medicineCost: 0,
        },
    });

    const saleDateRef = useRef<TextInput>(null);
    const farmerMobileRef = useRef<TextInput>(null);
    const locationRef = useRef<TextInput>(null);
    const partyRef = useRef<TextInput>(null);
    const birdsSoldRef = useRef<TextInput>(null);
    const mortalityChangeRef = useRef<TextInput>(null);
    const totalWeightRef = useRef<TextInput>(null);
    const pricePerKgRef = useRef<TextInput>(null);
    const cashReceivedRef = useRef<TextInput>(null);
    const depositReceivedRef = useRef<TextInput>(null);
    const medicineCostRef = useRef<TextInput>(null);

    const { data: previousSales } = trpc.officer.sales.getSaleEvents.useQuery(
        { cycleId },
        { enabled: open }
    );
    const lastSale = previousSales?.items?.[0];

    const [step, setStep] = useState<"form" | "preview">("form");
    const [previewData, setPreviewData] = useState<any>(null);

    const utils = trpc.useUtils();

    // Reset form with new defaults when modal opens or key props change
    useEffect(() => {
        if (open) {
            setStep("form");
            setPreviewData(null);
            setGeneralError(null);
            const currentRemainingBirds = doc - mortality - birdsSold;

            // Auto-fill feed from previous sale if available, otherwise use default
            const defaultFeedConsumed = lastSale?.feedConsumed ? (typeof lastSale.feedConsumed === 'string' ? JSON.parse(lastSale.feedConsumed) : lastSale.feedConsumed) as any : [
                { type: "B1", bags: intake || 0 },
                { type: "B2", bags: 0 }
            ];

            // Auto-fill feed from previous sale if available, otherwise use default
            const defaultFeedStock = lastSale?.feedStock ? (typeof lastSale.feedStock === 'string' ? JSON.parse(lastSale.feedStock) : lastSale.feedStock) as any : [
                { type: "B1", bags: 0 },
                { type: "B2", bags: 0 }
            ];

            form.reset({
                saleDate: format(new Date(), "yyyy-MM-dd"),
                location: farmerLocation || "",
                party: "",
                farmerMobile: farmerMobile || "",
                birdsSold: currentRemainingBirds,
                mortalityChange: 0,
                totalWeight: 0,
                pricePerKg: 0,
                cashReceived: 0,
                depositReceived: 0,
                feedConsumed: defaultFeedConsumed,
                feedStock: defaultFeedStock,
                medicineCost: 0,
            });
        }
    }, [open, doc, mortality, birdsSold, intake, farmerLocation, farmerMobile, form, lastSale]);

    const feedConsumedArray = useFieldArray({
        control: form.control,
        name: "feedConsumed",
    });

    const feedStockArray = useFieldArray({
        control: form.control,
        name: "feedStock",
    });

    const mutation = trpc.officer.sales.createSaleEvent.useMutation({
        onSuccess: (data) => {
            utils.officer.cycles.getDetails.invalidate();
            utils.officer.cycles.listActive.invalidate();
            utils.officer.cycles.listPast.invalidate();
            utils.officer.sales.getSaleEvents.invalidate();
            // TODO: show toast/alert logic

            onOpenChange(false);
            form.reset();
        },
        onError: (error) => setGeneralError(error.message),
    });

    const previewMutation = trpc.officer.sales.previewSale.useMutation({
        onSuccess: (data) => {
            setPreviewData(data);
            setStep("preview");
        },
        onError: (error) => setGeneralError(`Preview failed: ${error.message}`),
    });

    const handlePreview = async () => {
        setGeneralError(null);
        const isValid = await form.trigger();
        if (isValid) {
            const values = form.getValues();
            const now = new Date();
            const saleDateWithTime = new Date(values.saleDate);
            saleDateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

            previewMutation.mutate({
                cycleId,
                saleDate: saleDateWithTime,
                location: values.location,
                party: values.party,
                houseBirds: doc,
                birdsSold: values.birdsSold,
                mortalityChange: values.mortalityChange,
                totalMortality: mortality + values.mortalityChange,
                totalWeight: values.totalWeight,
                pricePerKg: values.pricePerKg,
                cashReceived: values.cashReceived,
                depositReceived: values.depositReceived,
                feedConsumed: values.feedConsumed,
                feedStock: values.feedStock,
                medicineCost: values.medicineCost,
                farmerMobile: values.farmerMobile ?? "",
            });
        } else {
            setGeneralError("Please fix form errors before continuing");
        }
    };

    const onSubmit = form.handleSubmit((values: FormValues) => {
        setGeneralError(null);
        const now = new Date();
        const saleDateWithTime = new Date(values.saleDate);
        saleDateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        // Needs to match TRPC schema precisely
        mutation.mutate({
            cycleId,
            saleDate: saleDateWithTime,
            location: values.location,
            party: values.party,
            houseBirds: doc,
            birdsSold: values.birdsSold,
            mortalityChange: values.mortalityChange,
            totalMortality: mortality + values.mortalityChange,
            totalWeight: values.totalWeight,
            pricePerKg: values.pricePerKg,
            cashReceived: values.cashReceived,
            depositReceived: values.depositReceived,
            feedConsumed: values.feedConsumed,
            feedStock: values.feedStock,
            medicineCost: values.medicineCost,
            farmerMobile: values.farmerMobile ?? "",
        });
    });

    const mortalityChange = form.watch("mortalityChange") || 0;
    const watchBirdsSold = form.watch("birdsSold") || 0;
    const watchWeight = form.watch("totalWeight") || 0;
    const watchPrice = form.watch("pricePerKg") || 0;

    // Birds currently in the house before this transaction
    const birdsInHouse = doc - mortality - birdsSold;

    // Auto-correction logic: bird sold + mortality cannot exceed total birds in house
    useEffect(() => {
        if (watchBirdsSold + mortalityChange > birdsInHouse) {
            form.setValue("birdsSold", Math.max(0, birdsInHouse - mortalityChange));
        }
    }, [watchBirdsSold, mortalityChange, birdsInHouse, form]);

    // SYNC CASH: Automatically update Cash Received when Total Amount changes
    useEffect(() => {
        const total = watchWeight * watchPrice;
        if (total > 0) {
            form.setValue("cashReceived", total);
        }
    }, [watchWeight, watchPrice, form]);

    // Birds remaining AFTER this transaction (subtracting mortality change and current sale)
    const remainingBirdsAfterTransaction = Math.max(0, birdsInHouse - mortalityChange - watchBirdsSold);

    const avgWeight = watchBirdsSold > 0 ? (watchWeight / watchBirdsSold).toFixed(2) : "0.00";
    const totalAmount = (watchWeight * watchPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Fetch Farmer Details for Stock Check
    const { data: farmer } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: farmerId },
        { enabled: open }
    );

    const mainStock = farmer?.mainStock || 0;

    const handleFeedAdjustment = (index: number, newBags: number) => {
        if (!lastSale) return;

        const currentType = (form.getValues(`feedConsumed.${index}.type`) || "").toUpperCase().trim();
        if (!currentType) return;

        const baselineConsumed = (lastSale.feedConsumed ? (typeof lastSale.feedConsumed === 'string' ? JSON.parse(lastSale.feedConsumed) : lastSale.feedConsumed) : []) as { type: string; bags: number }[];
        const baselineStock = (lastSale.feedStock ? (typeof lastSale.feedStock === 'string' ? JSON.parse(lastSale.feedStock) : lastSale.feedStock) : []) as { type: string; bags: number }[];

        // Find baseline consumption for this type
        const baseline = baselineConsumed.find(b => (b.type || "").toUpperCase().trim() === currentType);
        const baselineBags = Number(baseline?.bags || 0);
        const consumedDelta = newBags - baselineBags;

        const currentStock = [...form.getValues("feedStock")];
        const stockIndex = currentStock.findIndex(s => (s.type || "").toUpperCase().trim() === currentType);

        if (stockIndex > -1) {
            const bStock = baselineStock.find(bs => (bs.type || "").toUpperCase().trim() === currentType);
            const baselineStockBags = Number(bStock?.bags || 0);
            const newStockBags = Math.max(0, baselineStockBags - consumedDelta);

            if (Number(currentStock[stockIndex].bags) !== newStockBags) {
                currentStock[stockIndex] = { ...currentStock[stockIndex], bags: newStockBags };
                form.setValue("feedStock", currentStock, { shouldValidate: true, shouldDirty: true });
            }
        }
    };

    // Calculate total bags needed: Sum of feed consumed + Sum of remaining feed stock
    const totalBagsNeeded = form.watch("feedConsumed").reduce((acc, item) => acc + (item.bags || 0), 0) +
        form.watch("feedStock").reduce((acc, item) => acc + (item.bags || 0), 0);

    const isStockInsufficient = totalBagsNeeded > mainStock;
    const [showRestockModal, setShowRestockModal] = useState(false);

    // Form errors checking helper
    const hasError = (field: keyof FormValues) => !!form.formState.errors[field];
    const getError = (field: keyof FormValues) => form.formState.errors[field]?.message;

    return (
        <Modal
            animationType="slide"
            transparent={false} // Full screen modal
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1 bg-background"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-border/50 bg-card pt-12">
                    <View className="flex-row items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 p-0" onPress={() => onOpenChange(false)}>
                            <Icon as={ArrowLeft} size={20} className="text-foreground" />
                        </Button>
                        <View>
                            <Text className="text-lg font-bold">Record Sale</Text>
                            <Text className="text-xs text-muted-foreground">Selling from {farmerName}</Text>
                        </View>
                    </View>
                </View>

                {step === "preview" && previewData ? (
                    <View className="flex-1">
                        <ScrollView className="flex-1 px-4 pt-4">
                            <View className="mb-4 bg-primary/10 p-3 rounded-lg border border-primary/20 items-center">
                                <Text className="text-sm font-bold text-primary">Preview Sale Details</Text>
                                <Text className="text-xs text-center text-muted-foreground mt-1">
                                    Please review the calculated metrics below. Click Confirm to save.
                                </Text>
                            </View>

                            <SaleDetailsContent
                                sale={previewData}
                                isLatest={true}
                                displayBirdsSold={previewData.birdsSold}
                                displayTotalWeight={(previewData.totalWeight || 0).toFixed(2)}
                                displayAvgWeight={previewData.avgWeight}
                                displayPricePerKg={(previewData.pricePerKg || 0).toFixed(2)}
                                displayTotalAmount={previewData.totalAmount}
                                displayMortality={previewData.mortalityChange}
                            />
                            <View className="h-20" />
                        </ScrollView>

                        <View className="p-4 bg-card border-t border-border/50 flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-14 rounded-xl flex-row gap-2"
                                onPress={() => setStep("form")}
                            >
                                <Icon as={ArrowLeft} size={18} className="text-foreground" />
                                <Text className="font-bold">Back to Edit</Text>
                            </Button>
                            <Button
                                className="flex-1 h-14 rounded-xl shadow-none flex-row gap-2"
                                onPress={onSubmit}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Icon as={Check} size={18} className="text-primary-foreground" />
                                )}
                                <Text className="text-primary-foreground font-bold">
                                    {mutation.isPending ? "Saving..." : "Confirm & Save"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1">
                        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6 pb-20">
                            {generalError && (
                                <View className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 mb-2">
                                    <Text className="text-destructive font-bold text-sm text-center">{generalError}</Text>
                                </View>
                            )}

                            {/* SECTION 1: FARMER INFO */}
                            <View className="space-y-4">
                                <FarmerInfoHeader
                                    farmerName={farmerName}
                                    farmerLocation={farmerLocation}
                                    farmerMobile={farmerMobile}
                                    cycleAge={cycleAge}
                                    colorScheme="blue"
                                />

                                <View className="flex-row items-center gap-2 mt-2 ml-1">
                                    <Icon as={Truck} size={16} className="text-muted-foreground" />
                                    <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Sale Basics</Text>
                                </View>

                                {/* Date & Mobile */}
                                <View className="flex-row gap-4 px-1">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Date</Text>
                                        <Controller
                                            control={form.control}
                                            name="saleDate"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={saleDateRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="YYYY-MM-DD"
                                                    className={`h-12 bg-muted/40 border-border/50 text-base ${hasError("saleDate") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => farmerMobileRef.current?.focus()}
                                                />
                                            )}
                                        />
                                        {hasError("saleDate") && <Text className="text-[10px] text-destructive ml-1 mt-1">{getError("saleDate")}</Text>}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Buyer Mobile</Text>
                                        <Controller
                                            control={form.control}
                                            name="farmerMobile"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={farmerMobileRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="01XXXXXXXXX"
                                                    keyboardType="phone-pad"
                                                    className="h-12 bg-muted/40 border-border/50 text-base"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => locationRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                {/* Location & Party */}
                                <View className="flex-row gap-4 px-1">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Sale Location</Text>
                                        <Controller
                                            control={form.control}
                                            name="location"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={locationRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="e.g. Bhaluka"
                                                    className={`h-12 bg-muted/40 border-border/50 text-base ${hasError("location") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => partyRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Party Name</Text>
                                        <Controller
                                            control={form.control}
                                            name="party"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={partyRef}
                                                    value={value}
                                                    onChangeText={onChange}
                                                    placeholder="e.g. Habibur"
                                                    className="h-12 bg-muted/40 border-border/50 text-base"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => birdsSoldRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                {/* Birds Sale Details */}
                                <View className="flex-row gap-3 px-1 mt-2">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">House</Text>
                                        <View className="h-12 bg-muted/40 border border-border/50 rounded-xl items-center justify-center">
                                            <Text className="font-mono font-bold text-xl text-foreground">{birdsInHouse}</Text>
                                        </View>
                                    </View>

                                    <View className="flex-[1.5]">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Birds Sold</Text>
                                        <Controller
                                            control={form.control}
                                            name="birdsSold"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={birdsSoldRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                                                    keyboardType="number-pad"
                                                    className={`h-12 bg-muted/40 border-border/50 font-mono text-xl text-center ${hasError("birdsSold") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => mortalityChangeRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>

                                    <View className="flex-[1.5]">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">New Dead</Text>
                                        <Controller
                                            control={form.control}
                                            name="mortalityChange"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={mortalityChangeRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                                                    keyboardType="number-pad"
                                                    className={`h-12 bg-muted/40 border-border/50 font-mono text-xl text-center text-destructive ${hasError("mortalityChange") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => totalWeightRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                <View className="flex-row items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-1">
                                    <Icon as={Bird} size={20} className="text-blue-500" />
                                    <View>
                                        <Text className="font-bold text-blue-700 dark:text-blue-300">Remaining Birds</Text>
                                        <Text className="text-xs text-blue-600/80 dark:text-blue-400">After this sale: {remainingBirdsAfterTransaction}</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="h-[1px] bg-border/50" />

                            {/* SECTION 2: FINANCIALS */}
                            <View className="space-y-4">
                                <View className="flex-row items-center gap-2 ml-1">
                                    <Icon as={Banknote} size={16} className="text-muted-foreground" />
                                    <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Financials</Text>
                                </View>

                                {/* Weight & Price */}
                                <View className="flex-row gap-4 px-1">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Total Wt (kg)</Text>
                                        <Controller
                                            control={form.control}
                                            name="totalWeight"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={totalWeightRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                                                    keyboardType="decimal-pad"
                                                    className={`h-12 bg-muted/40 border-border/50 font-mono text-lg ${hasError("totalWeight") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => pricePerKgRef.current?.focus()}
                                                />
                                            )}
                                        />
                                        {hasError("totalWeight") && <Text className="text-[10px] text-destructive ml-1 mt-1">{getError("totalWeight")}</Text>}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Price/kg (৳)</Text>
                                        <Controller
                                            control={form.control}
                                            name="pricePerKg"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={pricePerKgRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                                                    keyboardType="decimal-pad"
                                                    className={`h-12 bg-muted/40 border-border/50 font-mono text-lg ${hasError("pricePerKg") ? "border-destructive/50" : ""}`}
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => cashReceivedRef.current?.focus()}
                                                />
                                            )}
                                        />
                                        {hasError("pricePerKg") && <Text className="text-[10px] text-destructive ml-1 mt-1">{getError("pricePerKg")}</Text>}
                                    </View>
                                </View>

                                <View className="mt-2">
                                    <SaleMetricsBar avgWeight={avgWeight} totalAmount={totalAmount} />
                                </View>

                                {/* Payments */}
                                <View className="flex-row gap-4 px-1 pt-2">
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Cash Rcvd (৳)</Text>
                                        <Controller
                                            control={form.control}
                                            name="cashReceived"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={cashReceivedRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                                                    keyboardType="number-pad"
                                                    className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => depositReceivedRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Deposit (৳)</Text>
                                        <Controller
                                            control={form.control}
                                            name="depositReceived"
                                            render={({ field: { onChange, value } }) => (
                                                <Input
                                                    ref={depositReceivedRef}
                                                    value={value?.toString() || ""}
                                                    onChangeText={(t) => onChange(parseFloat(t) || 0)}
                                                    keyboardType="number-pad"
                                                    className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                    returnKeyType="next"
                                                    onSubmitEditing={() => medicineCostRef.current?.focus()}
                                                />
                                            )}
                                        />
                                    </View>
                                </View>

                                {/* Medicine */}
                                <View className="px-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Medicine Cost (৳)</Text>
                                    <Controller
                                        control={form.control}
                                        name="medicineCost"
                                        render={({ field: { onChange, value } }) => (
                                            <Input
                                                ref={medicineCostRef}
                                                value={value?.toString() || ""}
                                                onChangeText={(t) => onChange(parseFloat(t) || 0)}
                                                keyboardType="number-pad"
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                returnKeyType="next"
                                            />
                                        )}
                                    />
                                </View>
                            </View>

                            <View className="h-[1px] bg-border/50" />

                            {/* SECTION 3: INVENTORY */}
                            <View className="space-y-4">
                                <View className="flex-row items-center gap-2 ml-1">
                                    <Icon as={Box} size={16} className="text-muted-foreground" />
                                    <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Feed Inventory</Text>
                                </View>

                                {remainingBirdsAfterTransaction === 0 && (
                                    <View className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                                        <Text className="text-sm font-bold text-destructive mb-1">Cycle Closing Warning!</Text>
                                        <Text className="text-xs text-destructive/80">
                                            This is the last sale. Please enter the TOTAL feed consumed for the ENTIRE cycle.
                                            This will override previous approximations.
                                        </Text>
                                    </View>
                                )}

                                <FeedFieldArray
                                    control={form.control}
                                    fieldArray={feedConsumedArray}
                                    namePrefix="feedConsumed"
                                    label={remainingBirdsAfterTransaction === 0 ? "TOTAL Consumed" : "Consumed So Far"}
                                    description={remainingBirdsAfterTransaction === 0 ? "Total sacks eaten this full cycle." : "Document sacks eaten."}
                                    onBagsChange={handleFeedAdjustment}
                                />

                                <View className="h-[1px] bg-border/50 my-2" />

                                <FeedFieldArray
                                    control={form.control}
                                    fieldArray={feedStockArray}
                                    namePrefix="feedStock"
                                    label="Leftover Feed Return"
                                    description="Inventory returned back to main stock."
                                    showRemoveOnSingle
                                />
                            </View>
                        </ScrollView>

                        {/* Sticky Footer */}
                        <View className="p-4 bg-card border-t border-border/50 gap-3">
                            {isStockInsufficient && (
                                <View className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 mb-2">
                                    <View className="flex-row items-center gap-2">
                                        <Icon as={AlertTriangle} size={16} className="text-amber-600" />
                                        <Text className="text-sm font-bold text-amber-700 dark:text-amber-400">Insufficient Stock</Text>
                                    </View>
                                    <Text className="text-xs text-amber-700/80 dark:text-amber-500/80">
                                        Trying to use {totalBagsNeeded} bags, but main stock only has {mainStock} bags.
                                    </Text>
                                    <Button
                                        variant="outline"
                                        className="h-10 mt-1 border-amber-500/30"
                                        onPress={() => setShowRestockModal(true)}
                                    >
                                        <Text className="font-bold text-amber-700 dark:text-amber-400">Restock Now</Text>
                                    </Button>
                                </View>
                            )}
                            <Button
                                className={`h-14 rounded-xl flex-row gap-2 shadow-none ${remainingBirdsAfterTransaction === 0 ? 'bg-destructive' : 'bg-primary'}`}
                                onPress={remainingBirdsAfterTransaction === 0 ? handlePreview : onSubmit}
                                disabled={(remainingBirdsAfterTransaction === 0 ? previewMutation.isPending : mutation.isPending) || isStockInsufficient}
                            >
                                {remainingBirdsAfterTransaction === 0 ? (
                                    <>
                                        <Icon as={ShoppingCart} size={18} className="text-white" />
                                        <Text className="text-white font-bold">
                                            {previewMutation.isPending ? "Calculating..." : "Preview & Close Cycle"}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        {mutation.isPending ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Icon as={Check} size={18} className="text-primary-foreground" />
                                        )}
                                        <Text className="text-primary-foreground font-bold">
                                            {mutation.isPending ? "Saving..." : "Confirm & Save"}
                                        </Text>
                                    </>
                                )}
                            </Button>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            <RestockModal
                farmerId={farmerId}
                farmerName={farmerName}
                open={showRestockModal}
                onOpenChange={setShowRestockModal}
                onSuccess={() => {
                    utils.officer.farmers.getDetails.invalidate({ farmerId });
                }}
            />
        </Modal>
    );
};
