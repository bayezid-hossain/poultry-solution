import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Bird, Check, ChevronDown, Hash, Plus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";

interface CreateCycleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    onSuccess?: () => void;
}

export function CreateCycleModal({
    open,
    onOpenChange,
    orgId,
    onSuccess,
}: CreateCycleModalProps) {
    const [farmerId, setFarmerId] = useState("");
    const [farmerName, setFarmerName] = useState("");
    const [doc, setDoc] = useState("");
    const [age, setAge] = useState("0");
    const [birdType, setBirdType] = useState("");

    // UI states
    const [isFarmerOpen, setIsFarmerOpen] = useState(false);
    const [isBirdTypeOpen, setIsBirdTypeOpen] = useState(false);
    const [newBirdType, setNewBirdType] = useState("");
    const [error, setError] = useState<string | null>(null);

    const utils = trpc.useUtils();

    // Queries
    const { data: farmersData, isLoading: isLoadingFarmers } = trpc.officer.farmers.listWithStock.useQuery(
        { orgId, pageSize: 100 },
        { enabled: open && !!orgId }
    );
    const farmers = farmersData?.items || [];

    const { data: birdTypes, isLoading: isLoadingBirdTypes } = trpc.officer.docOrders.getBirdTypes.useQuery(undefined, {
        enabled: open,
    });

    useEffect(() => {
        if (open) {
            setFarmerId("");
            setFarmerName("");
            setDoc("");
            setAge("0");
            setError(null);
            setIsFarmerOpen(false);
            setIsBirdTypeOpen(false);
        }
    }, [open]);

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
        if (isNaN(numAge) || numAge < 0 || numAge > 40) {
            setError("Age must be between 0 and 40 days");
            return;
        }
        if (!birdType) {
            setError("Please select a bird type");
            return;
        }

        setError(null);
        mutation.mutate({
            farmerId,
            orgId,
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
                behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                        <View className="p-8 pb-4 flex-row justify-between items-center">
                            <View className="flex-row items-center gap-3">
                                <View className="w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
                                    <Icon as={Plus} size={24} className="text-emerald-500" />
                                </View>
                                <View>
                                    <Text className="text-2xl font-bold text-foreground">Start Cycle</Text>
                                    <Text className="text-sm text-muted-foreground">
                                        Assign birds to a farmer
                                    </Text>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <ScrollView className="p-8 pt-2" bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View className="space-y-6 gap-y-2">
                                {/* Farmer Selection */}
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
                                            <Icon as={ChevronDown} size={20} className={`text-muted-foreground transition-transform ${isFarmerOpen ? 'rotate-180' : ''}`} />
                                        </Pressable>

                                        {/* Modal for Farmer Selection */}
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
                                                                <Text className="text-muted-foreground">No farmers found</Text>
                                                            </View>
                                                        )}
                                                    />
                                                </Pressable>
                                            </Pressable>
                                        </Modal>
                                    </View>
                                </View>

                                {/* DOC & Age */}
                                <View className="flex-row gap-4 -z-10">
                                    <View className="flex-1 gap-2">
                                        <View className="flex-row items-center gap-2 ml-1">
                                            <Icon as={Bird} size={14} className="text-primary" />
                                            <Text className="text-sm font-bold text-foreground">DOC</Text>
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
                                        <View className="flex-row items-center gap-2 ml-1">
                                            <Icon as={Hash} size={14} className="text-muted-foreground" />
                                            <Text className="text-sm font-bold text-foreground">Age (Days)</Text>
                                        </View>
                                        <Input
                                            placeholder="0"
                                            keyboardType="numeric"
                                            value={age}
                                            onChangeText={setAge}
                                            className="h-14 bg-muted/30 border-border/50 text-xl font-mono"
                                        />
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
                                            <Icon as={ChevronDown} size={20} className={`text-muted-foreground transition-transform ${isBirdTypeOpen ? 'rotate-180' : ''}`} />
                                        </Pressable>

                                        {/* Modal for Bird Type Selection */}
                                        <Modal
                                            visible={isBirdTypeOpen}
                                            transparent={true}
                                            animationType="slide"
                                            onRequestClose={() => setIsBirdTypeOpen(false)}
                                        >
                                            <KeyboardAvoidingView
                                                behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        </Modal>
    );
}
