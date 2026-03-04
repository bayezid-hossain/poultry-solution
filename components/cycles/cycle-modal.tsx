import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import DateTimePicker from "@react-native-community/datetimepicker";
import { differenceInDays, format, startOfDay, subDays } from "date-fns";
import { useRouter } from "expo-router";
import { Activity, Bird, Calendar, Check, ChevronDown, ChevronUp, Hash, Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface CycleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    initialFarmer?: {
        id: string;
        name: string;
        organizationId: string;
    };
    onSuccess?: () => void;
}

export function CycleModal({
    open,
    onOpenChange,
    orgId,
    initialFarmer,
    onSuccess,
}: CycleModalProps) {
    const [farmerId, setFarmerId] = useState(initialFarmer?.id || "");
    const [farmerName, setFarmerName] = useState(initialFarmer?.name || "");
    const [doc, setDoc] = useState("");
    const [age, setAge] = useState("1");
    const [birdType, setBirdType] = useState("");
    const [hatchDate, setHatchDate] = useState(startOfDay(new Date()));

    // UI states
    const [isFarmerOpen, setIsFarmerOpen] = useState(false);
    const [isBirdTypeOpen, setIsBirdTypeOpen] = useState(false);
    const [newBirdType, setNewBirdType] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const utils = trpc.useUtils();

    // Queries
    const { data: farmersData, isLoading: isLoadingFarmers } = trpc.officer.farmers.listWithStock.useQuery(
        { orgId, pageSize: 100 },
        { enabled: open && !!orgId && !initialFarmer }
    );
    const farmers = farmersData?.items || [];

    const { data: birdTypes, isLoading: isLoadingBirdTypes } = trpc.officer.docOrders.getBirdTypes.useQuery(undefined, {
        enabled: open,
    });

    useEffect(() => {
        if (open) {
            setFarmerId(initialFarmer?.id || "");
            setFarmerName(initialFarmer?.name || "");
            setDoc("");
            setAge("1");
            setHatchDate(startOfDay(new Date()));
            setError(null);
            setIsFarmerOpen(false);
            setIsBirdTypeOpen(false);
            setShowDatePicker(false);
        }
    }, [open, initialFarmer]);

    // Set default bird type when data loads
    useEffect(() => {
        if (open && birdTypes && birdTypes.length > 0 && !birdType) {
            const oldest = birdTypes[birdTypes.length - 1];
            if (oldest) setBirdType(oldest.name);
        }
    }, [open, birdTypes, birdType]);

    const createBirdTypeMutation = trpc.officer.docOrders.createBirdType.useMutation({
        onSuccess: (data) => {
            utils.officer.docOrders.getBirdTypes.invalidate();
            setBirdType(data.name);
            setNewBirdType("");
            setIsBirdTypeOpen(false);
            toast.success("Bird type added");
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to add bird type");
        }
    });

    const mutation = trpc.officer.cycles.create.useMutation({
        onSuccess: () => {
            toast.success("Cycle started successfully");
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleAgeChange = (text: string) => {
        const sanitized = text.replace(/[^0-9]/g, "");
        setAge(sanitized);

        if (sanitized) {
            const numAge = parseInt(sanitized, 10);
            if (numAge >= 1 && numAge <= 40) {
                setHatchDate(subDays(startOfDay(new Date()), numAge - 1));
            }
        } else {
            setHatchDate(startOfDay(new Date()));
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const today = startOfDay(new Date());
            const pickedDate = startOfDay(selectedDate);
            const diff = differenceInDays(today, pickedDate);

            // Limit to 1-40
            const clampedDiff = Math.max(0, Math.min(39, diff));
            setAge((clampedDiff + 1).toString());
            setHatchDate(subDays(today, clampedDiff));
        }
    };

    const handleSubmit = () => {
        if (!farmerId) {
            setError("Please select a farmer");
            return;
        }

        const numDoc = parseInt(doc, 10);
        const numAge = parseInt(age, 10);

        if (isNaN(numDoc) || numDoc <= 0) {
            setError("Please enter a valid bird count (DOC)");
            return;
        }
        if (isNaN(numAge) || numAge < 1 || numAge > 40) {
            setError("Age must be between 1 and 40 days");
            return;
        }
        if (!birdType) {
            setError("Please select a bird type");
            return;
        }

        setError(null);
        mutation.mutate({
            farmerId,
            orgId: initialFarmer?.organizationId || orgId,
            doc: numDoc,
            age: numAge,
            birdType: birdType,
            name: farmerName,
        });
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                className="flex-1"
            >
                <Pressable
                    className="flex-1 bg-black/60 justify-end"
                    onPress={() => onOpenChange(false)}
                >
                    <Pressable
                        className="w-full bg-card rounded-t-[40px] overflow-hidden max-h-[90%]"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View className="p-8 pb-4 flex-row justify-between items-start">
                            <View className="flex-row items-center gap-3 flex-1 pr-4">
                                <View className="w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
                                    <Icon as={initialFarmer ? Activity : Plus} size={24} className="text-emerald-500" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-2xl font-bold text-foreground">
                                        {initialFarmer ? "Start New Cycle" : "Start Cycle"}
                                    </Text>
                                    <View>
                                        {initialFarmer ? (
                                            <Pressable
                                                onPress={() => {
                                                    onOpenChange(false);
                                                    router.push({ pathname: "/farmer/[id]", params: { id: farmerId } } as any);
                                                }}
                                                className="active:opacity-60"
                                            >
                                                <Text className="text-sm text-muted-foreground active:text-primary" numberOfLines={2}>
                                                    Launch production for {farmerName}
                                                </Text>
                                            </Pressable>
                                        ) : (
                                            <Text className="text-sm text-muted-foreground">
                                                Assign birds to a farmer
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <ScrollView className="p-8 pt-2" bounces={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                            <View className="space-y-6 gap-y-2">
                                {/* Farmer Selection (Only if not initialFarmer) */}
                                {!initialFarmer && (
                                    <View className="gap-2 z-[60]">
                                        <Text className="text-sm font-bold text-foreground ml-1">Farmer</Text>
                                        <View className="relative">
                                            <Pressable
                                                onPress={() => {
                                                    setIsFarmerOpen(!isFarmerOpen);
                                                    setIsBirdTypeOpen(false);
                                                }}
                                                className="h-14 bg-muted/30 border border-border/50 rounded-xl px-4 flex-row items-center justify-between active:bg-muted/50"
                                            >
                                                <Text className={`text-base font-medium ${farmerId ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    {farmerName || (isLoadingFarmers ? "Loading farmers..." : "Select Farmer")}
                                                </Text>
                                                <Icon as={isFarmerOpen ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                                            </Pressable>

                                            <Modal
                                                visible={isFarmerOpen}
                                                transparent={true}
                                                animationType="slide"
                                                onRequestClose={() => setIsFarmerOpen(false)}
                                            >
                                                <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setIsFarmerOpen(false)}>
                                                    <Pressable className="bg-card rounded-t-3xl h-[60%] p-4" onPress={(e) => e.stopPropagation()}>
                                                        <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-border/50">
                                                            <Text className="text-xl font-bold">Select Farmer</Text>
                                                            <Button variant="ghost" size="icon" onPress={() => setIsFarmerOpen(false)}>
                                                                <Icon as={X} size={20} className="text-muted-foreground" />
                                                            </Button>
                                                        </View>
                                                        <FlatList
                                                            data={farmers}
                                                            keyExtractor={(f) => f.id}
                                                            renderItem={({ item: f }) => (
                                                                <Pressable
                                                                    onPress={() => {
                                                                        setFarmerId(f.id);
                                                                        setFarmerName(f.name);
                                                                        setIsFarmerOpen(false);
                                                                    }}
                                                                    className={`p-4 border-b border-border/20 active:bg-muted/30 ${farmerId === f.id ? 'bg-primary/5' : ''}`}
                                                                >
                                                                    <View className="flex-row items-center justify-between">
                                                                        <View>
                                                                            <Text className={`font-medium ${farmerId === f.id ? 'text-primary' : 'text-foreground'}`}>
                                                                                {f.name}
                                                                            </Text>
                                                                            <Text className="text-xs text-muted-foreground">Stock: {f.mainStock}</Text>
                                                                        </View>
                                                                        {farmerId === f.id && (
                                                                            <Icon as={Check} size={16} className="text-primary" />
                                                                        )}
                                                                    </View>
                                                                </Pressable>
                                                            )}
                                                            ListEmptyComponent={() => (
                                                                <View className="p-8 items-center">
                                                                    <Text className="text-muted-foreground">{isLoadingFarmers ? "Loading farmers..." : "No farmers found"}</Text>
                                                                </View>
                                                            )}
                                                        />
                                                    </Pressable>
                                                </Pressable>
                                            </Modal>
                                        </View>
                                    </View>
                                )}

                                {/* DOC & Age */}
                                <View className="flex-row gap-4 -z-10">
                                    <View className="flex-1 gap-2">
                                        <View className="flex-row items-center gap-2 ml-1">
                                            <Icon as={Bird} size={14} className="text-primary" />
                                            <Text className="text-sm font-bold text-foreground">Initial Birds (DOC)</Text>
                                        </View>
                                        <Input
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={doc}
                                            onChangeText={setDoc}
                                            className="h-14 bg-muted/30 border-border/50 text-xl font-mono text-primary"
                                        />
                                    </View>
                                    <View className="flex-1 gap-2">
                                        <View className="flex-row items-center justify-between ml-1">
                                            <View className="flex-row items-center gap-2">
                                                <Icon as={Hash} size={14} className="text-muted-foreground" />
                                                <Text className="text-sm font-bold text-foreground">Initial Age (Days)</Text>
                                            </View>
                                            <Pressable
                                                onPress={() => setShowDatePicker(true)}
                                                className="active:opacity-50"
                                            >
                                                <Icon as={Calendar} size={18} className="text-primary" />
                                            </Pressable>
                                        </View>
                                        <View className="relative">
                                            <Input
                                                placeholder="0"
                                                keyboardType="numeric"
                                                value={age}
                                                onChangeText={handleAgeChange}
                                                className="h-14 bg-muted/30 border-border/50 text-xl font-mono pr-32"
                                            />
                                            <Pressable
                                                onPress={() => setShowDatePicker(true)}
                                                className="absolute right-0 top-0 bottom-0 justify-center pr-4 active:opacity-50"
                                            >
                                                <View className="flex-row items-center gap-1.5 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20">
                                                    <Icon as={Calendar} size={12} className="text-primary" />
                                                    <Text className="text-xs text-primary font-bold">
                                                        Start Date: {format(hatchDate, "MMM dd")}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        </View>

                                        {showDatePicker && (
                                            <DateTimePicker
                                                value={hatchDate}
                                                mode="date"
                                                display="default"
                                                maximumDate={startOfDay(new Date())}
                                                minimumDate={subDays(startOfDay(new Date()), 39)}
                                                onChange={handleDateChange}
                                            />
                                        )}
                                    </View>
                                </View>

                                {/* Bird Type */}
                                <View className="gap-2 z-50">
                                    <View className="flex-row items-center gap-2 ml-1">
                                        <Icon as={Bird} size={14} className="text-amber-500" />
                                        <Text className="text-sm font-bold text-foreground">Bird Type</Text>
                                    </View>

                                    <View className="relative">
                                        <Pressable
                                            onPress={() => {
                                                setIsBirdTypeOpen(!isBirdTypeOpen);
                                                setIsFarmerOpen(false);
                                            }}
                                            className="h-14 bg-muted/30 border border-border/50 rounded-xl px-4 flex-row items-center justify-between active:bg-muted/50"
                                        >
                                            <Text className={`text-base font-medium ${birdType ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {birdType || (isLoadingBirdTypes ? "Loading types..." : "Select Bird Type")}
                                            </Text>
                                            <Icon as={isBirdTypeOpen ? ChevronUp : ChevronDown} size={20} className="text-muted-foreground" />
                                        </Pressable>

                                        <Modal
                                            visible={isBirdTypeOpen}
                                            transparent={true}
                                            animationType="slide"
                                            onRequestClose={() => setIsBirdTypeOpen(false)}
                                        >
                                            <KeyboardAvoidingView
                                                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                                                className="flex-1"
                                            >
                                                <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setIsBirdTypeOpen(false)}>
                                                    <Pressable className="bg-card rounded-t-3xl h-[50%] p-4 flex-col" onPress={(e) => e.stopPropagation()}>
                                                        <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-border/50">
                                                            <Text className="text-xl font-bold">Select Bird Type</Text>
                                                            <Button variant="ghost" size="icon" onPress={() => setIsBirdTypeOpen(false)}>
                                                                <Icon as={X} size={20} className="text-muted-foreground" />
                                                            </Button>
                                                        </View>
                                                        <FlatList
                                                            data={birdTypes || []}
                                                            keyExtractor={(t, idx) => t.id || idx.toString()}
                                                            className="flex-1"
                                                            renderItem={({ item: type }: any) => (
                                                                <Pressable
                                                                    onPress={() => {
                                                                        setBirdType(type.name);
                                                                        setIsBirdTypeOpen(false);
                                                                    }}
                                                                    className={`p-4 border-b border-border/20 active:bg-muted/30 ${birdType === type.name ? 'bg-primary/5' : ''}`}
                                                                >
                                                                    <View className="flex-row items-center justify-between">
                                                                        <Text className={`font-medium ${birdType === type.name ? 'text-primary' : 'text-foreground'}`}>
                                                                            {type.name}
                                                                        </Text>
                                                                        {birdType === type.name && (
                                                                            <Icon as={Bird} size={16} className="text-primary" />
                                                                        )}
                                                                    </View>
                                                                </Pressable>
                                                            )}
                                                            ListEmptyComponent={() => (
                                                                <View className="p-4 items-center">
                                                                    <Text className="text-muted-foreground">No bird types found</Text>
                                                                </View>
                                                            )}
                                                        />
                                                        <View className="p-4 border-t border-border/20 flex-row gap-2 bg-muted/10 items-center">
                                                            <Input
                                                                className="flex-1 h-12 bg-background"
                                                                placeholder="New bird type..."
                                                                value={newBirdType}
                                                                onChangeText={setNewBirdType}
                                                            />
                                                            <Button
                                                                onPress={() => createBirdTypeMutation.mutate({ name: newBirdType.trim() })}
                                                                disabled={!newBirdType.trim() || createBirdTypeMutation.isPending}
                                                                className="h-12 px-6 items-center justify-center bg-primary"
                                                            >
                                                                <Text className="text-primary-foreground font-bold">
                                                                    {createBirdTypeMutation.isPending ? "Adding..." : "Add"}
                                                                </Text>
                                                            </Button>
                                                        </View>
                                                    </Pressable>
                                                </Pressable>
                                            </KeyboardAvoidingView>
                                        </Modal>
                                    </View>
                                </View>

                                {error && (
                                    <View className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 mt-2">
                                        <Text className="text-destructive text-sm text-center font-bold">{error}</Text>
                                    </View>
                                )}

                                <View className="flex-row gap-4 pt-4 pb-4 -z-10">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-14 rounded-2xl border-border/50"
                                        onPress={() => onOpenChange(false)}
                                    >
                                        <Text className="text-lg font-bold">Cancel</Text>
                                    </Button>
                                    <Button
                                        className="flex-1 h-14 bg-emerald-500 rounded-2xl shadow-none"
                                        onPress={handleSubmit}
                                        disabled={mutation.isPending}
                                    >
                                        <Text className="text-white text-lg font-bold">
                                            {mutation.isPending ? "Starting..." : "Start Batch"}
                                        </Text>
                                    </Button>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
