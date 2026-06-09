/// <reference types="nativewind/types" />
import { BottomSheetModal } from "@/components/ui/bottom-sheet-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from "react-native";
import { toast } from "sonner-native";
import { z } from "zod";

const schema = z.object({
    effectiveFrom: z.date(),
    feedPricePerBag: z.number({ error: "Required" }).positive("Must be positive"),
    docPricePerBird: z.number({ error: "Required" }).positive("Must be positive"),
    baseSellPrice: z.number({ error: "Required" }).positive("Must be positive"),
});

type FormValues = z.infer<typeof schema>;

interface PricePolicyBottomSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: "add" | "edit";
    policy?: {
        id: string;
        effectiveFrom: string;
        feedPricePerBag: string;
        docPricePerBird: string;
        baseSellPrice: string;
    };
}

export function PricePolicyBottomSheet({ open, onOpenChange, mode, policy }: PricePolicyBottomSheetProps) {
    const utils = trpc.useUtils();
    const { data: membership } = trpc.auth.getMyMembership.useQuery();
    const orgId = membership?.orgId ?? "";
    const [showDatePicker, setShowDatePicker] = useState(false);

    const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: mode === "edit" && policy
            ? {
                effectiveFrom: new Date(policy.effectiveFrom),
                feedPricePerBag: Number(policy.feedPricePerBag),
                docPricePerBird: Number(policy.docPricePerBird),
                baseSellPrice: Number(policy.baseSellPrice),
            }
            : {
                effectiveFrom: new Date(),
                feedPricePerBag: undefined,
                docPricePerBird: undefined,
                baseSellPrice: undefined,
            },
    });

    const invalidateList = () => utils.management.pricePolicies.list.invalidate();

    const createMutation = trpc.management.pricePolicies.create.useMutation({
        onSuccess: () => {
            toast.success("Price policy created");
            invalidateList();
            onOpenChange(false);
            reset();
        },
        onError: (e) => toast.error(e.message),
    });

    const updateMutation = trpc.management.pricePolicies.update.useMutation({
        onSuccess: () => {
            toast.success("Price policy updated");
            invalidateList();
            onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const onSubmit = (values: FormValues) => {
        if (mode === "edit" && policy) {
            updateMutation.mutate({
                orgId,
                id: policy.id,
                effectiveFrom: values.effectiveFrom.toISOString(),
                feedPricePerBag: values.feedPricePerBag,
                docPricePerBird: values.docPricePerBird,
                baseSellPrice: values.baseSellPrice,
            });
        } else {
            createMutation.mutate({
                orgId,
                effectiveFrom: values.effectiveFrom.toISOString(),
                feedPricePerBag: values.feedPricePerBag,
                docPricePerBird: values.docPricePerBird,
                baseSellPrice: values.baseSellPrice,
            });
        }
    };

    const title = mode === "edit" ? "Edit Price Policy" : "Add Price Policy";
    const subtitle = mode === "edit" ? "Update pricing for this period" : "Set prices effective from a date";

    return (
        <BottomSheetModal open={open} onOpenChange={onOpenChange}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pb-10">
                {/* Header */}
                <View className="p-6 border-b border-border/50 flex-row justify-between items-center bg-muted/20">
                    <View>
                        <Text className="text-xl font-black uppercase text-foreground">{title}</Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
                    </View>
                    <Pressable
                        onPress={() => onOpenChange(false)}
                        className="h-8 w-8 items-center justify-center rounded-full bg-muted/50 active:bg-muted"
                    >
                        <Icon as={X} size={18} className="text-muted-foreground" />
                    </Pressable>
                </View>

                {/* Form */}
                <View className="p-6 space-y-5">
                    {/* Effective From */}
                    <View>
                        <Text className="text-sm font-bold text-foreground mb-1.5 ml-1">Effective From</Text>
                        <Controller
                            control={control}
                            name="effectiveFrom"
                            render={({ field: { onChange, value } }) => (
                                <>
                                    <Pressable
                                        onPress={() => setShowDatePicker(true)}
                                        className={`bg-muted/30 h-12 px-4 rounded-xl border justify-center ${errors.effectiveFrom ? 'border-destructive' : 'border-border/50'}`}
                                    >
                                        <Text className="text-foreground">
                                            {value ? format(value, "MMM d, yyyy") : "Select date"}
                                        </Text>
                                    </Pressable>
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={value ?? new Date()}
                                            mode="date"
                                            display={Platform.OS === "ios" ? "inline" : "default"}
                                            onChange={(_, selectedDate) => {
                                                setShowDatePicker(Platform.OS === "ios");
                                                if (selectedDate) onChange(selectedDate);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        />
                        {errors.effectiveFrom && (
                            <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.effectiveFrom.message}</Text>
                        )}
                    </View>

                    {/* Prices — 3 col grid */}
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Text className="text-xs font-bold text-foreground mb-1.5 ml-1">Feed/bag ৳</Text>
                            <Controller
                                control={control}
                                name="feedPricePerBag"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        placeholder="3325"
                                        value={value?.toString() ?? ""}
                                        onChangeText={(t) => onChange(t ? parseFloat(t) : undefined)}
                                        keyboardType="numeric"
                                        className={`bg-muted/30 h-12 px-3 rounded-xl ${errors.feedPricePerBag ? 'border-destructive' : 'border-border/50'}`}
                                    />
                                )}
                            />
                            {errors.feedPricePerBag && (
                                <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.feedPricePerBag.message}</Text>
                            )}
                        </View>

                        <View className="flex-1">
                            <Text className="text-xs font-bold text-foreground mb-1.5 ml-1">DOC/bird ৳</Text>
                            <Controller
                                control={control}
                                name="docPricePerBird"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        placeholder="41.5"
                                        value={value?.toString() ?? ""}
                                        onChangeText={(t) => onChange(t ? parseFloat(t) : undefined)}
                                        keyboardType="numeric"
                                        className={`bg-muted/30 h-12 px-3 rounded-xl ${errors.docPricePerBird ? 'border-destructive' : 'border-border/50'}`}
                                    />
                                )}
                            />
                            {errors.docPricePerBird && (
                                <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.docPricePerBird.message}</Text>
                            )}
                        </View>

                        <View className="flex-1">
                            <Text className="text-xs font-bold text-foreground mb-1.5 ml-1">Base sell ৳</Text>
                            <Controller
                                control={control}
                                name="baseSellPrice"
                                render={({ field: { onChange, value } }) => (
                                    <Input
                                        placeholder="145"
                                        value={value?.toString() ?? ""}
                                        onChangeText={(t) => onChange(t ? parseFloat(t) : undefined)}
                                        keyboardType="numeric"
                                        className={`bg-muted/30 h-12 px-3 rounded-xl ${errors.baseSellPrice ? 'border-destructive' : 'border-border/50'}`}
                                    />
                                )}
                            />
                            {errors.baseSellPrice && (
                                <Text className="text-[10px] text-destructive mt-1 ml-1">{errors.baseSellPrice.message}</Text>
                            )}
                        </View>
                    </View>

                    {/* Submit */}
                    <Button
                        onPress={handleSubmit(onSubmit)}
                        disabled={isPending}
                        className="h-14 rounded-xl mt-2"
                    >
                        {isPending
                            ? <ActivityIndicator color="#fff" />
                            : <Text className="text-primary-foreground font-bold text-base">
                                {mode === "edit" ? "Update Policy" : "Save Policy"}
                            </Text>
                        }
                    </Button>
                </View>
            </ScrollView>
        </BottomSheetModal>
    );
}
