/// <reference types="nativewind/types" />
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react-native";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Modal, Pressable, TextInput, View } from "react-native";
import { toast, Toaster } from "sonner-native";
import { z } from "zod";

const createFarmerSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    // Use string for input to handle text edits naturally, convert on submit
    initialStock: z.string().regex(/^\d*\.?\d*$/, { message: "Must be a valid number" }),
    location: z.string().max(200).optional().or(z.literal("")),
    mobile: z.string().regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Invalid mobile number").optional().or(z.literal(""))
});

type CreateFarmerFormValues = z.infer<typeof createFarmerSchema>;

interface RegisterFarmerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function RegisterFarmerModal({ open, onOpenChange, onSuccess }: RegisterFarmerModalProps) {
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const utils = trpc.useUtils();

    const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateFarmerFormValues>({
        resolver: zodResolver(createFarmerSchema),
        defaultValues: {
            name: "",
            initialStock: "0",
            location: "",
            mobile: ""
        },
    });

    const nameRef = useRef<TextInput>(null);
    const mobileRef = useRef<TextInput>(null);
    const locationRef = useRef<TextInput>(null);
    const stockRef = useRef<TextInput>(null);

    const createMutation = trpc.officer.farmers.create.useMutation({
        onSuccess: () => {
            toast.success("Farmer registered successfully");
            utils.officer.farmers.listWithStock.invalidate();
            onOpenChange(false);
            reset();
            onSuccess?.();
        },
        onError: (error: any) => toast.error(error.message || "Failed to create farmer"),
    });

    const onSubmit = (values: CreateFarmerFormValues) => {
        if (!membership?.orgId) {
            toast.error("Organization ID is missing");
            return;
        }

        // Handle empty strings as null for optional fields
        const location = values.location?.trim() || null;
        const mobile = values.mobile?.trim() || null;

        // Parse stock
        const stock = parseFloat(values.initialStock) || 0;

        createMutation.mutate({
            name: values.name,
            initialStock: stock,
            orgId: membership.orgId,
            location,
            mobile,
        });
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={() => onOpenChange(false)}
        >

            <View className="flex-1 bg-black/60 items-center justify-center p-4">
                <View className="bg-background w-full max-w-md rounded-3xl overflow-hidden border border-border/50 shadow-2xl">
                    {/* Header */}
                    <View className="p-6 border-b border-border/50 flex-row justify-between items-center bg-muted/20">
                        <View>
                            <Text className="text-xl font-bold text-foreground font-black uppercase">Register Farmer</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">Create a new farmer profile</Text>
                        </View>
                        <Pressable
                            onPress={() => onOpenChange(false)}
                            className="h-8 w-8 items-center justify-center rounded-full bg-muted/50 active:bg-muted"
                        >
                            <Icon as={X} size={18} className="text-muted-foreground" />
                        </Pressable>
                    </View>

                    {/* Form */}
                    <View className="p-6 space-y-4">
                        <View>
                            <Text className="text-sm font-bold text-foreground mb-1.5 ml-1">Full Name</Text>
                            <Controller
                                control={control}
                                name="name"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        ref={nameRef}
                                        placeholder="e.g. John Doe"
                                        value={value}
                                        onChangeText={onChange}
                                        className={`bg-muted/30 h-12 px-4 rounded-xl ${errors.name ? 'border-destructive' : 'border-border/50'}`}
                                        returnKeyType="next"
                                        onSubmitEditing={() => mobileRef.current?.focus()}
                                    />
                                )}
                            />
                            {errors.name && <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.name.message}</Text>}
                        </View>

                        <View>
                            <Text className="text-sm font-bold text-foreground mb-1.5 ml-1">Mobile Number</Text>
                            <Controller
                                control={control}
                                name="mobile"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        ref={mobileRef}
                                        placeholder="e.g. 01712345678"
                                        value={value || ""}
                                        onChangeText={onChange}
                                        keyboardType="phone-pad"
                                        className={`bg-muted/30 h-12 px-4 rounded-xl ${errors.mobile ? 'border-destructive' : 'border-border/50'}`}
                                        returnKeyType="next"
                                        onSubmitEditing={() => locationRef.current?.focus()}
                                    />
                                )}
                            />
                            {errors.mobile && <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.mobile.message}</Text>}
                        </View>

                        <View>
                            <Text className="text-sm font-bold text-foreground mb-1.5 ml-1">Location / Address</Text>
                            <Controller
                                control={control}
                                name="location"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        ref={locationRef}
                                        placeholder="e.g. Village, Union"
                                        value={value || ""}
                                        onChangeText={onChange}
                                        className="bg-muted/30 h-12 px-4 rounded-xl border border-border/50"
                                        returnKeyType="next"
                                        onSubmitEditing={() => stockRef.current?.focus()}
                                    />
                                )}
                            />
                        </View>

                        <View>
                            <Text className="text-sm font-bold text-foreground mb-1.5 ml-1">Initial Stock (Bags)</Text>
                            <Controller
                                control={control}
                                name="initialStock"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        ref={stockRef}
                                        placeholder="0"
                                        value={value}
                                        onChangeText={onChange}
                                        keyboardType="decimal-pad"
                                        className={`bg-muted/30 h-12 px-4 rounded-xl ${errors.initialStock ? 'border-destructive' : 'border-border/50'}`}
                                        returnKeyType="next"
                                        onSubmitEditing={handleSubmit(onSubmit)}
                                    />
                                )}
                            />
                            {errors.initialStock && <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.initialStock.message}</Text>}
                            <Text className="text-[10px] text-muted-foreground mt-1.5 ml-1 italic">Assign initial bags to the warehouse.</Text>
                        </View>

                        <Button
                            onPress={handleSubmit(onSubmit)}
                            disabled={createMutation.isPending}
                            className="h-14 rounded-2xl bg-primary mt-4 active:opacity-90"
                        >
                            {createMutation.isPending ? (
                                <ActivityIndicator color={"#ffffff"} />
                            ) : (
                                <Text className="text-white font-black text-base uppercase tracking-widest">Register Farmer</Text>
                            )}
                        </Button>
                    </View>
                </View>
            </View>
            <Toaster position="bottom-center" offset={40} />
        </Modal>
    );
}
