import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { MapPin, Phone, User, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";

interface EditFarmerModalProps {
    farmer: {
        id: string;
        name: string;
        location?: string | null;
        mobile?: string | null;
        organizationId: string;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function EditFarmerModal({
    farmer,
    open,
    onOpenChange,
    onSuccess,
}: EditFarmerModalProps) {
    const [name, setName] = useState(farmer.name);
    const [location, setLocation] = useState(farmer.location || "");
    const [mobile, setMobile] = useState(farmer.mobile || "");
    const [error, setError] = useState<string | null>(null);

    const nameRef = useRef<TextInput>(null);
    const locationRef = useRef<TextInput>(null);
    const mobileRef = useRef<TextInput>(null);

    useEffect(() => {
        if (open) {
            setName(farmer.name);
            setLocation(farmer.location || "");
            setMobile(farmer.mobile || "");
            setError(null);
        }
    }, [open, farmer]);

    const mutation = trpc.officer.farmers.updateProfile.useMutation({
        onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleSubmit = () => {
        if (name.length < 2) {
            setError("Name must be at least 2 characters");
            return;
        }
        setError(null);
        mutation.mutate({
            id: farmer.id,
            name: name.toUpperCase(),
            orgId: farmer.organizationId,
            location: location || null,
            mobile: mobile || null,
        });
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={open}
            onRequestClose={() => onOpenChange(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <Pressable
                    className="flex-1 bg-black/60 items-center justify-center p-4"
                    onPress={() => onOpenChange(false)}
                >
                    <Pressable
                        className="w-full max-w-sm bg-card rounded-3xl overflow-hidden"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View className="p-6 pb-2 flex-row justify-between items-center border-b border-border/50">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                                    <Icon as={User} size={20} className="text-primary" />
                                </View>
                                <View>
                                    <Text className="text-xl font-bold text-foreground">Edit Profile</Text>
                                    <Text className="text-xs text-muted-foreground mt-0.5">
                                        Update farmer information
                                    </Text>
                                </View>
                            </View>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onPress={() => onOpenChange(false)}>
                                <Icon as={X} size={18} className="text-muted-foreground" />
                            </Button>
                        </View>

                        {/* Form */}
                        <ScrollView className="p-6 space-y-4" bounces={false}>
                            <View className="gap-2">
                                <Text className="text-sm font-bold text-foreground ml-1">Full Name</Text>
                                <Input
                                    ref={nameRef}
                                    placeholder="Farmer Name"
                                    value={name}
                                    onChangeText={setName}
                                    className="h-12 bg-muted/30 border-border/50"
                                    returnKeyType="next"
                                    onSubmitEditing={() => locationRef.current?.focus()}
                                />
                            </View>

                            <View className="gap-2">
                                <View className="flex-row items-center gap-1 ml-1">
                                    <Icon as={MapPin} size={14} className="text-muted-foreground" />
                                    <Text className="text-sm font-bold text-foreground">Location</Text>
                                </View>
                                <Input
                                    ref={locationRef}
                                    placeholder="Village, Upazila"
                                    value={location}
                                    onChangeText={setLocation}
                                    className="h-12 bg-muted/30 border-border/50"
                                    returnKeyType="next"
                                    onSubmitEditing={() => mobileRef.current?.focus()}
                                />
                            </View>

                            <View className="gap-2">
                                <View className="flex-row items-center gap-1 ml-1">
                                    <Icon as={Phone} size={14} className="text-muted-foreground" />
                                    <Text className="text-sm font-bold text-foreground">Mobile Number</Text>
                                </View>
                                <Input
                                    ref={mobileRef}
                                    placeholder="017XXXXXXXX"
                                    keyboardType="phone-pad"
                                    value={mobile}
                                    onChangeText={setMobile}
                                    className="h-12 bg-muted/30 border-border/50"
                                    returnKeyType="next"
                                    onSubmitEditing={handleSubmit}
                                />
                                <Text className="text-[10px] text-muted-foreground ml-1">
                                    Format: 013XXXXXXXX to 019XXXXXXXX
                                </Text>
                            </View>

                            {error && (
                                <View className="bg-destructive/10 p-3 rounded-lg border border-destructive/20 mt-2">
                                    <Text className="text-destructive text-xs text-center font-medium">{error}</Text>
                                </View>
                            )}

                            <View className="flex-row gap-3 pt-6">
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
                                    disabled={mutation.isPending}
                                >
                                    <Text className="text-primary-foreground font-bold">
                                        {mutation.isPending ? "Saving..." : "Save Changes"}
                                    </Text>
                                </Button>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}
