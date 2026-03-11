import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { ArrowLeft, Banknote, Bird, Box, CalendarIcon, FileText, Settings, ShoppingCart, Truck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { ActivityIndicator, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";
import { ConfirmModal } from "./confirm-modal";
import { EditSaleAgeModal } from "./edit-sale-age-modal";
import { SaleDetailsContent } from "./sale-details-content";
import { SaleDiffModal } from "./sale-diff-modal";
import { getFeedDiffFields } from "./sale-event-card";
import { FarmerInfoHeader, FeedFieldArray, SaleMetricsBar } from "./sale-form-sections";

import DateTimePicker from "@react-native-community/datetimepicker";

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
    saleDate: z.string().min(1, "Sale date is required"),
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
    saleAge: z.coerce.number().int().positive().optional(),
    officialInputDate: z.string().optional(),
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
    const [showConfirm, setShowConfirm] = useState(false);
    const [showEditAge, setShowEditAge] = useState(false);
    const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
    const [showDiffModal, setShowDiffModal] = useState(false);

    // Priority: explicit officialInputDate → cycle start date (startDate for history, createdAt for active)
    // cycleContext is canonical (backend-computed), with direct relations as defensive fallbacks
    const officialDocDate = saleEvent.cycleContext?.officialInputDate
        || saleEvent.history?.officialInputDate
        || saleEvent.cycle?.officialInputDate
        || saleEvent.cycleContext?.createdAt
        || saleEvent.history?.startDate
        || saleEvent.cycle?.createdAt;

    const defaultValues: FormValues = {
        saleDate: saleEvent.saleDate ? format(new Date(saleEvent.saleDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
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
        saleAge: latestReport?.age ?? saleEvent.age ?? undefined,
        officialInputDate: officialDocDate
            ? format(new Date(officialDocDate), "yyyy-MM-dd")
            : undefined,
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

    useEffect(() => {
        if (calculatedTotal > 0 && calculatedTotal !== form.getValues("cashReceived")) {
            form.setValue("cashReceived", calculatedTotal, { shouldValidate: true });
        }
    }, [calculatedTotal, form]);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showOfficialDatePicker, setShowOfficialDatePicker] = useState(false);

    const onSaleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            form.setValue('saleDate', format(selectedDate, 'yyyy-MM-dd'));
        }
    };

    const onOfficialDateChange = (event: any, selectedDate?: Date) => {
        setShowOfficialDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            form.setValue('officialInputDate', format(selectedDate, 'yyyy-MM-dd'));
        }
    };

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
            const newStockBags = parseFloat(Math.max(0, baselineStockBags - consumedDelta).toFixed(2));

            if (Number(currentStock[stockIndex].bags) !== newStockBags) {
                currentStock[stockIndex] = { ...currentStock[stockIndex], bags: newStockBags };
                form.setValue("feedStock", currentStock, { shouldValidate: true, shouldDirty: true });
            }
        }
    };

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
            utils.officer.cycles.invalidate();
            utils.management.cycles.invalidate();
            utils.officer.farmers.invalidate();
            utils.management.farmers.invalidate();
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
        const saleDateWithTime = new Date(values.saleDate);
        const now = new Date();
        saleDateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

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
            saleDate: saleDateWithTime,
            recoveryPrice: values.recoveryPrice,
            feedPricePerBag: values.feedPricePerBag,
            docPricePerBird: values.docPricePerBird,
            saleAge: values.saleAge,
            officialInputDate: values.officialInputDate ? new Date(values.officialInputDate) : undefined,
        });
    };

    const updateOfficialDateMutation = trpc.officer.cycles.updateOfficialInputDate.useMutation();

    const onSubmit = async (values: FormValues) => {
        const saleDateWithTime = new Date(values.saleDate);
        const now = new Date();
        saleDateWithTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

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
            saleAge: values.saleAge,
            saleDate: saleDateWithTime,
            officialInputDate: values.officialInputDate ? new Date(values.officialInputDate) : undefined,
            historyId: saleEvent.historyId || null,
        });
    };

    const remainingBirdsAfterAdjustment = Math.max(0,
        (saleEvent.cycleContext?.doc || saleEvent.houseBirds || 0) -
        ((saleEvent.cycleContext?.cumulativeBirdsSold || saleEvent.birdsSold) - saleEvent.birdsSold) -
        wBirdsSold -
        wMortality
    );

    const handleConfirmClick = () => {
        form.handleSubmit((values: any) => {
            const v = values as FormValues;
            // Check if sale date changed (compare against the version's own sale date, not just the parent event)
            const baselineSaleDate = latestReport?.saleDate || saleEvent.saleDate;
            const originalDate = baselineSaleDate ? format(new Date(baselineSaleDate), "yyyy-MM-dd") : "";
            if (v.saleDate !== originalDate) {
                setShowDateChangeWarning(true);
                return;
            }
            proceedAfterDateCheck(v);
        })();
    };

    const proceedAfterDateCheck = (v: FormValues) => {
        if (saleEvent.historyId && remainingBirdsAfterAdjustment > 0) {
            setShowConfirm(true);
            return;
        }
        if (!saleEvent.historyId && remainingBirdsAfterAdjustment === 0) {
            setShowConfirm(true);
            return;
        }
        // Show diff modal before final save
        setShowDiffModal(true);
    };

    // Build diff fields comparing original values with current form values
    const buildDiffFields = () => {
        const baseline = latestReport || saleEvent;
        const values = form.getValues();
        const baselineSaleDate = baseline.saleDate || saleEvent.saleDate;
        const baselineOfficialDate = baseline.officialInputDate || saleEvent.cycleContext?.officialInputDate;
        return [
            { label: "Birds Sold", before: baseline.birdsSold, after: values.birdsSold, type: "number" as const },
            { label: "Mortality", before: baseline.totalMortality ?? saleEvent.totalMortality, after: values.totalMortality, type: "number" as const, invertColor: true },
            { label: "Weight", before: parseFloat(baseline.totalWeight), after: values.totalWeight, type: "number" as const, unit: "kg" },
            { label: "Price/kg", before: parseFloat(baseline.pricePerKg), after: values.pricePerKg, type: "number" as const, unit: "\u09f3" },
            { label: "Total Amount", before: (parseFloat(baseline.totalWeight) * parseFloat(baseline.pricePerKg)).toFixed(0), after: (values.totalWeight * values.pricePerKg).toFixed(0), type: "number" as const, unit: "\u09f3" },
            { label: "Cash Rcvd", before: parseFloat(baseline.cashReceived || "0"), after: values.cashReceived, type: "number" as const, unit: "৳" },
            { label: "Deposit", before: parseFloat(baseline.depositReceived || "0"), after: values.depositReceived, type: "number" as const, unit: "৳" },
            { label: "Medicine", before: parseFloat(baseline.medicineCost || "0"), after: values.medicineCost, type: "number" as const, unit: "৳" },
            { label: "Sale Date", before: baselineSaleDate, after: values.saleDate, type: "date" as const },
            { label: "DOC Date", before: baselineOfficialDate, after: values.officialInputDate, type: "date" as const },
            { label: "Age", before: baseline.age ?? saleEvent.age, after: values.saleAge, type: "number" as const, unit: "days" },
            { label: "Location", before: saleEvent.location, after: values.location, type: "text" as const },
            { label: "Party", before: saleEvent.party, after: values.party, type: "text" as const },
            { label: "Rec. Price", before: baseline.recoveryPrice ?? saleEvent.cycleContext?.recoveryPrice, after: values.recoveryPrice, type: "number" as const, unit: "৳" },
            { label: "Feed/Bag", before: baseline.feedPriceUsed ?? saleEvent.cycleContext?.feedPriceUsed, after: values.feedPricePerBag, type: "number" as const, unit: "৳" },
            { label: "DOC Price", before: baseline.docPriceUsed ?? saleEvent.cycleContext?.docPriceUsed, after: values.docPricePerBird, type: "number" as const, unit: "৳" },
            ...getFeedDiffFields(baseline.feedConsumed || "[]", values.feedConsumed, "Consumed"),
            ...getFeedDiffFields(baseline.feedStock || "[]", values.feedStock, "Returned")
        ];
    };

    const isLatest = saleEvent.isLatestInCycle || false;
    const cumulativeWeight = saleEvent.cycleContext?.totalWeight || 0;
    const cumulativeBirdsSold = saleEvent.cycleContext?.cumulativeBirdsSold || 0;

    const avgWeightDisplay = (isLatest && cumulativeWeight > 0 && cumulativeBirdsSold > 0)
        ? (cumulativeWeight / cumulativeBirdsSold).toFixed(2)
        : (wBirdsSold > 0 ? (wWeight / wBirdsSold).toFixed(2) : "0.00");

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange} fullScreen>
            <View className="px-4 py-3 border-b border-border/50 bg-card/50 flex-row items-center justify-between">
                <Text className="text-lg font-bold">Adjust Sale</Text>
                <Button variant="ghost" className="h-8 px-2" onPress={() => onOpenChange(false)}>
                    <Text className="text-primary font-bold">Close</Text>
                </Button>
            </View>

            {step === "preview" && previewData ? (
                <View className="flex-1">
                    <ScrollView className="flex-1" contentContainerClassName="p-4 pb-8" keyboardShouldPersistTaps="handled">
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
                            onPress={handleConfirmClick}
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
                    <ScrollView className="flex-1" contentContainerClassName="p-4 pb-8 gap-6" keyboardShouldPersistTaps="handled">
                        <FarmerInfoHeader
                            farmerName={saleEvent.farmerName || "Farmer"}
                            farmerLocation={saleEvent.location}
                            farmerMobile={form.getValues("farmerMobile")}
                            cycleAge={saleEvent.cycleContext?.age || 0}
                            saleAge={form.watch("saleAge") || saleEvent.age || 0}
                            colorScheme="orange"
                            onEditAgePress={() => setShowEditAge(true)}
                        />

                        {/* SECTION 1: SALE BASICS */}
                        <View className="space-y-4 gap-y-2">
                            <View className="flex-row items-center gap-2 ml-1">
                                <Icon as={Truck} size={16} className="text-muted-foreground" />
                                <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Sale Basics</Text>
                            </View>

                            {/* Sale Date & DOC Date */}
                            <View className="flex-row gap-4 px-1">
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Sale Date</Text>
                                    <Controller
                                        control={form.control}
                                        name="saleDate"
                                        render={({ field: { value } }) => (
                                            <Pressable
                                                onPress={() => setShowDatePicker(true)}
                                                className="h-12 bg-muted/40 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50"
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
                                            minimumDate={saleEvent.previousSaleDate ? addDays(new Date(saleEvent.previousSaleDate), 0) : undefined}
                                        />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">DOC Date</Text>
                                    <Controller
                                        control={form.control}
                                        name="officialInputDate"
                                        render={({ field: { value } }) => (
                                            <Pressable
                                                onPress={() => setShowOfficialDatePicker(true)}
                                                className="h-12 bg-muted/40 border border-border/50 rounded-md px-3 flex-row items-center justify-between active:bg-muted/50"
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
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Location</Text>
                                    <Controller
                                        control={form.control}
                                        name="location"
                                        render={({ field: { onChange, value } }) => (
                                            <Input
                                                ref={locationRef}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="e.g. Bhaluka"
                                                className="h-12 bg-muted/40 border-border/50 text-base"
                                                returnKeyType="next"
                                                onSubmitEditing={() => partyRef.current?.focus()}
                                            />
                                        )}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Party</Text>
                                    <Controller
                                        control={form.control}
                                        name="party"
                                        render={({ field: { onChange, value } }) => (
                                            <Input
                                                ref={partyRef}
                                                value={value}
                                                onChangeText={onChange}
                                                placeholder="e.g. Habib"
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
                                        <Text className="font-mono font-bold text-xl text-foreground">{saleEvent.houseBirds}</Text>
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
                                                keyboardType="numeric"
                                                value={value?.toString() || ""}
                                                onChangeText={(v) => onChange(parseInt(v) || 0)}
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-xl text-center"
                                                returnKeyType="next"
                                                onSubmitEditing={() => totalMortalityRef.current?.focus()}
                                            />
                                        )}
                                    />
                                </View>

                                <View className="flex-[1.5]">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Total Mortality</Text>
                                    <Controller
                                        control={form.control}
                                        name="totalMortality"
                                        render={({ field: { onChange, value } }) => {
                                            const originalMortality = latestReport ? (latestReport.totalMortality ?? saleEvent.totalMortality ?? 0) : (saleEvent.totalMortality ?? 0);
                                            const currentTotal = value || 0;
                                            const delta = currentTotal - originalMortality;

                                            return (
                                                <View>
                                                    <Input
                                                        ref={totalMortalityRef}
                                                        keyboardType="numeric"
                                                        value={value?.toString() || ""}
                                                        onChangeText={(v) => onChange(parseInt(v) || 0)}
                                                        className="h-12 bg-muted/40 border-border/50 font-mono text-xl text-center"
                                                        returnKeyType="next"
                                                        onSubmitEditing={() => totalWeightRef.current?.focus()}
                                                    />
                                                    {delta !== 0 && (
                                                        <Text className={`text-[10px] font-medium mt-1 ml-1 ${delta > 0 ? "text-destructive" : "text-amber-600"}`}>
                                                            {delta > 0 ? `+${delta} new deaths` : `${delta} correction`}
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Remaining Birds Banner */}
                            <View className="flex-row items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <Icon as={Bird} size={20} className="text-blue-500" />
                                <View>
                                    <Text className="font-bold text-blue-700 dark:text-blue-300">Remaining Birds</Text>
                                    <Text className="text-xs text-blue-600/80 dark:text-blue-400">After adjustment: {remainingBirdsAfterAdjustment}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="h-[1px] bg-border/50" />

                        {/* SECTION 2: FINANCIALS */}
                        <View className="space-y-4 gap-y-2">
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
                                                keyboardType="decimal-pad"
                                                value={value?.toString()}
                                                onChangeText={(v) => onChange(v === "" || v === "." ? 0 : v.endsWith('.') ? v : (parseFloat(v) || 0))}
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                returnKeyType="next"
                                                onSubmitEditing={() => pricePerKgRef.current?.focus()}
                                            />
                                        )}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Price/kg (৳)</Text>
                                    <Controller
                                        control={form.control}
                                        name="pricePerKg"
                                        render={({ field: { onChange, value } }) => (
                                            <Input
                                                ref={pricePerKgRef}
                                                keyboardType="decimal-pad"
                                                value={value?.toString()}
                                                onChangeText={(v) => onChange(v === "" || v === "." ? 0 : v.endsWith('.') ? v : (parseFloat(v) || 0))}
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
                                                returnKeyType="next"
                                                onSubmitEditing={() => adjustmentNoteRef.current?.focus()}
                                            />
                                        )}
                                    />
                                </View>
                            </View>

                            <View className="mt-1">
                                <SaleMetricsBar
                                    avgWeight={avgWeightDisplay}
                                    totalAmount={calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                />
                            </View>

                            {/* Payments */}
                            <View className="flex-row gap-4 px-1 pt-1">
                                <View className="flex-1">
                                    <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Cash Rcvd (৳)</Text>
                                    <Controller
                                        control={form.control}
                                        name="cashReceived"
                                        render={({ field: { onChange, value } }) => (
                                            <Input
                                                value={value?.toString() || ""}
                                                onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
                                                keyboardType="number-pad"
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
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
                                                value={value?.toString() || ""}
                                                onChangeText={(t) => onChange(t === "" || t === "." ? 0 : t.endsWith('.') ? t : (parseFloat(t) || 0))}
                                                keyboardType="number-pad"
                                                className="h-12 bg-muted/40 border-border/50 font-mono text-lg"
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

                            {remainingBirdsAfterAdjustment === 0 && (
                                <View className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-2">
                                    <Text className="text-sm font-bold text-destructive mb-1">Cycle Closing Warning!</Text>
                                    <Text className="text-xs text-destructive/80">
                                        This is the last sale. Please enter the TOTAL feed consumed for the ENTIRE cycle.
                                    </Text>
                                </View>
                            )}

                            <FeedFieldArray
                                control={form.control}
                                fieldArray={feedConsumedArray}
                                namePrefix="feedConsumed"
                                label={remainingBirdsAfterAdjustment === 0 ? "TOTAL Consumed" : "Consumed So Far"}
                                description={remainingBirdsAfterAdjustment === 0 ? "Total sacks eaten this full cycle." : "Document sacks eaten."}
                                onBagsChange={handleFeedAdjustment}
                            />

                            <View className="h-[1px] bg-border/50 my-2" />

                            <FeedFieldArray
                                control={form.control}
                                fieldArray={feedStockArray}
                                namePrefix="feedStock"
                                label="Leftover Feed Return"
                                description="Inventory returned back to main stock."
                            />
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

                        {/* SECTION 5: ADJUSTMENT NOTE */}
                        <View className="space-y-2">
                            <View className="flex-row items-center gap-2 ml-1">
                                <Icon as={FileText} size={16} className="text-muted-foreground" />
                                <Text className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Adjustment Note</Text>
                            </View>
                            <View className="px-1">
                                <Controller
                                    control={form.control}
                                    name="adjustmentNote"
                                    render={({ field: { onChange, value } }) => (
                                        <Input
                                            ref={adjustmentNoteRef}
                                            value={value}
                                            onChangeText={onChange}
                                            placeholder="e.g. Buyer disputed weight"
                                            className="h-12 bg-muted/40 border-border/50 text-base"
                                            returnKeyType="done"
                                            onSubmitEditing={remainingBirdsAfterAdjustment === 0 ? handlePreview : handleConfirmClick}
                                        />
                                    )}
                                />
                            </View>
                        </View>
                    </ScrollView>

                    <View className="p-4 border-t border-border/50 bg-card">
                        <Button
                            className="h-14 flex-row gap-2 bg-emerald-600 active:bg-emerald-700"
                            onPress={handlePreview}
                            disabled={generateReport.isPending || previewMutation.isPending || updateOfficialDateMutation.isPending}
                        >
                            {(generateReport.isPending || previewMutation.isPending || updateOfficialDateMutation.isPending) ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Icon as={ShoppingCart} className="text-white" size={20} />
                            )}
                            <Text className="text-white font-bold text-lg">
                                {generateReport.isPending ? "Saving..." : previewMutation.isPending ? "Loading Preview..." : "Preview Changes"}
                            </Text>
                        </Button>
                    </View>
                </View>
            )}

            <ConfirmModal
                visible={showConfirm}
                destructive
                title={saleEvent.historyId ? "Reopen Cycle?" : "Close Cycle?"}
                description={
                    saleEvent.historyId
                        ? `This adjustment results in ${remainingBirdsAfterAdjustment} remaining birds.\n\nThe ended cycle will be reopened as active and feed stock restored.\n\nAre you sure you want to continue?`
                        : `This adjustment results in ${remainingBirdsAfterAdjustment} remaining birds.\n\nThe active cycle will be closed.\n\nAre you sure you want to continue?`
                }
                confirmText={saleEvent.historyId ? "Reopen & Save" : "Close & Save"}
                onCancel={() => setShowConfirm(false)}
                onConfirm={() => {
                    setShowConfirm(false);
                    form.handleSubmit((values: any) => onSubmit(values as FormValues))();
                }}
            />

            <EditSaleAgeModal
                currentAge={form.watch("saleAge") || saleEvent.age || 0}
                open={showEditAge}
                onOpenChange={setShowEditAge}
                onSave={(newAge) => form.setValue("saleAge", newAge, { shouldValidate: true })}
            />

            {/* Sale Date Change Warning */}
            <ConfirmModal
                visible={showDateChangeWarning}
                title="Sale Date Changed"
                description={`You changed the sale date from ${saleEvent.saleDate ? format(new Date(saleEvent.saleDate), "dd MMM yyyy") : "N/A"} to ${form.getValues("saleDate") ? format(new Date(form.getValues("saleDate")), "dd MMM yyyy") : "N/A"}.\n\nThis sale will now appear under the new date group.`}
                confirmText="Continue"
                cancelText="Go Back"
                onConfirm={() => {
                    setShowDateChangeWarning(false);
                    const v = form.getValues();
                    proceedAfterDateCheck(v);
                }}
                onCancel={() => setShowDateChangeWarning(false)}
            />

            {/* Changes Diff Modal */}
            <SaleDiffModal
                visible={showDiffModal}
                title="Confirm Changes"
                description="Review all modifications before saving."
                fields={buildDiffFields()}
                confirmText="Save Changes"
                cancelText="Go Back"
                isLoading={generateReport.isPending}
                onConfirm={() => {
                    setShowDiffModal(false);
                    form.handleSubmit((values: any) => onSubmit(values as FormValues))();
                }}
                onCancel={() => setShowDiffModal(false)}
            />
        </BottomSheetModal>
    );
};
