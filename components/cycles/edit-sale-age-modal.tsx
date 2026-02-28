import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Pencil, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";

interface EditSaleAgeModalProps {
    currentAge: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (newAge: number) => void;
}

export function EditSaleAgeModal({
    currentAge,
    open,
    onOpenChange,
    onSave,
}: EditSaleAgeModalProps) {
    const [age, setAge] = useState("");
    const [error, setError] = useState<string | null>(null);

    const ageRef = useRef<TextInput>(null);

    useEffect(() => {
        if (open) {
            setAge(currentAge.toString());
            setError(null);
        }
    }, [open, currentAge]);

    const handleSubmit = () => {
        const numAge = parseInt(age, 10);
        if (isNaN(numAge) || numAge <= 0) {
            setError("Please enter a valid age (>0)");
            return;
        }
        onSave(numAge);
        onOpenChange(false);
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <Pressable
                className="flex-1 bg-black/60 items-center justify-center p-4"
                onPress={() => onOpenChange(false)}
            >
                <Pressable
                    className="w-full max-w-sm bg-card rounded-3xl overflow-hidden"
                    onPress={(e) => e.stopPropagation()}
                >
                    <View className="p-6 pb-2 flex-row justify-between items-center">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                <Icon as={Pencil} size={20} className="text-primary" />
                            </View>
                            <View>
                                <Text className="text-xl font-bold text-foreground">Edit Sale Age</Text>
                                <Text className="text-xs text-muted-foreground mt-0.5">
                                    Update age at time of sale
                                </Text>
                            </View>
                        </View>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Button>
                    </View>

                    <View className="p-6 space-y-4 gap-y-2">
                        <View className="gap-2">
                            <View className="flex-row justify-between items-center ml-1">
                                <Text className="text-sm font-bold text-foreground">New Age (Days)</Text>
                                <Text className="text-[10px] text-muted-foreground">Current: {currentAge}</Text>
                            </View>
                            <Input
                                ref={ageRef}
                                placeholder="0"
                                keyboardType="numeric"
                                value={age}
                                onChangeText={setAge}
                                className="h-12 bg-muted/30 border-border/50 text-lg font-mono"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        </View>

                        {error && (
                            <View className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 mt-2">
                                <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                            </View>
                        )}

                        <View className="flex-row gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl"
                                onPress={() => onOpenChange(false)}
                            >
                                <Text className="font-bold">Cancel</Text>
                            </Button>
                            <Button
                                className="flex-1 h-12 bg-primary rounded-xl shadow-none"
                                onPress={handleSubmit}
                            >
                                <Text className="text-primary-foreground font-bold">
                                    Apply
                                </Text>
                            </Button>
                        </View>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
