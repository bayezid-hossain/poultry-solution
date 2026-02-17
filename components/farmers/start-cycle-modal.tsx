import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { Activity, BadgeCheck, Bird, Hash, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";

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
    const [name, setName] = useState("");
    const [doc, setDoc] = useState("");
    const [age, setAge] = useState("0");
    const [birdType, setBirdType] = useState("Broiler");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            setName(`BATCH ${dateStr}`);
            setDoc("");
            setAge("0");
            setBirdType("Broiler");
            setError(null);
        }
    }, [open]);

    const mutation = trpc.officer.cycles.create.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        const numDoc = parseInt(doc, 10);
        const numAge = parseInt(age, 10);

        if (name.length < 1) {
            setError("Please enter a cycle name");
            return;
        }
        if (isNaN(numDoc) || numDoc <= 0) {
            setError("Please enter a valid bird count (DOC)");
            return;
        }
        if (isNaN(numAge) || numAge < 0 || numAge > 40) {
            setError("Age must be between 0 and 40 days");
            return;
        }

        setError(null);
        mutation.mutate({
            name: name.toUpperCase(),
            farmerId: farmer.id,
            orgId: farmer.organizationId,
            doc: numDoc,
            age: numAge,
            birdType: birdType,
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
                behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                                    <Text className="text-sm text-muted-foreground">
                                        Launch production for {farmer.name}
                                    </Text>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={20} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <ScrollView className="p-8 pt-2" bounces={false}>
                            <View className="space-y-6">
                                <View className="gap-2">
                                    <Text className="text-sm font-bold text-foreground ml-1">Cycle Name / Batch ID</Text>
                                    <Input
                                        placeholder="e.g. BATCH 12 FEB"
                                        value={name}
                                        onChangeText={setName}
                                        className="h-14 bg-muted/30 border-border/50 text-lg"
                                    />
                                </View>

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

                                <View className="gap-2">
                                    <View className="flex-row items-center gap-2 ml-1">
                                        <Icon as={BadgeCheck} size={14} className="text-amber-500" />
                                        <Text className="text-sm font-bold text-foreground">Bird Type</Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2">
                                        {["Broiler", "Sonali", "Layer", "Kashmiri"].map((type) => (
                                            <Pressable
                                                key={type}
                                                onPress={() => setBirdType(type)}
                                                className={`px-4 py-2 rounded-full border ${birdType === type
                                                    ? "bg-amber-500/10 border-amber-500"
                                                    : "bg-muted/30 border-border/50"
                                                    }`}
                                            >
                                                <Text className={`text-xs font-bold ${birdType === type ? "text-amber-600" : "text-muted-foreground"
                                                    }`}>
                                                    {type}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {error && (
                                    <View className="bg-destructive/10 p-4 rounded-2xl border border-destructive/20 mt-2">
                                        <Text className="text-destructive text-sm text-center font-bold">{error}</Text>
                                    </View>
                                )}

                                <View className="flex-row gap-4 pt-8 pb-10">
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
