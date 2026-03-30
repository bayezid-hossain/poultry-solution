import { RestockModal } from "@/components/farmers/restock-modal";
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { BirdyLoader } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format } from "date-fns";
import { useRouter } from "expo-router";
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Bird,
    Box,
    Calendar as CalendarIcon,
    Check,
    Settings,
    ShoppingCart,
    Truck
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
import { CorrectAgeModal } from "./correct-age-modal";
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
    birdsRejected: z.number().int().min(0),
    mortalityChange: z.number().int(),
    totalWeight: z.number().positive("Weight must be greater than 0"),
    pricePerKg: z.number().positive("Price must be greater than 0"),
    cashReceived: z.number().min(0),
    depositReceived: z.number().min(0),
    feedConsumed: z.array(feedItemSchema).min(1, "At least one feed entry required"),
    feedStock: z.array(feedItemSchema),
    medicineCost: z.number().min(0),
    recoveryPrice: z.number().positive().optional(),
    feedPricePerBag: z.number().positive().optional(),
    docPricePerBird: z.number().positive().optional(),
    officialInputDate: z.string().optional(),
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
    onSuccess?: () => void;
    startDate?: Date; // Optional for now
    officialInputDate?: Date | string | null;
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
    onSuccess,
    startDate,
    officialInputDate
}: SellModalProps) => {
    // Initial remaining birds for default value calculation
    const initialRemainingBirds = doc - mortality - birdsSold;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            saleDate: format(new Date(), "yyyy-MM-dd"),
            location: farmerLocation || "",
            farmerMobile: farmerMobile || "",
            birdsSold: initialRemainingBirds, // Use initial calculation for default
            birdsRejected: 0,
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
            recoveryPrice: undefined,
            feedPricePerBag: undefined,
            docPricePerBird: undefined,
            officialInputDate: officialInputDate ? format(new Date(officialInputDate), "yyyy-MM-dd") : (startDate ? format(new Date(startDate), "yyyy-MM-dd") : undefined),
        },
    });

    const saleDateRef = useRef<TextInput>(null);
    const farmerMobileRef = useRef<TextInput>(null);
    const locationRef = useRef<TextInput>(null);
    const partyRef = useRef<TextInput>(null);
    const birdsSoldRef = useRef<TextInput>(null);
    const birdsRejectedRef = useRef<TextInput>(null);
    const mortalityChangeRef = useRef<TextInput>(null);
    const totalWeightRef = useRef<TextInput>(null);
    const pricePerKgRef = useRef<TextInput>(null);
    const cashReceivedRef = useRef<TextInput>(null);
    const depositReceivedRef = useRef<TextInput>(null);
    const recoveryPriceRef = useRef<TextInput>(null);
    const feedPriceRef = useRef<TextInput>(null);
    const docPriceRef = useRef<TextInput>(null);

    const hasInitializedRef = useRef(false);

    const { data: previousSales, isLoading: isPreviousSalesLoading } = trpc.officer.sales.getSaleEvents.useQuery(
        { cycleId },
        { enabled: open }
    );
    const lastSale = previousSales?.[0];

    const [step, setStep] = useState<"form" | "preview">("form");
    const [previewData, setPreviewData] = useState<any>(null);
    const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showOfficialDatePicker, setShowOfficialDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onOfficialDateChange = (event: any, selectedDate?: Date) => {
        setShowOfficialDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            form.setValue('officialInputDate', format(selectedDate, 'yyyy-MM-dd'));
        }
    };

    const onSaleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            form.setValue('saleDate', format(selectedDate, 'yyyy-MM-dd'));
        }
    };

    const router = useRouter();
    const utils = trpc.useUtils();

    // Reset basic state when modal opens
    useEffect(() => {
        if (open) {
            setStep("form");
            setPreviewData(null);
            hasInitializedRef.current = false;
            setIsSubmitting(false);
        }
    }, [open]);

    // Initialize form with defaults ONLY ONCE when data is ready
    useEffect(() => {
        if (open && !isPreviousSalesLoading && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
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
                birdsRejected: 0,
                mortalityChange: 0,
                totalWeight: 0,
                pricePerKg: 0,
                cashReceived: 0,
                depositReceived: 0,
                feedConsumed: defaultFeedConsumed,
                feedStock: defaultFeedStock,
                medicineCost: 0,
                recoveryPrice: undefined,
                feedPricePerBag: undefined,
                docPricePerBird: undefined,
                officialInputDate: officialInputDate ? format(new Date(officialInputDate), "yyyy-MM-dd") : (startDate ? format(new Date(startDate), "yyyy-MM-dd") : undefined),
            });
        }
    }, [open, isPreviousSalesLoading, lastSale, doc, mortality, birdsSold, intake, farmerLocation, farmerMobile, form, officialInputDate, startDate]);

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
            utils.officer.sales.getRecentSales.invalidate();
            utils.management.sales.getRecentSales.invalidate();
            utils.officer.farmers.getDetails.invalidate({ farmerId });
            utils.officer.cycles.getDetails.invalidate({ id: cycleId });
            // TODO: show toast/alert logic

            onSuccess?.();
            onOpenChange(false);
            form.reset();
        },
        onError: (error) => {
            setIsSubmitting(false);
            toast.error(error.message);
        },
    });

    const updateOfficialDateMutation = trpc.officer.cycles.updateOfficialInputDate.useMutation();

    const previewMutation = trpc.officer.sales.previewSale.useMutation({
        onSuccess: (data) => {
            setPreviewData(data);
            setStep("preview");
        },
        onError: (error) => {
            toast.error(`Preview failed: ${error.message}`);
        },
    });

    const handlePreview = async () => {
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
                birdsRejected: values.birdsRejected || 0,
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
                recoveryPrice: values.recoveryPrice,
                feedPricePerBag: values.feedPricePerBag,
                docPricePerBird: values.docPricePerBird,
                officialInputDate: values.officialInputDate ? new Date(values.officialInputDate) : undefined,
            });
        } else {
            toast.error("Please fix form errors before continuing");
        }
    };

    const onSubmit = form.handleSubmit(async (values: FormValues) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const now = new Date();
        const saleDateWithTime = new Date(values.saleDate);
        saleDateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

        if (values.officialInputDate) {
            const currentFormatted = officialInputDate
                ? format(new Date(officialInputDate), "yyyy-MM-dd")
                : (startDate ? format(new Date(startDate), "yyyy-MM-dd") : undefined);
            if (values.officialInputDate !== currentFormatted) {
                try {
                    await updateOfficialDateMutation.mutateAsync({
                        id: cycleId,
                        officialInputDate: new Date(values.officialInputDate),
                    });
                } catch (e) {
                    setIsSubmitting(false);
                    toast.error("Failed to update official input date");
                    return;
                }
            }
        }

        // Needs to match TRPC schema precisely
        mutation.mutate({
            cycleId,
            saleDate: saleDateWithTime,
            location: values.location,
            party: values.party,
            houseBirds: doc,
            birdsSold: values.birdsSold,
            birdsRejected: values.birdsRejected || 0,
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
            recoveryPrice: values.recoveryPrice,
            feedPricePerBag: values.feedPricePerBag,
            docPricePerBird: values.docPricePerBird,
            officialInputDate: values.officialInputDate ? new Date(values.officialInputDate) : undefined,
        });
    });

    const mortalityChange = form.watch("mortalityChange") || 0;
    const watchBirdsSold = form.watch("birdsSold") || 0;
    const watchBirdsRejected = form.watch("birdsRejected") || 0;
    const watchWeight = form.watch("totalWeight") || 0;
    const watchPrice = form.watch("pricePerKg") || 0;

    // Birds currently in the house before this transaction
    const birdsInHouse = doc - mortality - birdsSold;

    // Auto-correction logic: bird sold + rejected + mortality cannot exceed total birds in house
    useEffect(() => {
        if (watchBirdsSold + watchBirdsRejected + mortalityChange > birdsInHouse) {
            form.setValue("birdsSold", Math.max(0, birdsInHouse - watchBirdsRejected - mortalityChange));
        }
    }, [watchBirdsSold, watchBirdsRejected, mortalityChange, birdsInHouse, form]);

    // SYNC CASH: Automatically update Cash Received when Total Amount changes
    useEffect(() => {
        const total = watchWeight * watchPrice;
        if (total > 0) {
            form.setValue("cashReceived", total);
        }
    }, [watchWeight, watchPrice, form]);

    // Birds remaining AFTER this transaction (subtracting mortality change, sold, and rejected)
    const remainingBirdsAfterTransaction = Math.max(0, birdsInHouse - mortalityChange - watchBirdsSold - watchBirdsRejected);

    const avgWeight = watchBirdsSold > 0 ? (watchWeight / watchBirdsSold).toFixed(2) : "0.00";
    const totalAmount = (watchWeight * watchPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Fetch Farmer Details for Stock Check
    const { data: farmer } = trpc.officer.farmers.getDetails.useQuery(
        { farmerId: farmerId },
        { enabled: open }
    );

    const mainStock = farmer?.mainStock || 0;

    const handleFeedAdjustment = (index: number, newBags: number) => {
        const currentType = (form.getValues(`feedConsumed.${index}.type`) || "").toUpperCase().trim();
        if (!currentType) return;

        // Use previous sale's data as baseline, or fall back to defaults
        const baselineConsumed = lastSale?.feedConsumed
            ? (typeof lastSale.feedConsumed === 'string' ? JSON.parse(lastSale.feedConsumed) : lastSale.feedConsumed) as { type: string; bags: number }[]
            : [{ type: "B1", bags: intake || 0 }, { type: "B2", bags: 0 }];
        const baselineStock = lastSale?.feedStock
            ? (typeof lastSale.feedStock === 'string' ? JSON.parse(lastSale.feedStock) : lastSale.feedStock) as { type: string; bags: number }[]
            : [{ type: "B1", bags: 0 }, { type: "B2", bags: 0 }];

        // Find baseline consumption for this type
        const baseline = baselineConsumed.find(b => (b.type || "").toUpperCase().trim() === currentType);
        const baselineBags = Number(baseline?.bags || 0);
        const consumedDelta = newBags - baselineBags;

        const currentStock = [...form.getValues("feedStock")];
        const stockIndex = currentStock.findIndex(s => (s.type || "").toUpperCase().trim() === currentType);

        if (stockIndex > -1) {
            const bStock = baselineStock.find(bs => (bs.type || "").toUpperCase().trim() === currentType);
            const baselineStockBags = Number(bStock?.bags || 0);
            const newStockBags = parseFloat(Math.max(0, baselineStockBags - consumedDelta).toFixed(2));

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
        <BottomSheetModal open={open} onOpenChange={onOpenChange} fullScreen>
            <View className="flex-1 bg-background">
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-border/50 bg-card pt-12">
                    <View className="flex-row items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 p-0" onPress={() => onOpenChange(false)}>
                            <Icon as={ArrowLeft} size={20} className="text-foreground" />
                        </Button>
                        <View>
                            <Text className="text-lg font-bold">Record Sale</Text>
                            <Pressable
                                onPress={() => {
                                    onOpenChange(false);
                                    router.push({ pathname: "/farmer/[id]", params: { id: farmerId } } as any);
                                }}
                                className="active:opacity-60"
                            >
                                <Text className="text-xs text-muted-foreground active:text-primary">Selling from {farmerName}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {step === "preview" && previewData ? (
                    <View className="flex-1">
                        <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
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
                                displayMortality={previewData.totalMortality}
                            />
                            <View className="h-20" />
                        </ScrollView>

                        <View className="p-4 bg-card border-t border-border/50 flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-14 rounded-xl flex-row gap-2"
                                onPress={() => setStep("form")}
                                disabled={isSubmitting}
                            >
                                <Icon as={ArrowLeft} size={18} className="text-foreground" />
                                <Text className="font-bold">Back to Edit</Text>
                            </Button>
                            <Button
                                className="flex-1 h-14 rounded-xl shadow-none flex-row gap-2"
                                onPress={onSubmit}
                                disabled={isSubmitting || mutation.isPending}
                            >
                                {isSubmitting || mutation.isPending ? (
                                    <ActivityIndicator color={"#ffffff"} />
                                ) : (
                                    <Icon as={Check} size={18} className="text-primary-foreground" />
                                )}
                                <Text className="text-primary-foreground font-bold">
                                    {(isSubmitting || mutation.isPending) ? "Saving..." : "Confirm & Save"}
                                </Text>
                            </Button>
                        </View>
                    </View>
                ) : (
                    <View className="flex-1">
                        {isPreviousSalesLoading ? (
                            <View className="flex-1 items-center justify-center p-10">
                                <ActivityIndicator size="large" color="#3b82f6" />
                                <Text className="mt-4 text-muted-foreground font-medium">Preparing Sale Form...</Text>
                                <Text className="text-xs text-muted-foreground/60 text-center mt-2 px-6">
                                    We're fetching the most recent sale context to pre-fill your defaults.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6 pb-20" keyboardShouldPersistTaps="handled">
                                    {/* SECTION 1: FARMER INFO */}
                                    <View className="space-y-4 gap-y-2">
                                        <FarmerInfoHeader
                                            farmerName={farmerName}
                                            farmerLocation={farmerLocation}
                                            farmerMobile={farmerMobile}
                                            cycleAge={cycleAge}
                                            colorScheme="blue"
                                            onEditAgePress={() => setIsAgeModalOpen(true)}
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
                                                    render={({ field: { value } }) => (
                                                        <Pressable
                                                            onPress={() => setShowDatePicker(true)}
                                                            className={`h-12 bg-muted/40 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50 ${hasError("saleDate") ? "border-destructive/50" : ""}`}
                                                        >
                                                            <Text className="text-sm text-foreground">
                                                                {value ? format(new Date(value), "PPP") : "Select date"}
                                                            </Text>
                                                            <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                                                        </Pressable>
                                                    )}
                                                />
                                                {showDatePicker && (
                                                    <DateTimePicker
                                                        value={form.getValues('saleDate') ? new Date(form.getValues('saleDate')) : new Date()}
                                                        mode="date"
                                                        display="default"
                                                        onChange={onSaleDateChange}
                                                        maximumDate={new Date()}
                                                        minimumDate={lastSale?.saleDate ? addDays(new Date(lastSale.saleDate), 0) : (startDate ? new Date(startDate) : undefined)}
                                                    />
                                                )}
                                                {hasError("saleDate") && <Text className="text-[10px] text-destructive ml-1 mt-1">{getError("saleDate")}</Text>}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Farmer Mobile</Text>
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

                                        {/* Official DOC Input Date */}
                                        <View className="flex-row gap-4 px-1">
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Official DOC Date (Optional)</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="officialInputDate"
                                                    render={({ field: { value } }) => (
                                                        <Pressable
                                                            onPress={() => setShowOfficialDatePicker(true)}
                                                            className={`h-12 bg-muted/40 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50`}
                                                        >
                                                            <Text className="text-sm text-foreground">
                                                                {value ? format(new Date(value), "PPP") : "Select date"}
                                                            </Text>
                                                            <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
                                                        </Pressable>
                                                    )}
                                                />
                                                {showOfficialDatePicker && (
                                                    <DateTimePicker
                                                        value={form.getValues('officialInputDate') ? new Date(form.getValues('officialInputDate')!) : new Date()}
                                                        mode="date"
                                                        display="default"
                                                        onChange={onOfficialDateChange}
                                                        maximumDate={new Date()}
                                                    />
                                                )}
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
                                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">House Birds</Text>
                                                <View className="h-12 bg-muted/40 border border-border/50 rounded-xl items-center justify-center">
                                                    <Text className="font-mono font-bold text-xl text-foreground">{birdsInHouse}</Text>
                                                </View>
                                            </View>

                                            <View className="flex-1">
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
                                                            onSubmitEditing={() => birdsRejectedRef.current?.focus()}
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>

                                        <View className="flex-row gap-3 px-1">


                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Total Mortality</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="mortalityChange"
                                                    render={({ field: { onChange, value } }) => {
                                                        const currentTotal = mortality + (value || 0);
                                                        const [localText, setLocalText] = useState(currentTotal.toString());

                                                        // Sync local text when form value changes externally
                                                        useEffect(() => {
                                                            const total = mortality + (value || 0);
                                                            setLocalText(total.toString());
                                                        }, [mortality]);

                                                        return (
                                                            <View>
                                                                <Input
                                                                    ref={mortalityChangeRef}
                                                                    value={localText}
                                                                    onChangeText={(t) => {
                                                                        setLocalText(t);
                                                                        if (t === "") {
                                                                            // Allow empty, treat as 0 delta temporarily
                                                                            return;
                                                                        }
                                                                        const newTotal = parseInt(t, 10);
                                                                        if (!isNaN(newTotal)) {
                                                                            const delta = newTotal - mortality;
                                                                            onChange(delta);
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        // On blur, if empty, reset to current mortality
                                                                        if (localText === "") {
                                                                            setLocalText(mortality.toString());
                                                                            onChange(0);
                                                                        }
                                                                    }}
                                                                    keyboardType="number-pad"
                                                                    placeholder={`Current: ${mortality}`}
                                                                    className={`h-12 bg-muted/40 border-border/50 font-mono text-xl text-center ${hasError("mortalityChange") ? "border-destructive/50" : ""}`}
                                                                    returnKeyType="next"
                                                                    onSubmitEditing={() => totalWeightRef.current?.focus()}
                                                                />
                                                                {value !== 0 && (
                                                                    <Text className={`text-[10px] font-medium mt-1 ml-1 ${value > 0 ? "text-destructive" : "text-amber-600"}`}>
                                                                        {value > 0 ? `+${value} new deaths` : `${localText == "" ? -mortality : value} correction`}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        );
                                                    }}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Rejected Birds</Text>
                                                <Controller
                                                    control={form.control}
                                                    name="birdsRejected"
                                                    render={({ field: { onChange, value } }) => (
                                                        <Input
                                                            ref={birdsRejectedRef}
                                                            value={value?.toString() || ""}
                                                            onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
                                                            keyboardType="number-pad"
                                                            className="h-12 bg-muted/40 border-border/50 font-mono text-xl text-center"
                                                            returnKeyType="next"
                                                            onSubmitEditing={() => mortalityChangeRef.current?.focus()}
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
                                                            onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
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
                                                            onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
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
                                                            onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
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
                                                            onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
                                                            keyboardType="number-pad"
                                                            className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                            returnKeyType="next"
                                                        />
                                                    )}
                                                />
                                            </View>
                                        </View>


                                    </View>

                                    <View className="h-[1px] bg-border/50" />

                                    {/* SECTION 3: INVENTORY */}
                                    <View className="space-y-4 gap-y-2">
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

                                    {/* SECTION 4: CONSTANTS (ONLY IF CLOSING) */}
                                    {remainingBirdsAfterTransaction === 0 && (
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
                                                                    onChangeText={(t) => onChange(t === "" ? undefined : t.endsWith('.') ? t : parseFloat(t) || undefined)}
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
                                                                    onChangeText={(t) => onChange(t === "" ? undefined : t.endsWith('.') ? t : parseFloat(t) || undefined)}
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
                                                                    onChangeText={(t) => onChange(t === "" ? undefined : t.endsWith('.') ? t : parseFloat(t) || undefined)}
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
                                        onPress={handlePreview}
                                        disabled={isSubmitting || previewMutation.isPending || mutation.isPending || isStockInsufficient || isPreviousSalesLoading}
                                    >
                                        {previewMutation.isPending ? (
                                            <>
                                                <BirdyLoader size={24} color={"#ffffff"} />
                                                <Text className="text-white font-bold">Calculating...</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Icon as={ShoppingCart} size={18} className="text-white" />
                                                <Text className="text-white font-bold">
                                                    {remainingBirdsAfterTransaction === 0 ? "Preview & Close Cycle" : "Preview Sale"}
                                                </Text>
                                            </>
                                        )}
                                    </Button>
                                </View>
                            </>
                        )}
                    </View>
                )}
            </View>

            <RestockModal
                farmerId={farmerId}
                farmerName={farmerName}
                open={showRestockModal}
                onOpenChange={setShowRestockModal}
                onSuccess={() => {
                    utils.officer.farmers.getDetails.invalidate({ farmerId });
                }}
            />

            <CorrectAgeModal
                cycleId={cycleId}
                currentAge={cycleAge}
                open={isAgeModalOpen}
                onOpenChange={setIsAgeModalOpen}
                onSuccess={() => {
                    utils.officer.cycles.getDetails.invalidate({ id: cycleId });
                    utils.officer.cycles.listActive.invalidate();
                    utils.officer.farmers.getDetails.invalidate({ farmerId });

                }}
            />
        </BottomSheetModal>
    );
};
