import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { Activity, Bird, ChevronDown, Hash, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { toast, Toaster } from "sonner-native";

interface StartCycleModalProps {
    farmer: {
        id: string;
        name: string;
        organizationId: string;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function StartCycleModal({
    farmer,
    open,
    onOpenChange,
    onSuccess,
}: StartCycleModalProps) {
    const [doc, setDoc] = useState("");
    const [age, setAge] = useState("0");
    const [birdType, setBirdType] = useState("");
    const [isBirdTypeOpen, setIsBirdTypeOpen] = useState(false);
    const [newBirdType, setNewBirdType] = useState("");

    const router = useRouter();
    const utils = trpc.useUtils();

    // Fetch available bird types from DB
    const { data: birdTypes, isLoading: isLoadingBirdTypes } = trpc.officer.docOrders.getBirdTypes.useQuery(undefined, {
        enabled: open,
    });

    useEffect(() => {
        if (open) {
            setDoc("");
            setAge("0");
            setIsBirdTypeOpen(false);
        }
    }, [open]);

    // Set default bird type when data loads
    useEffect(() => {
        if (open && birdTypes && birdTypes.length > 0 && !birdType) {
            // Select the oldest created type by default (assuming fetched order or sort)
            // The query sorts by desc(createdAt), so the LAST item is the oldest.
            // Wait, the requirement says "oldest one will be default".
            // If the query returns ordered by DESC createdAt, then the last element is the oldest.
            // If it returns ordered by ASC createdAt, then the first element is the oldest.
            // Let's check the query: `orderBy(desc(birdTypes.createdAt))` => Newest first.
            // So we should pick the LAST element for "Oldest". 
            // However, typically "default" implies the most common one which might be the first created (base type).
            // Let's safe pick the last one if we want "oldest".
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
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            toast.error(err.message);
        },
    });

    const handleSubmit = () => {
        const numDoc = parseInt(doc, 10);
        const numAge = parseInt(age, 10);

        if (isNaN(numDoc) || numDoc <= 0) {
            toast.error("Please enter a valid bird count (DOC)");
            return;
        }
        if (isNaN(numAge) || numAge < 0 || numAge > 40) {
            toast.error("Age must be between 0 and 40 days");
            return;
        }
        if (!birdType) {
            toast.error("Please select a bird type");
            return;
        }
        mutation.mutate({
            // Name is optional now, server will default to Farmer Name
            farmerId: farmer.id,
            orgId: farmer.organizationId,
            doc: numDoc,
            age: numAge,
            birdType: birdType,
            name: farmer.name,
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
                        className="w-full bg-card rounded-t-[40px] overflow-hidden"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View className="p-8 pb-4 flex-row justify-between items-center">
                            <View className="flex-row items-center gap-3">
                                <View className="w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
                                    <Icon as={Activity} size={24} className="text-emerald-500" />
                                </View>
                                <View>
                                    <Text className="text-2xl font-bold text-foreground">Start New Cycle</Text>
                                    <Pressable
                                        onPress={() => {
                                            onOpenChange(false);
                                            router.push({ pathname: "/farmer/[id]", params: { id: farmer.id } } as any);
                                        }}
                                        className="active:opacity-60"
                                    >
                                        <Text className="text-sm text-muted-foreground active:text-primary">
                                            Launch production for {farmer.name}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <ScrollView className="p-8 pt-2" bounces={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                            <View className="space-y-6 gap-y-2">
                                <View className="flex-row gap-4">
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
                                        <View className="flex-row items-center gap-2 ml-1">
                                            <Icon as={Hash} size={14} className="text-muted-foreground" />
                                            <Text className="text-sm font-bold text-foreground">Initial Age (Days)</Text>
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

                                <View className="gap-2 z-50">
                                    <View className="flex-row items-center gap-2 ml-1">
                                        <Icon as={Bird} size={14} className="text-amber-500" />
                                        <Text className="text-sm font-bold text-foreground">Bird Type</Text>
                                    </View>

                                    <View className="relative">
                                        <Pressable
                                            onPress={() => setIsBirdTypeOpen(!isBirdTypeOpen)}
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
                                            <Toaster position="bottom-center" offset={40} />
                                        </Modal>
                                    </View>
                                </View>



                                <View className="flex-row gap-4 pt-4 pb-4">
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
